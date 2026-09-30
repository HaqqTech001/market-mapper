import { BusinessRepository } from '@/src/db/repositories/BusinessRepository';
import { FieldIssueRepository } from '@/src/db/repositories/FieldIssueRepository';
import { PathRepository } from '@/src/db/repositories/PathRepository';
import type { Business, BusinessActivity, BusinessOfferingObservation, BusinessStability, BusinessType, CatalogueItemType, JunctionType, RelativeBusinessPosition } from '@/src/types';

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
  await PathRepository.addJunction({
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
  });
  return { id, operationalLabel: label };
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
