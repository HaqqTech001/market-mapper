/**
 * Business Repository (Local SQLite)
 * Enforces client-generated UUIDs, sequential operational labels (B001, B002),
 * atomic multi-table persistence (business, offerings, media, revisit, outbox),
 * safe offline editing, and lightweight local duplicate awareness.
 */

import { getDatabase } from '../sqlite';
import {
  Business,
  BusinessOffering,
  LocalMediaRecord,
  Revisit,
  OutboxAction,
} from '../../types';
import { calculateHaversineDistanceMeters } from '../../lib/location/gpsQuality';

export class BusinessRepository {
  private static db = getDatabase();

  /**
   * Generates a stable, human-friendly local operational label such as B-M01-001, B-A12-001 or B001...
   * Scoped to the active mapper/device and market, collision-safe offline (4AN, 4AO).
   */
  static async getNextOperationalLabel(marketId?: string, mapperPrefix?: string): Promise<string> {
    const rows = marketId
      ? await this.db.getAllAsync<any>(
          `SELECT operational_label FROM local_businesses WHERE market_id = ?;`,
          [marketId]
        )
      : await this.db.getAllAsync<any>(
          `SELECT operational_label FROM local_businesses;`
        );

    const cleanScope = mapperPrefix && mapperPrefix !== 'B' ? mapperPrefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) : '';
    let maxNum = 0;

    // Matches B-A12-001 or B-M01-001 or B001
    const scopedRegex = cleanScope ? new RegExp(`^B-${cleanScope}-(\\d+)$`, 'i') : /^B-(\w+)-(\d+)$/i;
    const legacyRegex = /^B(\d+)$/i;

