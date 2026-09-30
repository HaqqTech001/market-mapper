/**
 * Catalogue Repository (Local SQLite)
 * Provides rapid search, category suggestions, aliases matching,
 * recent item retrieval, and offline pending suggestions staging.
 */

import { getDatabase } from '../sqlite';
import {
  Category,
  CatalogueItem,
  CatalogueItemType,
  CatalogueSuggestion,
  CatalogueSuggestionStatus,
} from '../../types';

export interface SearchableOfferItem {
  id: string; // Either canonical item id or suggestion id
  name: string;
  itemType: CatalogueItemType;
  primaryCategoryId?: string;
  matchedAlias?: string;
  isPendingSuggestion: boolean;
  status?: CatalogueSuggestionStatus;
}

export class CatalogueRepository {
  private static get db() { return getDatabase(); }

  /**
   * Retrieves all active categories ordered by sortOrder
   */
  static async getCategories(): Promise<Category[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_categories WHERE is_deleted = 0 ORDER BY sort_order ASC, name ASC;`
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      iconName: r.icon_name || 'Tag',
      sortOrder: Number(r.sort_order ?? 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isDeleted: Boolean(r.is_deleted),
    }));
  }

  static async getAllCategories(): Promise<Category[]> {
    return this.getCategories();
  }

  /**
   * Gets category suggestions (shortcut items) for a given primary category
   */
  static async getItemsByCategory(categoryId: string): Promise<SearchableOfferItem[]> {
    // 1. Items with matching primary_category_id
    const primaryItems = await this.db.getAllAsync<any>(
      `SELECT * FROM local_catalogue_items WHERE primary_category_id = ? AND is_archived = 0;`,
      [categoryId]
    );

    // 2. Also check pending suggestions for this category
    const pendingSuggestions = await this.db.getAllAsync<any>(
      `SELECT * FROM local_catalogue_suggestions WHERE suggested_category_id = ? AND status = 'pending';`,
      [categoryId]
    );

    const results: SearchableOfferItem[] = [];

    for (const item of primaryItems) {
      results.push({
        id: item.id,
        name: item.name,
        itemType: item.item_type || 'product',
        primaryCategoryId: item.primary_category_id,
        isPendingSuggestion: false,
      });
    }

    for (const sugg of pendingSuggestions) {
      if (!results.some((r) => r.id === sugg.id)) {
        results.push({
          id: sugg.id,
          name: sugg.name,
          itemType: sugg.item_type || 'product',
          primaryCategoryId: sugg.suggested_category_id,
          isPendingSuggestion: true,
          status: 'pending',
        });
      }
    }

    return results;
  }

  /**
   * Rapid search across canonical names, aliases, and pending suggestions.
   * Matches "Rice", "Phone repair", "POS service", "Fabric", etc.
   */
  static async search(query: string, categoryId?: string): Promise<SearchableOfferItem[]> {
    const trimmed = query.trim().toLowerCase();
    const allItems = await this.db.getAllAsync<any>(
      `SELECT * FROM local_catalogue_items WHERE is_archived = 0;`
    );
    const allAliases = await this.db.getAllAsync<any>(
      `SELECT * FROM local_catalogue_aliases;`
    );
    const allSuggestions = await this.db.getAllAsync<any>(
      `SELECT * FROM local_catalogue_suggestions WHERE status = 'pending';`
    );

    const results: SearchableOfferItem[] = [];
    const addedIds = new Set<string>();

    // 1. Match canonical item names
    for (const item of allItems) {
      if (categoryId && item.primary_category_id !== categoryId) {
        // Still allow if query specifically matches canonical name or alias
        if (!trimmed) continue;
      }

      const itemName = (item.name || '').toLowerCase();
      if (!trimmed || itemName.includes(trimmed)) {
        if (!addedIds.has(item.id)) {
          addedIds.add(item.id);
          results.push({
            id: item.id,
            name: item.name,
            itemType: item.item_type || 'product',
            primaryCategoryId: item.primary_category_id,
            isPendingSuggestion: false,
          });
        }
      }
    }

    // 2. Match aliases (e.g. "Airtime" -> Recharge Card, "Screen replacement" -> Phone repair)
    if (trimmed) {
      for (const alias of allAliases) {
        const aliasName = (alias.alias_name || '').toLowerCase();
        if (aliasName.includes(trimmed)) {
          const item = allItems.find((i) => i.id === alias.catalogue_item_id);
          if (item && !addedIds.has(item.id)) {
            addedIds.add(item.id);
            results.push({
              id: item.id,
              name: item.name,
              itemType: item.item_type || 'product',
              primaryCategoryId: item.primary_category_id,
              matchedAlias: alias.alias_name,
              isPendingSuggestion: false,
            });
          }
        }
      }
    }

    // 3. Match pending local suggestions (4N, 4O)
    for (const sugg of allSuggestions) {
      const suggName = (sugg.name || '').toLowerCase();
      if (!trimmed || suggName.includes(trimmed)) {
        if (!addedIds.has(sugg.id)) {
          addedIds.add(sugg.id);
          results.push({
            id: sugg.id,
            name: sugg.name,
            itemType: sugg.item_type || 'product',
            primaryCategoryId: sugg.suggested_category_id,
            isPendingSuggestion: true,
            status: 'pending',
          });
        }
      }
    }

    return results;
  }

  /**
   * Retrieves recently selected offerings across local businesses
   */
  static async getRecentItems(limit = 6): Promise<SearchableOfferItem[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT DISTINCT catalogue_item_id, item_name, item_type FROM local_business_offerings ORDER BY created_at DESC LIMIT ?;`,
      [limit]
    );

