/**
 * Minimal Development Reference Seed (Testing Baseline Only)
 * 
 * NOTE: THIS IS A MINIMAL DEVELOPMENT SEED ONLY.
 * It is NOT an authoritative or finalized catalogue for any specific Nigerian market.
 * It provides only the minimal structure required to verify:
 * 1. Category taxonomy
 * 2. Products vs services distinction
 * 3. Aliases and synonym lookups
 * 4. Local full-text search capability
 * 5. Many-to-many category associations (local_catalogue_item_categories)
 * 
 * The authoritative Nigerian market catalogue will be compiled and verified separately.
 */

import { DatabaseAdapter } from '../sqlite';

export const SEED_VERSION_DEV_MINIMAL = 1;

export interface DevSeedCategory {
  id: string;
  name: string;
  iconName: string;
  sortOrder: number;
}

export interface DevSeedCatalogueItem {
  id: string;
  name: string;
  itemType: 'product' | 'service';
  primaryCategoryId: string;
  secondaryCategoryIds?: string[];
  aliases: string[];
}

export const MINIMAL_DEV_CATEGORIES: DevSeedCategory[] = [
  { id: 'cat_electronics', name: 'Electronics & Electricals', iconName: 'Zap', sortOrder: 1 },
  { id: 'cat_phones', name: 'Phones & Accessories', iconName: 'Smartphone', sortOrder: 2 },
  { id: 'cat_foodstuffs', name: 'Foodstuffs & Provisions', iconName: 'Package', sortOrder: 3 },
  { id: 'cat_fashion', name: 'Fashion & Textiles', iconName: 'ShoppingBag', sortOrder: 4 },
  { id: 'cat_services', name: 'Services & Technical Repairs', iconName: 'Wrench', sortOrder: 5 },
  { id: 'cat_beauty', name: 'Cosmetics & Beauty', iconName: 'Sparkles', sortOrder: 6 },
  { id: 'cat_dev_goods', name: 'General Retail & Physical Goods', iconName: 'ShoppingBag', sortOrder: 7 },
  { id: 'cat_dev_technical', name: 'Technical Equipment & Energy', iconName: 'Zap', sortOrder: 8 },
  { id: 'cat_dev_repairs', name: 'Repairs & Technical Services', iconName: 'Wrench', sortOrder: 9 },
  { id: 'cat_dev_provisions', name: 'Foodstuffs & Provisions (Dev)', iconName: 'Package', sortOrder: 10 },
];

