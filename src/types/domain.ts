/**
 * Market Mapper V1 Domain Types & Constants
 * Frozen Architecture Baseline
 */

// 1. Roles & Permissions (Auditor role removed as mandated)
export type UserRole = 'admin' | 'team_lead' | 'mapper';

export interface Profile {
  id: string; // UUID
  fullName: string;
  email: string;
  phone?: string; // Optional
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string; // UUID
  name: string;
  code?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface TeamMember {
  id: string; // UUID
  teamId: string;
  userId: string;
  teamRole: 'lead' | 'member';
  joinedAt: string;
}

// 2. Spatial Entities: Markets & Areas
export interface Market {
  id: string; // UUID
  name: string;
  city: string;
  state: string;
  boundaryGeoJSON?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export type MarketAreaType =
  | 'general_inside_market'
  | 'market_frontage'
  | 'gate_entrance_area'
  | 'annex'
  | 'overflow_area'
  | 'surrounding_commercial_area'
  | 'other';

export interface MarketArea {
  id: string; // UUID
  marketId: string;
  name: string;
  code: string;
  areaType: MarketAreaType;
  polygonCoordinates: [number, number][]; // [longitude, latitude] or canvas coords
  color: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export type PlaceType =
  | 'gate_entrance'
  | 'junction'
  | 'landmark'
  | 'facility_restroom'
  | 'facility_water'
  | 'facility_waste'
  | 'facility_power'
  | 'transport_stop'
  | 'other';

export interface MarketPlace {
  id: string; // UUID
  marketId: string;
  areaId?: string;
  operationalLabel: string; // Auto-generated e.g. "Gate G04", "Junction J012"
  displayName?: string; // Optional mapper custom label
  placeType: PlaceType;
  latitude: number;
  longitude: number;
  description?: string;
  photoPath?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

// 3. Missions (Phase 5 Enhanced)
export type MissionType =
  | 'initial_mapping'
  | 'continue_mapping'
  | 'expansion'
  | 'verification'
  | 'correction'
  | 'resurvey';

export type MissionStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'archived';

export type MissionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Mission {
  id: string; // UUID
  marketId: string;
  marketName?: string;
  title: string;
  missionType: MissionType;
  status: MissionStatus;
  priority?: MissionPriority;
  teamId?: string;
  teamName?: string;
  leadUserId?: string;
  description?: string;
  targetStalls?: number;
  estimatedHours?: number;
  dueDate?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export interface MissionProgress {
  missionId: string;
  stallsMapped: number;
  targetStalls: number;
  pathsRecorded: number;
  areasCompleted: number;
  totalAreas: number;
  percentage: number;
  openIssuesCount: number;
}

export interface MissionMember {
  id: string; // UUID
  missionId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  roleInMission: 'lead' | 'mapper';
  assignedAt: string;
  syncStatus?: SyncStatus;
}

export interface MissionAreaAssignment {
  id: string; // UUID
  missionId: string;
  areaId: string;
  areaName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  status: 'assigned' | 'in_progress' | 'completed';
  assignedAt: string;
  completedAt?: string;
  notes?: string;
  syncStatus?: SyncStatus;
}

// 4. Normalized Catalogue & Goods/Services
export interface Category {
  id: string; // UUID
  name: string;
  iconName: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export type CatalogueItemType = 'product' | 'service';

export interface CatalogueItem {
  id: string; // UUID
  name: string;
  itemType: CatalogueItemType;
  primaryCategoryId?: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogueAlias {
  id: string; // UUID
  catalogueItemId: string;
  aliasName: string;
  languageOrDialect?: string;
}

export type CatalogueSuggestionStatus = 'pending' | 'approved' | 'merged' | 'rejected';

export interface CatalogueSuggestion {
  id: string; // UUID
  suggestedBy: string;
  name: string;
  itemType: CatalogueItemType;
  suggestedCategoryId?: string;
  status: CatalogueSuggestionStatus;
  mergedIntoId?: string;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// 5. Business Data Model
export type BusinessType =
  | 'shop'
  | 'stall'
  | 'kiosk'
  | 'open_stand'
  | 'workshop'
  | 'service_point'
  | 'restaurant_food_point'
  | 'temporary_stand'
  | 'mobile_trader'
  | 'wholesale_outlet'
  | 'other';

export type PhysicalStructure =
  | 'building_shop'
  | 'lockup_stall'
  | 'container'
  | 'kiosk_booth'
  | 'open_table'
  | 'umbrella'
  | 'floor_mat'
  | 'pushcart'
  | 'vehicle'
  | 'temporary_shelter'
  | 'other'
  | 'none';

export type BusinessActivity = 'sells_goods' | 'offers_services' | 'both' | 'goods' | 'services';

export type BusinessStability =
  | 'permanent'
  | 'semi_permanent'
  | 'temporary'
  | 'seasonal'
  | 'mobile'
  | 'unknown'
  | 'permanent_shop'
  | 'semi_permanent_stall'
  | 'temporary_display'
  | 'mobile_hawker';

export type LocationRelationship =
  | 'general_inside_market'
  | 'market_frontage'
  | 'gate_entrance_area'
  | 'annex'
  | 'overflow_area'
  | 'surrounding_commercial_area'
  | 'other'
  | 'unknown'
  | 'unconfirmed';

export type JunctionType =
  | 't_junction'
  | 'cross_4way'
  | 'y_fork'
  | 'irregular_3way'
  | 'multi_way'
  | 'corner_bend'
  | 'dead_end'
  | 'unknown';

export type JunctionBranchStatus = 'unmapped' | 'in_progress' | 'mapped' | 'blocked';

export interface JunctionBranch {
  id: string;
  junctionId: string;
  label: string;
  relativeSide?: 'left' | 'right' | 'straight' | 'stem' | 'branch_1' | 'branch_2' | 'branch_3' | 'branch_4' | 'branch_5';
  status: JunctionBranchStatus;
  connectedPathId?: string;
  connectedTargetJunctionId?: string;
  notes?: string;
  mappedAt?: string;
  mappedBy?: string;
}


export type RelativeBusinessPosition = 'left' | 'right' | 'ahead' | 'unclear';

export type LocationSource =
  | 'current_gps'
  | 'recent_valid_gps'
  | 'map_selected'
  | 'manual_adjustment'
  | 'relative_side_proposal';

export type BusinessOfferingObservation = 'observed' | 'trader_confirmed' | 'both' | 'other';
export type OfferingSource = BusinessOfferingObservation;

export type TraderInteractionStatus =
  | 'project_explained'
  | 'basic_mapping_accepted'
  | 'photo_accepted'
  | 'photo_declined'
  | 'contact_voluntarily_provided'
  | 'could_not_speak'
  | 'participation_declined'
  | 'merchant_interested';

export type BusinessRevisitReason =
  | 'details_missing'
  | 'trader_unavailable'
  | 'photo_needed'
  | 'location_uncertain'
  | 'goods_services_unconfirmed'
  | 'possible_duplicate'
  | 'verification_needed'
  | 'locked_shop'
  | 'other';

export type PhotoCaptureState = 'captured' | 'declined' | 'not_captured' | 'unable';

export interface BusinessOffering {
  id: string; // UUID
  businessId: string;
  catalogueItemId?: string;
  pendingSuggestionId?: string;
  catalogueItemName?: string;
  itemType?: CatalogueItemType;
  howEstablished: BusinessOfferingObservation;
  createdAt: string;
  syncStatus?: SyncStatus;
}

export interface LocalMediaRecord {
  id: string;
  ownerUserId?: string;
  entityType: 'business' | 'market' | 'issue' | 'verification';
  entityId: string;
  mediaType: 'photo' | 'audio' | 'document';
  localUri: string;
  thumbnailUri?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  captureSource?: 'camera' | 'gallery' | 'device';
  uploadStatus: 'local_only' | 'pending' | 'uploading' | 'uploaded' | 'failed';
  remotePath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string; // Client-generated UUID
  missionId: string;
  marketId?: string;
  areaId?: string;
  operationalLabel: string; // e.g. B-A12-001, B001

  // Step 1: Classification
  businessType: BusinessType;
  physicalStructure?: PhysicalStructure;
  activity: BusinessActivity;
  locationRelationship?: LocationRelationship;

  // Step 2: Details
  name?: string; // Optional if hasNoVisibleName is true
  hasNoVisibleName: boolean;
  stallNumber?: string; // Optional
  lineName?: string; // Optional
  rowBlockFloor?: string; // Optional
  rowLine?: string;
  block?: string;
  floor?: string;
  primaryCategoryId?: string;

  // Geometry & Location Audit (4B, 4C)
  latitude: number;
  longitude: number;
  locationAccuracy?: number;
  locationSource?: LocationSource;
  originalLatitude?: number;
  originalLongitude?: number;
  relativePosition?: RelativeBusinessPosition;
  capturedHeading?: number | null;
  headingSource?: 'movement_vector' | 'compass' | 'manual' | 'none';
  directionConfidence?: 'high' | 'medium' | 'low' | 'none';
  parentPathSessionId?: string;
  proposedLatitude?: number;
  proposedLongitude?: number;

  // Step 4: Finish / Attributes
  stability: BusinessStability;
  localPhotoUri?: string;
  remotePhotoPath?: string;
  photoDeclined: boolean;
  photoState?: PhotoCaptureState;
  phone?: string; // Optional trader interaction
  ownerName?: string; // Optional trader interaction
  notes?: string;
  completenessScore: number;

  // Revisit state (4R, 4AH)
  revisitNeeded?: boolean;
  revisitReason?: BusinessRevisitReason;
  revisitNotes?: string;

  // Trader interaction (4X, 4Y)
  traderInteractionStatus?: TraderInteractionStatus;

  // Status & Audit
  status: 'verified' | 'pending' | 'needs_revisit' | 'inactive';
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  clientCreatedAt: string;
  isDeleted: boolean;
  syncStatus: SyncStatus;

  // Joined/associated entities
  offerings?: BusinessOffering[];
  media?: LocalMediaRecord[];
}

// 6. Paths & Junctions (Phase 3 Expanded)
export type GpsQualityStatus = 'good' | 'fair' | 'poor' | 'searching';

export type GpsEngineRejectionReason =
  | 'duplicate'
  | 'stale'
  | 'invalid_coordinate'
  | 'impossible_jump'
  | 'poor_accuracy_excluded'
  | 'stationary_noise';

export type MapperCorrectionReason =
  | 'undo_distance'
  | 'undo_time'
  | 'trim_start'
  | 'trim_end'
  | 'restart_from_point'
  | 'restart_from_junction'
  | 'manual_exclusion';

export type GpsRejectionReason =
  | GpsEngineRejectionReason
  | MapperCorrectionReason
  | 'extremely_poor_accuracy'
  | 'duplicate_sample'
  | 'stale_sample'
  | 'trimmed';

export interface RawGpsSample {
  id: string; // Client-generated UUID
  sessionId: string;
  segmentId: string;
  sequenceNumber: number;
  latitude: number;
  longitude: number;
  timestamp: number; // Epoch ms
  accuracy: number; // Meters
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  accepted: boolean;
  rejectionReason?: GpsRejectionReason | null;
  createdAt: string;
}

export interface PathSegment {
  id: string; // Client-generated UUID
  sessionId: string;
  segmentIndex: number;
  startedAt: string;
  endedAt?: string | null;
  isClosed: boolean;
}

export type PathSessionStatus =
  | 'recording'
  | 'paused'
  | 'reviewing'
  | 'completed'
  | 'discarded';

export interface LocalPathJunction {
  id: string; // Client-generated UUID
  sessionId?: string;
  pathId?: string;
  operationalLabel: string; // e.g. "Junction J001"
  displayName?: string;
  junctionType?: JunctionType;
  marketId?: string;
  missionId?: string;
  createdBy?: string;
  verificationState?: 'unverified' | 'verified' | 'flagged';
  locationSource?: string;
  latitude: number;
  longitude: number;
  sequenceNumber: number;
  timestamp: number;
  isExcluded?: boolean; // When undo or trim rolls back past this junction
  exclusionReason?: string;
  branches?: JunctionBranch[];
  createdAt: string;
}

export interface ActivePathSession {
  sessionId: string;
  missionId: string;
  startedAt: string;
  lastSavedAt: string;
  distanceMeters: number;
  durationSeconds: number;
  activeDurationSeconds: number;
  junctionsCount: number;
  isPaused: boolean;
  status: PathSessionStatus;
}

export type PathCorrectionType =
  | 'undo_distance'
  | 'undo_time'
  | 'select_point'
  | 'restart_junction'
  | 'trim_start'
  | 'trim_end';

export interface PathCorrectionLog {
  id: string;
  sessionId: string;
  correctionType: PathCorrectionType;
  details?: string;
  pointsAffected: number;
  createdAt: string;
}

export interface GpsDiagnosticInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  sampleCount: number;
  acceptedCount: number;
  rejectedCount: number;
  activeSegmentIndex: number;
  quality: GpsQualityStatus;
  persistenceStatus: 'saved' | 'saving' | 'error';
  isSimulatorActive?: boolean;
  movementState?: 'SEARCHING' | 'STATIONARY' | 'POSSIBLY_MOVING' | 'MOVING' | string;
  rawDisplacementMeters?: number;
  distanceFromAnchorMeters?: number;
  acceptedDisplacementMeters?: number;
  distanceAddedMeters?: number;
  lastRejectionReason?: string | null;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy: number;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface LayerVisibilityState {
  showBusinesses: boolean;
  showPaths: boolean;
  showJunctions: boolean;
  showGates: boolean;
  showAreas: boolean;
  showLandmarks: boolean;
  showFacilities: boolean;
  showRevisits: boolean;
}

export interface PathPointRaw {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  isJunction?: boolean;
  junctionLabel?: string;
}

export interface PathJunction {
  id: string; // UUID
  pathId: string;
  operationalLabel: string; // e.g. "Junction J017"
  displayName?: string;
  junctionType?: JunctionType;
  marketId?: string;
  missionId?: string;
  latitude: number;
  longitude: number;
  junctionOrder: number;
  createdAt: string;
}

export interface MarketPath {
  id: string; // Client-generated UUID
  sessionId?: string; // Foreign key back to local_path_sessions for raw GPS audit trail
  missionId: string;
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  junctionsCount: number;
  rawPoints: PathPointRaw[];
  segments?: Array<Array<[number, number]>>; // Longitude, Latitude tuples per segment
  geojsonGeometry?: { type: 'LineString' | 'MultiLineString'; coordinates: any };
  isMultiSegment?: boolean; // Indicates discontinuities from pauses
  isVerified: boolean;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  clientCreatedAt: string;
  isDeleted: boolean;
  syncStatus: SyncStatus;
}

export interface PathCheckpoint {
  id: string;
  sessionId: string;
  pointsCount: number;
  lastLatitude: number;
  lastLongitude: number;
  createdAt: string;
}

// 7. Revisits & Verifications
export type RevisitReason =
  | 'missing_photo'
  | 'missing_information'
  | 'uncertain_location'
  | 'possible_duplicate'
  | 'disconnected_path'
  | 'verification_required'
  | 'trader_busy'
  | 'access_issue'
  | 'other';

export type RevisitEntityType = 'business' | 'path' | 'gate' | 'place' | 'area';

export interface Revisit {
  id: string; // UUID
  missionId: string;
  entityType: RevisitEntityType;
  entityId: string;
  entityTitle?: string;
  reason: RevisitReason;
  notes?: string;
  status: 'open' | 'assigned' | 'resolved' | 'dismissed';
  assignedTo?: string;
  flaggedBy: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

// 8. Handovers, Issues & Reconciliations (Phase 5 Team Coordination)
export type HandoverStatus = 'pending' | 'accepted' | 'declined' | 'rejected' | 'completed' | 'cancelled' | 'stale';

export interface HandoverChecklist {
  safetyChecked: boolean;
  dataSynced: boolean;
  boundariesClarified: boolean;
  keysEquipmentPassed?: boolean;
  specialInstructions?: string;
}

export interface Handover {
  id: string; // UUID
  missionId: string;
  missionTitle?: string;
  areaId: string;
  areaName?: string;
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  status: HandoverStatus;
  notes?: string;
  checklist: HandoverChecklist;
  stallsCountAtHandover: number;
  pathsCountAtHandover?: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export type FieldIssueType =
  | 'hazard_obstacle'
  | 'access_blocked'
  | 'unsafe_area'
  | 'disputed_boundary'
  | 'wrong_assignment'
  | 'severe_weather'
  | 'other';

export type FieldIssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FieldIssueStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface FieldIssue {
  id: string; // UUID
  missionId: string;
  missionTitle?: string;
  areaId?: string;
  areaName?: string;
  reportedBy: string;
  reportedByName?: string;
  reportedByRole?: UserRole;
  issueType: FieldIssueType;
  severity: FieldIssueSeverity;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  photoUri?: string;
  status: FieldIssueStatus;
  resolvedBy?: string;
  resolvedByName?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export type ReconciliationStatus = 'pending_lead_review' | 'approved' | 'requires_revisit';

export interface AreaReconciliation {
  id: string; // UUID
  missionId: string;
  missionTitle?: string;
  areaId: string;
  areaName: string;
  reconciledBy: string;
  reconciledByName?: string;
  stallsCounted: number;
  pathsRecorded: number;
  unresolvedIssuesCount: number;
  status: ReconciliationStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

// 9. Chat & Notifications
export interface ChatChannel {
  id: string;
  name: string;
  channelType: 'team' | 'mission' | 'announcements' | 'general';
  teamId?: string;
  missionId?: string;
  unreadCount: number;
  lastMessageSnippet?: string;
  lastMessageTime?: string;
  createdAt: string;
  description?: string;
  avatarPath?: string;
  updatedAt?: string;
}

export type ChatMessageType='text'|'image'|'video'|'audio'|'file';
export interface ChatAttachment {localUri?:string;remotePath?:string;name:string;mimeType?:string;size?:number;durationMs?:number;width?:number;height?:number;}
export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: UserRole;
  replyToId?: string;
  text: string;
  messageType?: ChatMessageType;
  attachment?: ChatAttachment;
  reactions?: Record<string,string[]>;
  editedAt?: string;
  deletedAt?: string;
  deletedById?: string;
  deletedByName?: string;
  isPinned: boolean;
  linkedBusinessId?: string;
  linkedBusinessName?: string;
  linkedPathId?: string;
  linkedPathName?: string;
  linkedIssueId?: string;
  linkedIssueTitle?: string;
  sharedLocation?: {
    latitude: number;
    longitude: number;
    label: string;
  };
  createdAt: string;
  syncStatus?: SyncStatus;
  deliveredAt?: string;
  readAt?: string;
  transferStatus?: 'none'|'queued'|'uploading'|'downloading'|'complete'|'failed'|'cancelled';
  transferProgress?: number;
}

export type NotificationType =
  | 'new_mission'
  | 'mission_assignment'
  | 'assignment_updated'
  | 'team_update'
  | 'verification_request'
  | 'record_correction'
  | 'chat_mention'
  | 'handover_request'
  | 'handover_accepted'
  | 'field_issue_alert'
  | 'reconciliation_review'
  | 'sync_conflict'
  | 'catalogue_update'
  | 'mission_completed'
  | 'mission_status_changed'
  | 'role_changed'
  | 'account_status_changed';

export interface NotificationItem {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityReferenceType?: 'mission' | 'assignment' | 'business' | 'path' | 'chat' | 'handover' | 'issue' | 'reconciliation' | string;
  entityReferenceId?: string;
  isRead: boolean;
  createdAt: string;
  syncStatus?: SyncStatus;
}

// 9. Synchronization & Queue Types
export type SyncStatus = 'local_only' | 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';

export type OutboxAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface OutboxQueueItem {
  id: string;
  tableName: string;
  recordId: string;
  action: OutboxAction;
  payload: string; // JSON string
  clientTimestamp: number;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  retryCount: number;
  errorMessage?: string;
}

export type MediaUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface MediaUploadQueueItem {
  id: string;
  localUri: string;
  bucket: string;
  remotePath: string;
  entityType: 'business' | 'place' | 'catalogue_suggestion' | 'chat';
  entityId: string;
  mediaType: string;
  status: MediaUploadStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncConflict {
  id: string;
  tableName: string;
  recordId: string;
  localVersion: number;
  serverVersion: number;
  localPayload: Record<string, unknown>;
  serverPayload: Record<string, unknown>;
  conflictDetectedAt: string;
  resolutionStatus: 'unresolved' | 'resolved';
}

// 10. Navigation Screen Route Names
export type AppRoute =
  | 'splash'
  | 'sign_in'
  | 'register'
  | 'verify_account'
  | 'forgot_password'
  | 'reset_password'
  | 'home'
  | 'map'
  | 'missions'
  | 'chat'
  | 'more'
  | 'notifications'
  | 'offline'
  | 'revisits'
  | 'guide'
  | 'profile'
  | 'admin';
