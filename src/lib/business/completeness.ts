/**
 * Business Completeness Score Calculator (Phase 4 Completeness Engine)
 * 
 * Design Principles:
 * - Helpful capture feedback, never punitive or gamified.
 * - Legitimate field states are NOT penalized:
 *   * "No Visible Name" receives full points
 *   * "Photo Declined" / "Photo Unable" receives full points
 *   * "Unknown" stability receives full points (never force guessing)
 *   * Trader personal info is strictly optional
 *   * Service-only businesses receive service-appropriate hints
 *   * Revisit flags are recognized as intentional mapper judgment
 */

import { Business } from '../../types';

export interface CompletenessResult {
  score: number; // 0 to 100
  tier: 'minimal' | 'good' | 'complete';
  tierLabel: string;
  missingHelp: string[];
}

export function calculateBusinessCompleteness(
  business: Partial<Business>,
  offeringsCount = 0
): CompletenessResult {
  let score = 0;
  const missingHelp: string[] = [];

  // 1. Valid location coordinates (25 pts)
  if (business.latitude != null && business.longitude != null && !isNaN(business.latitude) && !isNaN(business.longitude)) {
    score += 25;
  } else {
    missingHelp.push('Location coordinates missing');
  }

  // 2. Business Type & Activity Classification (20 pts)
  if (business.businessType && business.activity) {
    score += 20;
  } else {
    missingHelp.push('Type & activity classification');
  }

  // 3. Name or explicit "No Visible Name" (20 pts)
  if ((business.name && business.name.trim().length > 0) || business.hasNoVisibleName) {
    score += 20;
  } else {
    missingHelp.push('Store name or "No visible name" check');
  }

  // 4. Physical stall / line / row address (10 pts)
  if (
    (business.stallNumber && business.stallNumber.trim().length > 0) ||
    (business.lineName && business.lineName.trim().length > 0) ||
    (business.rowLine && business.rowLine.trim().length > 0) ||
    (business.block && business.block.trim().length > 0)
  ) {
    score += 10;
  } else {
    // Only suggest if not a mobile or temporary trader where stalls rarely exist
    if (business.businessType !== 'mobile_trader' && business.businessType !== 'temporary_stand') {
      missingHelp.push('Stall number or line/row if applicable');
    } else {
      score += 10; // Mobile/temporary traders are not penalized for lacking a stall
    }
  }

  // 5. Offerings / Catalogue selection (15 pts)
  if (offeringsCount > 0) {
    score += 15;
  } else if (business.revisitNeeded) {
    // If flagged for revisit to confirm goods/services, don't penalize
    score += 10;
  } else {
    if (business.activity === 'offers_services' || business.activity === 'services') {
      missingHelp.push('Add at least 1 service offering');
    } else {
      missingHelp.push('Add at least 1 product or service offering');
    }
  }

  // 6. Photo attached OR Photo Declined / Unable (10 pts)
  if (business.localPhotoUri || business.photoDeclined) {
    score += 10;
  } else if (business.revisitNeeded && business.revisitReason === 'photo_needed') {
    score += 5;
  } else {
    missingHelp.push('Storefront photo (or record as declined)');
  }

  score = Math.min(100, Math.max(0, score));

  let tier: 'minimal' | 'good' | 'complete' = 'minimal';
  let tierLabel = 'Basic Capture';

  if (score >= 80) {
    tier = 'complete';
    tierLabel = 'Comprehensive';
  } else if (score >= 50) {
    tier = 'good';
    tierLabel = 'Solid Capture';
  }

  return {
    score,
    tier,
    tierLabel,
    missingHelp,
  };
}