export const MINIMAL_DEV_CATALOGUE_ITEMS: DevSeedCatalogueItem[] = [
  // 1. Foodstuffs (Rice, Beans, Yam, Oil, Garri)
  {
    id: 'item_rice',
    name: 'Rice (Bags & Cups)',
    itemType: 'product',
    primaryCategoryId: 'cat_foodstuffs',
    secondaryCategoryIds: ['cat_dev_provisions'],
    aliases: ['Rice', 'Foreign rice', 'Local rice', 'Parboiled rice', 'Shinkafa', 'Osi rice'],
  },
  {
    id: 'item_beans',
    name: 'Beans (Oloyin / White)',
    itemType: 'product',
    primaryCategoryId: 'cat_foodstuffs',
    aliases: ['Beans', 'Ewa', 'Honey beans', 'Oloyin', 'Cowpea'],
  },
  {
    id: 'item_palm_oil',
    name: 'Palm Oil & Vegetable Oil',
    itemType: 'product',
    primaryCategoryId: 'cat_foodstuffs',
    aliases: ['Palm oil', 'Groundnut oil', 'Vegetable oil', 'Epo pupa', 'Red oil', 'Cooking oil'],
  },

  // 2. Phones & Tech (Recharge card, Phone repair, Screens, Chargers)
  {
    id: 'item_recharge_card',
    name: 'Recharge Cards & Data Vouchers',
    itemType: 'product',
    primaryCategoryId: 'cat_phones',
    secondaryCategoryIds: ['cat_services'],
    aliases: ['Recharge card', 'Airtime', 'Data voucher', 'MTN card', 'Airtel Glo voucher'],
  },
  {
    id: 'item_phone_repair',
    name: 'Phone Repair & Servicing',
    itemType: 'service',
    primaryCategoryId: 'cat_services',
    secondaryCategoryIds: ['cat_phones'],
    aliases: ['Phone repair', 'Screen replacement', 'Fix screen', 'Charging port repair', 'Slot repair', 'Unlock phone'],
  },
  {
    id: 'item_phone_accessories',
    name: 'Phone Accessories & Chargers',
    itemType: 'product',
    primaryCategoryId: 'cat_phones',
    aliases: ['Charger', 'USB cable', 'Power bank', 'Screen guard', 'Pouch', 'Earphones'],
  },

  // 3. Fashion & Fabrics
  {
    id: 'item_fabric_materials',
    name: 'Fabric Materials (Ankara, Lace, Guinea)',
    itemType: 'product',
    primaryCategoryId: 'cat_fashion',
    secondaryCategoryIds: ['cat_dev_goods'],
    aliases: ['Fabric', 'Ankara', 'Lace material', 'Cotton bale', 'Guinea brocade', 'Aso ebi'],
  },
  {
    id: 'item_tailoring_service',
    name: 'Tailoring & Garment Sewing',
    itemType: 'service',
    primaryCategoryId: 'cat_services',
    secondaryCategoryIds: ['cat_fashion'],
    aliases: ['Tailoring', 'Sewing service', 'Dressmaking', 'Fashion designer', 'Embroidery'],
  },

  // 4. Everyday Market Services (POS, Printing)
  {
    id: 'item_pos_service',
    name: 'POS Cash Withdrawal & Transfer',
    itemType: 'service',
    primaryCategoryId: 'cat_services',
    aliases: ['POS service', 'POS cash', 'Cash withdrawal', 'Money transfer', 'Moniepoint', 'OPay agent'],
  },
  {
    id: 'item_printing_service',
    name: 'Printing & Photocopying',
    itemType: 'service',
    primaryCategoryId: 'cat_services',
    aliases: ['Printing', 'Photocopying', 'Lamination', 'Typing', 'Scanning', 'Passport photo'],
  },

  // 5. Electronics & Solar / Energy
  {
    id: 'item_solar_inverter',
    name: 'Solar Hybrid Inverter & Batteries',
    itemType: 'product',
    primaryCategoryId: 'cat_electronics',
    secondaryCategoryIds: ['cat_dev_technical'],
    aliases: ['Solar inverter', 'Inverter', 'Tubular battery', 'Solar panel', 'UPS system'],
  },
  {
    id: 'item_generator_parts',
    name: 'Generator Spare Parts & Servicing',
    itemType: 'product',
    primaryCategoryId: 'cat_electronics',
    secondaryCategoryIds: ['cat_services'],
    aliases: ['Generator parts', 'Tiger gen parts', 'Carburetor', 'Spark plug', 'Gen repair'],
  },

  // 6. Test Baseline Items for Legacy Tests
  {
    id: 'item_dev_01',
    name: 'Test Solar Hybrid Inverter',
    itemType: 'product',
    primaryCategoryId: 'cat_dev_technical',
    secondaryCategoryIds: ['cat_dev_goods'],
    aliases: ['Test inverter', 'UPS generator unit'],
  },
  {
    id: 'item_dev_02',
    name: 'Test Inverter Repair & Maintenance',
    itemType: 'service',
    primaryCategoryId: 'cat_dev_repairs',
    secondaryCategoryIds: ['cat_dev_technical'],
    aliases: ['Inverter servicing', 'Rewinding test'],
  },
  {
    id: 'item_dev_03',
    name: 'Test Cotton Fabric Bale',
    itemType: 'product',
    primaryCategoryId: 'cat_dev_goods',
    aliases: ['Material roll', 'Textile sample'],
  },
  {
    id: 'item_dev_04',
    name: 'Test Garment Tailoring Service',
    itemType: 'service',
    primaryCategoryId: 'cat_dev_repairs',
    aliases: ['Sewing service', 'Dressmaking'],
  },
  {
    id: 'item_dev_05',
    name: 'Test Packaged Grains & Spices',
    itemType: 'product',
    primaryCategoryId: 'cat_dev_provisions',
    aliases: ['Cooking condiments', 'Bulk grain'],
  },
];

/**
 * Seeds minimal development testing records into local SQLite
 */
export async function seedInitialCatalogue(db: DatabaseAdapter): Promise<void> {
  const existing = await db.getAllAsync('SELECT id FROM local_categories LIMIT 1;');
  if (existing && existing.length > 0) {
    return; // Already initialized
  }

  const now = new Date().toISOString();

  // 1. Categories
  for (const cat of MINIMAL_DEV_CATEGORIES) {
    await db.runAsync(
      `INSERT OR REPLACE INTO local_categories (id, name, icon_name, sort_order, created_at, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, 0);`,
      [cat.id, cat.name, cat.iconName, cat.sortOrder, now, now]
    );
  }

  // 2. Items, Many-to-Many Categories, and Aliases
  for (const item of MINIMAL_DEV_CATALOGUE_ITEMS) {
    await db.runAsync(
      `INSERT OR REPLACE INTO local_catalogue_items (id, name, item_type, primary_category_id, description, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?);`,
      [item.id, item.name, item.itemType, item.primaryCategoryId, `[DEV SEED] ${item.name}`, now, now]
    );

    // Primary category association
    await db.runAsync(
      `INSERT OR REPLACE INTO local_catalogue_item_categories (catalogue_item_id, category_id)
       VALUES (?, ?);`,
      [item.id, item.primaryCategoryId]
    );

    // Secondary categories (many-to-many testing)
    if (item.secondaryCategoryIds) {
      for (const secCatId of item.secondaryCategoryIds) {
        await db.runAsync(
          `INSERT OR REPLACE INTO local_catalogue_item_categories (catalogue_item_id, category_id)
           VALUES (?, ?);`,
          [item.id, secCatId]
        );
      }
    }

    // Aliases
    for (const alias of item.aliases) {
      const aliasId = `alias_${item.id}_${Math.random().toString(36).substring(2, 8)}`;
      await db.runAsync(
        `INSERT OR REPLACE INTO local_catalogue_aliases (id, catalogue_item_id, alias_name, language_or_dialect)
         VALUES (?, ?, ?, 'en');`,
        [aliasId, item.id, alias]
      );
    }
  }
}