    const allItems = await this.db.getAllAsync<any>(
      `SELECT * FROM local_catalogue_items WHERE is_archived = 0;`
    );

    const results: SearchableOfferItem[] = [];
    for (const r of rows) {
      const canonical = allItems.find((i) => i.id === r.catalogue_item_id);
      if (canonical) {
        results.push({
          id: canonical.id,
          name: canonical.name,
          itemType: canonical.item_type || 'product',
          primaryCategoryId: canonical.primary_category_id,
          isPendingSuggestion: false,
        });
      } else if (r.catalogue_item_id) {
        results.push({
          id: r.catalogue_item_id,
          name: r.item_name || 'Recent Item',
          itemType: (r.item_type as CatalogueItemType) || 'product',
          isPendingSuggestion: r.catalogue_item_id.startsWith('sugg_'),
        });
      }
    }

    // If no recent history, return default top goods/services
    if (results.length === 0) {
      const defaults = allItems.slice(0, limit);
      return defaults.map((d) => ({
        id: d.id,
        name: d.name,
        itemType: d.item_type || 'product',
        primaryCategoryId: d.primary_category_id,
        isPendingSuggestion: false,
      }));
    }

    return results;
  }

  /**
   * Suggests a new product or service offline (4N, 4O).
   * Works fully offline, returns pending suggestion record,
   * immediately usable by the mapper.
   */
  static async suggestNewItem(data: {
    name: string;
    itemType: CatalogueItemType;
    suggestedCategoryId?: string;
    notes?: string;
    suggestedBy: string;
    marketId?: string;
  }): Promise<CatalogueSuggestion> {
    const id = `sugg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: CatalogueSuggestion = {
      id,
      suggestedBy: data.suggestedBy,
      name: data.name.trim(),
      itemType: data.itemType,
      suggestedCategoryId: data.suggestedCategoryId,
      status: 'pending',
      reviewerNotes: data.notes,
      createdAt: now,
    };

    await this.db.runAsync(
      `INSERT INTO local_catalogue_suggestions (
        id, suggested_by, name, item_type, suggested_category_id,
        status, reviewer_notes, notes, market_id, created_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 'local_only');`,
      [
        record.id,
        record.suggestedBy,
        record.name,
        record.itemType,
        record.suggestedCategoryId || null,
        record.reviewerNotes || null,
        data.notes || null,
        data.marketId || null,
        now,
      ]
    );

    // Enqueue outbox action for eventual admin sync
    const outboxId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await this.db.runAsync(
      `INSERT INTO local_outbox_queue (
        id, table_name, record_id, action, payload, client_timestamp, status, retry_count
      ) VALUES (?, 'catalogue_suggestions', ?, 'INSERT', ?, ?, 'pending', 0);`,
      [outboxId, record.id, JSON.stringify(record), Date.now()]
    );

    return record;
  }

  /**
   * Gets all pending local suggestions
   */
  static async getAllSuggestions(status: CatalogueSuggestionStatus = 'pending'): Promise<CatalogueSuggestion[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM local_catalogue_suggestions WHERE status = ? ORDER BY created_at DESC;`,
      [status]
    );
    return rows.map((r) => ({
      id: r.id,
      suggestedBy: r.suggested_by,
      name: r.name,
      itemType: r.item_type || 'product',
      suggestedCategoryId: r.suggested_category_id,
      status: r.status || 'pending',
      mergedIntoId: r.merged_into_id,
      reviewerNotes: r.reviewer_notes || r.notes,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
      createdAt: r.created_at,
    }));
  }
}
