import { BusinessRepository } from '@/src/db/repositories/BusinessRepository';
import { FieldIssueRepository } from '@/src/db/repositories/FieldIssueRepository';
import { PathRepository } from '@/src/db/repositories/PathRepository';
import { OutboxRepository } from '@/src/db/repositories/OutboxRepository';
import { getDatabase } from '@/src/db/sqlite';
import { generateDefaultBranchesForType } from '@/src/lib/junctions/branchManager';
import type { Business, BusinessActivity, BusinessOfferingObservation, BusinessStability, BusinessType, CatalogueItemType, JunctionType, PlaceType, RelativeBusinessPosition } from '@/src/types';

export type FieldCaptureContext = {
  missionId: string;
  userId: string;
  marketId?: string;
  areaId?: string;
  pathSessionId?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number | null;
};

export async function saveQuickBusiness(
  context: FieldCaptureContext,
  input: { name?: string; noVisibleName?: boolean; businessType: BusinessType; activity: BusinessActivity; stability?: BusinessStability; relativePosition?: RelativeBusinessPosition; notes?: string; shopNumber?: string; sectionName?: string; lineName?: string; primaryCategoryId?: string; offerings?: { catalogueItemId?: string; pendingSuggestionId?: string; name: string; itemType: CatalogueItemType; howEstablished: BusinessOfferingObservation }[] },
): Promise<Business> {
  const now = new Date().toISOString();
  const id = `biz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const business: Business = {
    id,
    missionId: context.missionId,
    marketId: context.marketId,
    areaId: context.areaId,
    operationalLabel: '',
    businessType: input.businessType,
    activity: input.activity,
    locationRelationship: 'general_inside_market',
    name: input.name?.trim() || undefined,
    hasNoVisibleName: Boolean(input.noVisibleName || !input.name?.trim()),
    latitude: context.latitude,
    longitude: context.longitude,
    locationAccuracy: context.accuracy,
    locationSource: 'current_gps',
    originalLatitude: context.latitude,
    originalLongitude: context.longitude,
    relativePosition: input.relativePosition,
    capturedHeading: context.heading,
    headingSource: context.heading == null ? 'none' : 'compass',
    directionConfidence: context.heading == null ? 'none' : 'medium',
    parentPathSessionId: context.pathSessionId ?? undefined,
    shopNumber: input.shopNumber,
    sectionName: input.sectionName,
    lineName: input.lineName,
    primaryCategoryId: input.primaryCategoryId,
    stability: input.stability ?? 'unknown',
    photoDeclined: false,
    photoState: 'not_captured',
    notes: input.notes,
    completenessScore: 55,
    status: 'pending',
    version: 1,
    createdBy: context.userId,
    updatedBy: context.userId,
    createdAt: now,
    updatedAt: now,
    clientCreatedAt: now,
    isDeleted: false,
    syncStatus: 'local_only',
  };
  return BusinessRepository.create(business, (input.offerings ?? []).map((o) => ({
    catalogueItemId: o.catalogueItemId,
    pendingSuggestionId: o.pendingSuggestionId,
    catalogueItemName: o.name,
    itemType: o.itemType,
    howEstablished: o.howEstablished,
  })));
}

export async function saveQuickJunction(
  context: FieldCaptureContext,
  input: { junctionType: JunctionType; displayName?: string },
) {
  if (!context.pathSessionId) throw new Error('Start a path before adding a junction.');
  const active = await PathRepository.getActiveSession();
  if (!active.session || active.session.sessionId !== context.pathSessionId) throw new Error('Active path session could not be verified.');
  const id = `junc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const label = `Junction J${String(active.junctions.length + 1).padStart(3, '0')}`;
  const junction = {
    id,
    sessionId: context.pathSessionId,
    operationalLabel: label,
    displayName: input.displayName,
    junctionType: input.junctionType,
    marketId: context.marketId,
    missionId: context.missionId,
    createdBy: context.userId,
    verificationState: 'unverified',
    locationSource: 'current_gps',
    latitude: context.latitude,
    longitude: context.longitude,
    sequenceNumber: active.points.reduce((m, p) => Math.max(m, p.sequenceNumber), 0),
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
  };
  await PathRepository.addJunction(junction);
  const branches = generateDefaultBranchesForType(id, input.junctionType);
  const db = getDatabase();
  for (const branch of branches) {
    await db.runAsync(`INSERT OR REPLACE INTO local_junction_branches (id, junction_id, label, relative_side, status, connected_path_id, connected_target_junction_id, notes, mapped_at, mapped_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [branch.id, branch.junctionId, branch.label, branch.relativeSide || null, branch.status, branch.connectedPathId || null, branch.connectedTargetJunctionId || null, branch.notes || null, branch.mappedAt || null, branch.mappedBy || null, new Date().toISOString()]);
  }
  return { id, operationalLabel: label, branches };
}

export async function saveQuickIssue(
  context: FieldCaptureContext,
  input: { issueType: 'hazard_obstacle' | 'access_blocked' | 'unsafe_area' | 'disputed_boundary' | 'wrong_assignment' | 'severe_weather' | 'other'; title: string; description: string },
) {
  return FieldIssueRepository.reportIssue({
    missionId: context.missionId,
    areaId: context.areaId,
    reportedBy: context.userId,
    issueType: input.issueType,
    title: input.title,
    description: input.description,
    latitude: context.latitude,
    longitude: context.longitude,
  });
}


export async function savePlaceDuringPath(context: FieldCaptureContext, input: { placeType: PlaceType; displayName?: string; description?: string }) {
  if (!context.marketId) throw new Error('Market context is required to save a place.');
  const db = getDatabase();
  const id = `place_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const now = new Date().toISOString();
  const labelPrefix: Record<PlaceType,string> = { gate_entrance:'Gate', junction:'Junction', landmark:'Landmark', facility_restroom:'Restroom', facility_water:'Water', facility_waste:'Waste', facility_power:'Power', transport_stop:'Transport', other:'Place' };
  const label = `${labelPrefix[input.placeType]} ${id.slice(-4).toUpperCase()}`;
  const payload = { id, marketId: context.marketId, areaId: context.areaId, operationalLabel: label, displayName: input.displayName, placeType: input.placeType, latitude: context.latitude, longitude: context.longitude, description: input.description, createdAt: now, updatedAt: now, isDeleted: false, syncStatus: 'local_only' };
  await db.runAsync(`INSERT INTO local_market_places (id, market_id, area_id, operational_label, display_name, place_type, latitude, longitude, description, created_at, updated_at, is_deleted, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'local_only');`, [id, context.marketId, context.areaId || null, label, input.displayName || null, input.placeType, context.latitude, context.longitude, input.description || null, now, now]);
  await OutboxRepository.enqueue('local_market_places', id, 'INSERT', payload);
  return payload;
}