    for (const r of rows) {
      const label = r.operational_label || r.operationalLabel;
      if (label) {
        if (cleanScope) {
          const match = String(label).match(scopedRegex);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > maxNum) maxNum = n;
          }
        } else {
          // Check scoped match with any prefix
          const matchScoped = String(label).match(/^B-(\w+)-(\d+)$/i);
          if (matchScoped) {
            const n = parseInt(matchScoped[2], 10);
            if (n > maxNum) maxNum = n;
          } else {
            const matchLegacy = String(label).match(legacyRegex);
            if (matchLegacy) {
              const n = parseInt(matchLegacy[1], 10);
              if (n > maxNum) maxNum = n;
            }
          }
        }
      }
    }

    const nextNum = maxNum + 1;
    if (cleanScope) {
      return `B-${cleanScope}-${nextNum.toString().padStart(3, '0')}`;
    }
    return `B${nextNum.toString().padStart(3, '0')}`;
  }

  /**
   * Saves a new business locally and atomically persists offerings, media metadata,
   * revisit record (if flagged), and outbox queue entries (4AI, 4V, 4AH).
   */
  static async create(
    business: Business,
    offerings: Omit<BusinessOffering, 'id' | 'businessId' | 'createdAt'>[] = [],
    mediaRecord?: LocalMediaRecord,
    revisitRecord?: { reason: string; notes?: string; flaggedBy: string }
  ): Promise<Business> {
    const db = this.db;
    const now = new Date().toISOString();

    // 1. Assign stable operational label if not present
    if (!business.operationalLabel) {
      business.operationalLabel = await this.getNextOperationalLabel(business.marketId);
    }

    // 2. Insert into local_businesses
    await db.runAsync(
      `INSERT INTO local_businesses (
        id, mission_id, market_id, area_id, operational_label, business_type, physical_structure, activity,
        location_relationship, name, has_no_visible_name, stall_number, line_name,
        row_block_floor, row_line, block, floor, primary_category_id,
        latitude, longitude, location_accuracy, location_source,
        original_latitude, original_longitude, relative_position, captured_heading, parent_path_session_id,
        proposed_latitude, proposed_longitude, stability, local_photo_uri,
        remote_photo_path, photo_declined, photo_state, phone, owner_name, notes,
        completeness_score, status, revisit_needed, revisit_reason, revisit_notes,
        trader_interaction_status, version, created_by, updated_by,
        created_at, updated_at, client_created_at, is_deleted, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        business.id,
        business.missionId,
        business.marketId || null,
        business.areaId || null,
        business.operationalLabel,
        business.businessType,
        business.physicalStructure || null,
        business.activity,
        business.locationRelationship || 'general_inside_market',
        business.name || null,
        business.hasNoVisibleName ? 1 : 0,
        business.stallNumber || null,
        business.lineName || null,
        business.rowBlockFloor || null,
        business.rowLine || null,
        business.block || null,
        business.floor || null,
        business.primaryCategoryId || null,
        business.latitude,
        business.longitude,
        business.locationAccuracy ?? null,
        business.locationSource || 'current_gps',
        business.originalLatitude ?? business.latitude,
        business.originalLongitude ?? business.longitude,
        business.relativePosition || null,
        business.capturedHeading ?? null,
        business.parentPathSessionId || null,
        business.proposedLatitude ?? null,
        business.proposedLongitude ?? null,
        business.stability || 'unknown',
        business.localPhotoUri || null,
        business.remotePhotoPath || null,
        business.photoDeclined ? 1 : 0,
        business.photoState || (business.localPhotoUri ? 'captured' : business.photoDeclined ? 'declined' : 'not_captured'),
        business.phone || null,
        business.ownerName || null,
        business.notes || null,
        business.completenessScore ?? 100,
        business.revisitNeeded ? 'needs_revisit' : (business.status || 'pending'),
        business.revisitNeeded ? 1 : 0,
        business.revisitReason || null,
        business.revisitNotes || null,
        business.traderInteractionStatus || null,
        business.version || 1,
        business.createdBy,
        business.updatedBy,
        business.createdAt || now,
        business.updatedAt || now,
        business.clientCreatedAt || now,
        business.isDeleted ? 1 : 0,
        'local_only',
      ]
    );

    // 3. Insert Offerings (supports canonical item OR pending local suggestion)
    const savedOfferings: BusinessOffering[] = [];
    for (const offering of offerings) {
      const offeringId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await db.runAsync(
        `INSERT INTO local_business_offerings (
          id, business_id, catalogue_item_id, pending_suggestion_id,
          item_type, item_name, how_established, created_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
        [
          offeringId,
          business.id,
          offering.catalogueItemId || '',
          offering.pendingSuggestionId || null,
          offering.itemType || 'product',
          offering.catalogueItemName || null,
          offering.howEstablished || 'observed',
          now,
        ]
      );
      savedOfferings.push({
        id: offeringId,
        businessId: business.id,
        catalogueItemId: offering.catalogueItemId,
        pendingSuggestionId: offering.pendingSuggestionId,
        catalogueItemName: offering.catalogueItemName,
        itemType: offering.itemType,
        howEstablished: offering.howEstablished || 'observed',
        createdAt: now,
      });
    }

    // 4. Insert Local Media Record if present (4V)
    if (mediaRecord) {
      await db.runAsync(
        `INSERT INTO local_media (
          id, owner_user_id, entity_type, entity_id, media_type, local_uri,
          thumbnail_uri, mime_type, width, height, file_size, capture_source,
          upload_status, remote_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          mediaRecord.id,
          mediaRecord.ownerUserId || business.createdBy,
          mediaRecord.entityType || 'business',
          business.id,
          mediaRecord.mediaType || 'photo',
          mediaRecord.localUri,
          mediaRecord.thumbnailUri || null,
          mediaRecord.mimeType || 'image/jpeg',
          mediaRecord.width || null,
          mediaRecord.height || null,
          mediaRecord.fileSize || null,
          mediaRecord.captureSource || 'camera',
          mediaRecord.uploadStatus || 'local_only',
          mediaRecord.remotePath || null,
          mediaRecord.createdAt || now,
          mediaRecord.updatedAt || now,
        ]
      );

      // Enqueue to media upload queue (4W)
      const queueId = `mq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.runAsync(
        `INSERT INTO local_media_upload_queue (
          id, local_uri, bucket, remote_path, entity_type, entity_id, media_type,
          status, retry_count, created_at, updated_at
        ) VALUES (?, ?, 'business_photos', ?, 'business', ?, 'photo', 'pending', 0, ?, ?);`,
        [
          queueId,
          mediaRecord.localUri,
          `businesses/${business.id}/${mediaRecord.id}.jpg`,
          business.id,
          now,
          now,
        ]
      );
    }

    // 5. Insert Revisit Record if flagged (4R, 4AH)
    if (business.revisitNeeded && revisitRecord) {
      const revisitId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.runAsync(
        `INSERT INTO local_business_revisits (
          id, business_id, mission_id, reason, notes, status, flagged_by, created_at
        ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?);`,
        [
          revisitId,
          business.id,
          business.missionId,
          revisitRecord.reason || business.revisitReason || 'details_missing',
          revisitRecord.notes || business.revisitNotes || null,
          revisitRecord.flaggedBy || business.createdBy,
          now,
        ]
      );

      // Also ensure in general revisits table
      await db.runAsync(
        `INSERT INTO local_revisits (
          id, mission_id, entity_type, entity_id, entity_title, reason, notes,
          status, flagged_by, created_at, updated_at, sync_status
        ) VALUES (?, ?, 'business', ?, ?, ?, ?, 'open', ?, ?, ?, 'local_only');`,
        [
          revisitId,
          business.missionId,
          business.id,
          business.name || business.operationalLabel,
          revisitRecord.reason || business.revisitReason || 'details_missing',
          revisitRecord.notes || business.revisitNotes || null,
          revisitRecord.flaggedBy || business.createdBy,
          now,
          now,
        ]
      );
    }

    // 6. Atomically enqueue into local_outbox_queue (4AI)
    const outboxId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await db.runAsync(
      `INSERT INTO local_outbox_queue (
        id, table_name, record_id, action, payload, client_timestamp, status, retry_count
      ) VALUES (?, 'businesses', ?, 'INSERT', ?, ?, 'pending', 0);`,
      [outboxId, business.id, JSON.stringify({ ...business, offerings: savedOfferings }), Date.now()]
    );

    business.offerings = savedOfferings;
    if (mediaRecord) business.media = [mediaRecord];
    return business;
  }

  /**
   * Updates an existing local business record safely (4AG)
   */
  static async update(
    business: Business,
    offerings?: Omit<BusinessOffering, 'id' | 'businessId' | 'createdAt'>[],
    mediaRecord?: LocalMediaRecord,
    revisitRecord?: { reason: string; notes?: string; flaggedBy: string }
  ): Promise<Business> {
    const db = this.db;
    const now = new Date().toISOString();
    const newVersion = (business.version || 1) + 1;

    await db.runAsync(
      `UPDATE local_businesses SET
        market_id = ?, area_id = ?, operational_label = ?, business_type = ?, physical_structure = ?,
        activity = ?, location_relationship = ?, name = ?, has_no_visible_name = ?,
        stall_number = ?, line_name = ?, row_block_floor = ?, row_line = ?,
        block = ?, floor = ?, primary_category_id = ?, latitude = ?, longitude = ?,
        location_accuracy = ?, location_source = ?, original_latitude = ?, original_longitude = ?,
        stability = ?, local_photo_uri = ?, photo_declined = ?, photo_state = ?, phone = ?,
        owner_name = ?, notes = ?, completeness_score = ?, status = ?,
        revisit_needed = ?, revisit_reason = ?, revisit_notes = ?,
        trader_interaction_status = ?, version = ?, updated_by = ?, updated_at = ?
      WHERE id = ?;`,
      [
        business.marketId || null,
        business.areaId || null,
        business.operationalLabel,
        business.businessType,
        business.physicalStructure || null,
        business.activity,
        business.locationRelationship || 'general_inside_market',
        business.name || null,
        business.hasNoVisibleName ? 1 : 0,
        business.stallNumber || null,
        business.lineName || null,
        business.rowBlockFloor || null,
        business.rowLine || null,
        business.block || null,
        business.floor || null,
        business.primaryCategoryId || null,
        business.latitude,
        business.longitude,
        business.locationAccuracy ?? null,
        business.locationSource || 'manual_adjustment',
        business.originalLatitude ?? business.latitude,
        business.originalLongitude ?? business.longitude,
        business.stability || 'unknown',
        business.localPhotoUri || null,
        business.photoDeclined ? 1 : 0,
        business.photoState || (business.localPhotoUri ? 'captured' : business.photoDeclined ? 'declined' : 'not_captured'),
        business.phone || null,
        business.ownerName || null,
        business.notes || null,
        business.completenessScore ?? 100,
        business.revisitNeeded ? 'needs_revisit' : (business.status || 'pending'),
        business.revisitNeeded ? 1 : 0,
        business.revisitReason || null,
        business.revisitNotes || null,
        business.traderInteractionStatus || null,
        newVersion,
        business.updatedBy || 'mapper',
        now,
        business.id,
      ]
    );

    // If offerings were provided, update them
    if (offerings && Array.isArray(offerings)) {
      await db.runAsync(`DELETE FROM local_business_offerings WHERE business_id = ?;`, [business.id]);
      for (const off of offerings) {
        const offId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          `INSERT INTO local_business_offerings (
            id, business_id, catalogue_item_id, pending_suggestion_id,
            item_type, item_name, how_established, created_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
          [
            offId,
            business.id,
            off.catalogueItemId || '',
            off.pendingSuggestionId || null,
            off.itemType || 'product',
            off.catalogueItemName || null,
            off.howEstablished || 'observed',
            now,
          ]
        );
      }
    }

    // If new media record provided
    if (mediaRecord) {
      await db.runAsync(
        `INSERT INTO local_media (
          id, owner_user_id, entity_type, entity_id, media_type, local_uri,
          thumbnail_uri, mime_type, width, height, file_size, capture_source,
          upload_status, remote_path, created_at, updated_at
        ) VALUES (?, ?, 'business', ?, 'photo', ?, ?, ?, ?, ?, ?, ?, 'local_only', NULL, ?, ?);`,
        [
          mediaRecord.id,
          mediaRecord.ownerUserId || business.updatedBy,
          business.id,
          mediaRecord.localUri,
          mediaRecord.thumbnailUri || null,
          mediaRecord.mimeType || 'image/jpeg',
          mediaRecord.width || null,
          mediaRecord.height || null,
          mediaRecord.fileSize || null,
          mediaRecord.captureSource || 'camera',
          now,
          now,
        ]
      );
    }

    // Enqueue outbox update
    const outboxId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await db.runAsync(
      `INSERT INTO local_outbox_queue (
        id, table_name, record_id, action, payload, client_timestamp, status, retry_count
      ) VALUES (?, 'businesses', ?, 'UPDATE', ?, ?, 'pending', 0);`,
      [outboxId, business.id, JSON.stringify({ ...business, version: newVersion }), Date.now()]
    );

    business.version = newVersion;
    business.updatedAt = now;
    return business;
  }

  /**
   * Retrieves full business record by ID with joined offerings and media (4AF)
   */
  static async getById(id: string): Promise<Business | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM local_businesses WHERE id = ? AND is_deleted = 0;`,
      [id]
    );
    if (!row) return null;

    const business = this.mapRowToBusiness(row);

    // Join offerings
    const offRows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_business_offerings WHERE business_id = ?;`,
      [id]
    );
    business.offerings = offRows.map((o) => ({
      id: o.id,
      businessId: o.business_id,
      catalogueItemId: o.catalogue_item_id,
      pendingSuggestionId: o.pending_suggestion_id,
      catalogueItemName: o.item_name,
      itemType: o.item_type || 'product',
      howEstablished: o.how_established || 'observed',
      createdAt: o.created_at,
    }));

    // Join media
    const mediaRows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_media WHERE entity_id = ? AND entity_type = 'business' ORDER BY created_at DESC;`,
      [id]
    );
    business.media = mediaRows.map((m) => ({
      id: m.id,
      ownerUserId: m.owner_user_id,
      entityType: m.entity_type,
      entityId: m.entity_id,
      mediaType: m.media_type || 'photo',
      localUri: m.local_uri,
      thumbnailUri: m.thumbnail_uri,
      mimeType: m.mime_type,
      width: m.width ? Number(m.width) : undefined,
      height: m.height ? Number(m.height) : undefined,
      fileSize: m.file_size ? Number(m.file_size) : undefined,
      captureSource: m.capture_source || 'camera',
      uploadStatus: m.upload_status || 'local_only',
      remotePath: m.remote_path,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    return business;
  }

  /**
   * Retrieves all local businesses for an active mission or market
   */
  static async getByMission(missionId: string): Promise<Business[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_businesses WHERE mission_id = ? AND is_deleted = 0 ORDER BY created_at DESC;`,
      [missionId]
    );
    return rows.map(this.mapRowToBusiness);
  }

  /**
   * Retrieves all businesses
   */
  static async getAll(filters?: { missionId?: string; marketId?: string }): Promise<Business[]> {
    let sql = `SELECT * FROM local_businesses WHERE is_deleted = 0`;
    const params: any[] = [];

    if (filters?.missionId) {
      sql += ` AND mission_id = ?`;
      params.push(filters.missionId);
    }
    if (filters?.marketId) {
      sql += ` AND market_id = ?`;
      params.push(filters.marketId);
    }

    sql += ` ORDER BY created_at DESC;`;
    const rows = await this.db.getAllAsync<any>(sql, params);
    return rows.map(this.mapRowToBusiness);
  }

  /**
   * Lightweight local duplicate awareness (4AD)
   * Signals:
   * - Another business within ~5-8 meters
   * - Same stall/shop number in same mission/area
   * - Exact same displayed name nearby
   */
  static async findNearbyDuplicates(
    latitude: number,
    longitude: number,
    radiusMeters = 8.0,
    stallNumber?: string,
    name?: string,
    excludeId?: string
  ): Promise<Array<{ business: Business; reason: string; distanceMeters: number }>> {
    const all = await this.getAll();
    const matches: Array<{ business: Business; reason: string; distanceMeters: number }> = [];

    const normStall = stallNumber?.trim().toLowerCase();
    const normName = name?.trim().toLowerCase();

    for (const b of all) {
      if (excludeId && b.id === excludeId) continue;

      const dist = calculateHaversineDistanceMeters(latitude, longitude, b.latitude, b.longitude);

      // Check stall match in vicinity (< 30m or radius)
      if (normStall && b.stallNumber && b.stallNumber.trim().toLowerCase() === normStall && dist <= Math.max(radiusMeters, 30)) {
        matches.push({
          business: b,
          reason: `Same stall/shop number "${b.stallNumber}" nearby (${Math.round(dist)}m)`,
          distanceMeters: Math.round(dist * 10) / 10,
        });
        continue;
      }

      // Check immediate spatial proximity (< radiusMeters)
      if (dist <= radiusMeters) {
        matches.push({
          business: b,
          reason: `Located only ${Math.round(dist)}m away (${b.operationalLabel})`,
          distanceMeters: Math.round(dist * 10) / 10,
        });
        continue;
      }

      // Check exact same name within 25 meters
      if (normName && b.name && b.name.trim().toLowerCase() === normName && dist < 25) {
        matches.push({
          business: b,
          reason: `Identical business name "${b.name}" nearby (${Math.round(dist)}m)`,
          distanceMeters: Math.round(dist * 10) / 10,
        });
      }
    }

    return matches;
  }

  /**
   * Returns count of local businesses
   */
  static async count(): Promise<number> {
    const rows = await this.db.getAllAsync<any>(`SELECT id FROM local_businesses WHERE is_deleted = 0;`);
    return rows.length;
  }

  private static mapRowToBusiness(row: any): Business {
    return {
      id: row.id,
      missionId: row.mission_id || row.missionId,
      marketId: row.market_id || row.marketId,
      areaId: row.area_id || row.areaId,
      operationalLabel: row.operational_label || row.operationalLabel || 'B001',
      businessType: row.business_type || row.businessType || 'shop',
      physicalStructure: row.physical_structure || row.physicalStructure,
      activity: row.activity || 'sells_goods',
      locationRelationship: row.location_relationship || row.locationRelationship || 'general_inside_market',
      name: row.name,
      hasNoVisibleName: Boolean(row.has_no_visible_name ?? row.hasNoVisibleName),
      stallNumber: row.stall_number || row.stallNumber,
      lineName: row.line_name || row.lineName,
      rowBlockFloor: row.row_block_floor || row.rowBlockFloor,
      rowLine: row.row_line || row.rowLine,
      block: row.block,
      floor: row.floor,
      primaryCategoryId: row.primary_category_id || row.primaryCategoryId,
      latitude: Number(row.latitude || 0),
      longitude: Number(row.longitude || 0),
      locationAccuracy: row.location_accuracy != null ? Number(row.location_accuracy) : undefined,
      locationSource: row.location_source || row.locationSource || 'current_gps',
      originalLatitude: row.original_latitude != null ? Number(row.original_latitude) : undefined,
      originalLongitude: row.original_longitude != null ? Number(row.original_longitude) : undefined,
      relativePosition: row.relative_position || row.relativePosition || undefined,
      capturedHeading: row.captured_heading != null ? Number(row.captured_heading) : undefined,
      headingSource: row.heading_source || row.headingSource || undefined,
      directionConfidence: row.direction_confidence || row.directionConfidence || undefined,
      parentPathSessionId: row.parent_path_session_id || row.parentPathSessionId || undefined,
      proposedLatitude: row.proposed_latitude != null ? Number(row.proposed_latitude) : undefined,
      proposedLongitude: row.proposed_longitude != null ? Number(row.proposed_longitude) : undefined,
      stability: row.stability || 'unknown',
      localPhotoUri: row.local_photo_uri || row.localPhotoUri,
      remotePhotoPath: row.remote_photo_path || row.remotePhotoPath,
      photoDeclined: Boolean(row.photo_declined ?? row.photoDeclined),
      photoState: row.photo_state || row.photoState || (row.local_photo_uri ? 'captured' : row.photo_declined ? 'declined' : 'not_captured'),
      phone: row.phone,
      ownerName: row.owner_name || row.ownerName,
      notes: row.notes,
      completenessScore: Number(row.completeness_score ?? 100),
      revisitNeeded: Boolean(row.revisit_needed ?? row.revisitNeeded),
      revisitReason: row.revisit_reason || row.revisitReason,
      revisitNotes: row.revisit_notes || row.revisitNotes,
      traderInteractionStatus: row.trader_interaction_status || row.traderInteractionStatus,
      status: row.status || 'pending',
      version: Number(row.version ?? 1),
      createdBy: row.created_by || 'mapper',
      updatedBy: row.updated_by || 'mapper',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      clientCreatedAt: row.client_created_at || new Date().toISOString(),
      isDeleted: Boolean(row.is_deleted),
      syncStatus: row.sync_status || 'local_only',
    };
  }

  /**
   * Retrieves all flagged revisits from local SQLite database (4R, 4AH)
   */
  static async getAllRevisits(): Promise<Revisit[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_revisits WHERE status = 'open' ORDER BY created_at DESC;`
    );
    return rows.map((r) => ({
      id: r.id,
      missionId: r.mission_id || r.missionId,
      entityType: r.entity_type || r.entityType || 'business',
      entityId: r.entity_id || r.entityId,
      entityTitle: r.entity_title || r.entityTitle || 'Flagged Business',
      reason: r.reason || 'details_missing',
      notes: r.notes || undefined,
      status: r.status || 'open',
      flaggedBy: r.flagged_by || r.flaggedBy || 'mapper',
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
      syncStatus: r.sync_status || 'local_only',
    }));
  }

  /**
   * Resolves a revisit entry in local SQLite database
   */
  static async resolveRevisit(revisitId: string, resolvedNotes?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_revisits SET status = 'resolved', notes = COALESCE(?, notes), updated_at = ? WHERE id = ?;`,
      [resolvedNotes || null, now, revisitId]
    );

    // Also update local_business_revisits if present
    await this.db.runAsync(
      `UPDATE local_business_revisits SET status = 'resolved' WHERE id = ?;`,
      [revisitId]
    );
  }
}

