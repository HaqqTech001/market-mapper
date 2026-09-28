import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Store,
  Tag,
  ShoppingBag,
  Wrench,
  Sparkles,
  Camera,
  Check,
  Plus,
  Search,
  AlertTriangle,
  Info,
  MapPin,
  RotateCcw,
  Phone,
  User,
  CheckCircle2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Compass,
} from 'lucide-react';
import {
  Business,
  BusinessType,
  PhysicalStructure,
  BusinessActivity,
  BusinessStability,
  LocationRelationship,
  LocationSource,
  BusinessOffering,
  OfferingSource,
  TraderInteractionStatus,
  BusinessRevisitReason,
  PhotoCaptureState,
  LocalMediaRecord,
  Category,
  CatalogueItemType,
  LocationCoordinates,
  RelativeBusinessPosition,
} from '../../types';
import {
  proposeBusinessCoordinate,
  resolveDirectionProvenance,
  DirectionProvenance,
  HeadingSource,
  DirectionConfidence,
} from '../../lib/location/positionProposal';
import { BusinessRepository } from '../../db/repositories/BusinessRepository';
import { CatalogueRepository, SearchableOfferItem } from '../../db/repositories/CatalogueRepository';
import { optimizeStorefrontPhoto } from '../../lib/media/imageOptimizer';
import { calculateBusinessCompleteness } from '../../lib/business/completeness';
import { useResponsive } from '../../hooks/useResponsive';

export interface BusinessCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (business: Business) => void;
  currentLocation: LocationCoordinates | null;
  activeMissionId: string;
  activeMarketId?: string;
  currentUser?: { id: string; name: string };
  initialEditingBusiness?: Business | null;
  isRecordingActive?: boolean;
  recordingStatus?: 'recording' | 'paused' | 'idle' | 'reviewing' | 'starting' | 'saving' | 'discarded';
  parentPathSessionId?: string;
  currentHeading?: number | null;
  recentPathPoints?: Array<{ latitude: number; longitude: number; timestamp?: string | number }>;
  deviceSpeed?: number | null;
}

const DRAFT_STORAGE_KEY = 'mm_business_capture_draft';

export const BusinessCaptureModal: React.FC<BusinessCaptureModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  currentLocation,
  activeMissionId,
  activeMarketId = 'market_alaba_01',
  currentUser,
  initialEditingBusiness,
  isRecordingActive,
  recordingStatus,
  parentPathSessionId,
  currentHeading,
  recentPathPoints,
  deviceSpeed,
}) => {
  const responsive = useResponsive();

  // 4 Steps: 1 = Classification & Location, 2 = Details, 3 = Offers, 4 = Finish/Media
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Operational Label
  const [operationalLabel, setOperationalLabel] = useState<string>('B001');

  // Step 1 State: Classification & Location
  const [businessType, setBusinessType] = useState<BusinessType>('shop');
  const [physicalStructure, setPhysicalStructure] = useState<PhysicalStructure | undefined>('lockup_stall');
  const [activity, setActivity] = useState<BusinessActivity>('sells_goods');
  const [locationRelationship, setLocationRelationship] = useState<LocationRelationship>('general_inside_market');
  const [latitude, setLatitude] = useState<number>(currentLocation?.latitude || 6.4698);
  const [longitude, setLongitude] = useState<number>(currentLocation?.longitude || 3.1925);
  const [locationSource, setLocationSource] = useState<LocationSource>('current_gps');
  const [locationAccuracy, setLocationAccuracy] = useState<number | undefined>(currentLocation?.accuracy);
  const [originalCoords, setOriginalCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation?.latitude || 6.4698,
    lng: currentLocation?.longitude || 3.1925,
  });

  // Relative Business Position (Left / Right / Ahead / Unclear)
  const [relativePosition, setRelativePosition] = useState<RelativeBusinessPosition>('right');
  const [proposedCoords, setProposedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [confidenceAdvisory, setConfidenceAdvisory] = useState<string | null>(null);
  const [mapHighlightRing, setMapHighlightRing] = useState<boolean>(false);

  // Direction Provenance State (Movement > Compass > None)
  const [directionProvenance, setDirectionProvenance] = useState<DirectionProvenance>(() =>
    resolveDirectionProvenance({
      recentPoints: recentPathPoints,
      deviceHeading: currentHeading,
      deviceSpeed: deviceSpeed ?? currentLocation?.speed,
      deviceAccuracy: currentLocation?.accuracy,
    })
  );

  // Update direction provenance when context shifts
  useEffect(() => {
    if (isOpen) {
      const prov = resolveDirectionProvenance({
        recentPoints: recentPathPoints,
        deviceHeading: currentHeading,
        deviceSpeed: deviceSpeed ?? currentLocation?.speed,
        deviceAccuracy: currentLocation?.accuracy,
      });
      setDirectionProvenance(prov);
    }
  }, [isOpen, recentPathPoints, currentHeading, deviceSpeed, currentLocation]);

  const handleSelectRelativePosition = (pos: RelativeBusinessPosition) => {
    setRelativePosition(pos);
    if (pos === 'unclear') {
      setLatitude(originalCoords.lat);
      setLongitude(originalCoords.lng);
      setProposedCoords(null);
      setLocationSource('current_gps');
      setConfidenceAdvisory(null);
    } else {
      const prop = proposeBusinessCoordinate(
        originalCoords.lat,
        originalCoords.lng,
        {
          recentPoints: recentPathPoints,
          deviceHeading: currentHeading,
          deviceSpeed: deviceSpeed ?? currentLocation?.speed,
          deviceAccuracy: currentLocation?.accuracy,
        },
        pos,
        4.0
      );
      setProposedCoords({ lat: prop.latitude, lng: prop.longitude });
      setDirectionProvenance({
        heading: prop.offsetHeadingDegrees,
        source: prop.headingSource,
        confidence: prop.directionConfidence,
        description: prop.confidenceAdvisory || '',
      });

      // If direction confidence is poor: show business at current GPS position and encourage Adjust on Map!
      // Do NOT generate a confident false side position!
      if (prop.directionConfidence === 'low' || prop.directionConfidence === 'none') {
        setLatitude(originalCoords.lat);
        setLongitude(originalCoords.lng);
        setLocationSource('current_gps');
        setConfidenceAdvisory(
          prop.confidenceAdvisory ||
            'Direction confidence is low. Pin remains at current GPS position. Tap "Adjust on Map" to place accurately.'
        );
      } else {
        setLatitude(prop.latitude);
        setLongitude(prop.longitude);
        setLocationSource('relative_side_proposal');
        setConfidenceAdvisory(null);
      }
    }
  };

  const handleAdjustOnMap = () => {
    setLocationSource('manual_adjustment');
    setMapHighlightRing(true);
    setTimeout(() => setMapHighlightRing(false), 2500);
    mapCanvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Step 1 Interactive Pin-Adjustment Mini-Map Viewport State
  const [mapZoom, setMapZoom] = useState<number>(18.5);
  const [mapPanOffset, setMapPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const isMapDraggingRef = useRef<boolean>(false);
  const mapDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchDistRef = useRef<number | null>(null);

  // Step 2 State: Details & Structure
  const [name, setName] = useState<string>('');
  const [hasNoVisibleName, setHasNoVisibleName] = useState<boolean>(false);
  const [stallNumber, setStallNumber] = useState<string>('');
  const [lineName, setLineName] = useState<string>('');
  const [rowLine, setRowLine] = useState<string>('');
  const [block, setBlock] = useState<string>('');
  const [floor, setFloor] = useState<string>('Ground Floor');
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>('cat_foodstuffs');

  // Step 3 State: Goods & Services Offerings
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [offerTypeFilter, setOfferTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [searchResults, setSearchResults] = useState<SearchableOfferItem[]>([]);
  const [selectedOfferings, setSelectedOfferings] = useState<
    Array<{
      id?: string;
      catalogueItemId?: string;
      pendingSuggestionId?: string;
      catalogueItemName: string;
      itemType: CatalogueItemType;
      howEstablished: OfferingSource;
      isPendingSuggestion?: boolean;
    }>
  >([]);

  // Suggest New Item Dialog
  const [showSuggestModal, setShowSuggestModal] = useState<boolean>(false);
  const [suggestName, setSuggestName] = useState<string>('');
  const [suggestType, setSuggestType] = useState<CatalogueItemType>('product');
  const [suggestNotes, setSuggestNotes] = useState<string>('');

  // Step 4 State: Media & Finish
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<PhotoCaptureState>('not_captured');
  const [photoDeclined, setPhotoDeclined] = useState<boolean>(false);
  const [photoDeclineReason, setPhotoDeclineReason] = useState<string>('');
  const [photoMeta, setPhotoMeta] = useState<{ sizeKb?: number; width?: number; height?: number } | null>(null);
  const [stagedMediaRecord, setStagedMediaRecord] = useState<LocalMediaRecord | undefined>(undefined);
  const [stability, setStability] = useState<BusinessStability>('unknown');
  const [traderName, setTraderName] = useState<string>('');
  const [traderPhone, setTraderPhone] = useState<string>('');
  const [traderStatus, setTraderStatus] = useState<TraderInteractionStatus | ''>('');
  const [notes, setNotes] = useState<string>('');

  // Revisit
  const [revisitNeeded, setRevisitNeeded] = useState<boolean>(false);
  const [revisitReason, setRevisitReason] = useState<BusinessRevisitReason>('details_missing');
  const [revisitNotes, setRevisitNotes] = useState<string>('');

  // Duplicate warning detection
  const [duplicateWarning, setDuplicateWarning] = useState<{ business: Business; reason: string; distanceMeters: number } | null>(null);

  // Draft recovery state
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(false);

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load next operational label and initial categories on open
  useEffect(() => {
    if (!isOpen) return;

    if (!initialEditingBusiness) {
      try {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.name || parsed.stallNumber || (parsed.selectedOfferings && parsed.selectedOfferings.length > 0))) {
            setHasSavedDraft(true);
          }
        }
      } catch (err) {
        console.warn('Could not read saved draft', err);
      }
    }

    if (initialEditingBusiness) {
      setOperationalLabel(initialEditingBusiness.operationalLabel);
      setBusinessType(initialEditingBusiness.businessType);
      setPhysicalStructure(initialEditingBusiness.physicalStructure);
      setActivity(initialEditingBusiness.activity);
      setLocationRelationship(initialEditingBusiness.locationRelationship || 'general_inside_market');
      setLatitude(initialEditingBusiness.latitude);
      setLongitude(initialEditingBusiness.longitude);
      setLocationSource(initialEditingBusiness.locationSource || 'manual_adjustment');
      setName(initialEditingBusiness.name || '');
      setHasNoVisibleName(initialEditingBusiness.hasNoVisibleName);
      setStallNumber(initialEditingBusiness.stallNumber || '');
      setLineName(initialEditingBusiness.lineName || '');
      setRowLine(initialEditingBusiness.rowLine || '');
      setBlock(initialEditingBusiness.block || '');
      setFloor(initialEditingBusiness.floor || 'Ground Floor');
      setPrimaryCategoryId(initialEditingBusiness.primaryCategoryId || 'cat_foodstuffs');
      setStability(initialEditingBusiness.stability || 'unknown');
      setPhotoUri(initialEditingBusiness.localPhotoUri || null);
      setPhotoDeclined(initialEditingBusiness.photoDeclined);
      setPhotoState(initialEditingBusiness.photoState || (initialEditingBusiness.localPhotoUri ? 'captured' : initialEditingBusiness.photoDeclined ? 'declined' : 'not_captured'));
      setTraderName(initialEditingBusiness.ownerName || '');
      setTraderPhone(initialEditingBusiness.phone || '');
      setNotes(initialEditingBusiness.notes || '');
      setRevisitNeeded(Boolean(initialEditingBusiness.revisitNeeded));
      setRevisitReason(initialEditingBusiness.revisitReason || 'details_missing');
      setRevisitNotes(initialEditingBusiness.revisitNotes || '');

      if (initialEditingBusiness.offerings) {
        setSelectedOfferings(
          initialEditingBusiness.offerings.map((o) => ({
            catalogueItemId: o.catalogueItemId,
            pendingSuggestionId: o.pendingSuggestionId,
            catalogueItemName: o.catalogueItemName || 'Item',
            itemType: o.itemType || 'product',
            howEstablished: o.howEstablished || 'observed',
          }))
        );
      }
    } else {
      const mapperScope = currentUser?.name ? currentUser.name.slice(0, 3).toUpperCase() : 'M01';
      BusinessRepository.getNextOperationalLabel(activeMarketId, mapperScope).then((label) => {
        setOperationalLabel(label);
      });
      if (currentLocation) {
        setLatitude(currentLocation.latitude);
        setLongitude(currentLocation.longitude);
        setLocationAccuracy(currentLocation.accuracy);
        setLocationSource('current_gps');
        setOriginalCoords({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      }
    }

    CatalogueRepository.getAllCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !initialEditingBusiness?.primaryCategoryId) {
        setPrimaryCategoryId(cats[0].id);
      }
    });
  }, [isOpen, initialEditingBusiness, activeMarketId, currentUser, currentLocation]);

  // Save draft
  useEffect(() => {
    if (!isOpen || initialEditingBusiness) return;
    const draftPayload = {
      operationalLabel,
      businessType,
      physicalStructure,
      activity,
      locationRelationship,
      latitude,
      longitude,
      name,
      hasNoVisibleName,
      stallNumber,
      lineName,
      rowLine,
      block,
      floor,
      primaryCategoryId,
      selectedOfferings,
      stability,
      traderName,
      traderPhone,
      traderStatus,
      notes,
      revisitNeeded,
      revisitReason,
      revisitNotes,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch {}
  }, [
    isOpen,
    initialEditingBusiness,
    operationalLabel,
    businessType,
    physicalStructure,
    activity,
    locationRelationship,
    latitude,
    longitude,
    name,
    hasNoVisibleName,
    stallNumber,
    lineName,
    rowLine,
    block,
    floor,
    primaryCategoryId,
    selectedOfferings,
    stability,
    traderName,
    traderPhone,
    traderStatus,
    notes,
    revisitNeeded,
    revisitReason,
    revisitNotes,
  ]);

  const handleRestoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d.businessType) setBusinessType(d.businessType);
        if (d.physicalStructure) setPhysicalStructure(d.physicalStructure);
        if (d.activity) setActivity(d.activity);
        if (d.locationRelationship) setLocationRelationship(d.locationRelationship);
        if (d.name) setName(d.name);
        if (d.hasNoVisibleName !== undefined) setHasNoVisibleName(d.hasNoVisibleName);
        if (d.stallNumber) setStallNumber(d.stallNumber);
        if (d.lineName) setLineName(d.lineName);
        if (d.rowLine) setRowLine(d.rowLine);
        if (d.block) setBlock(d.block);
        if (d.floor) setFloor(d.floor);
        if (d.primaryCategoryId) setPrimaryCategoryId(d.primaryCategoryId);
        if (d.selectedOfferings) setSelectedOfferings(d.selectedOfferings);
        if (d.stability) setStability(d.stability);
        if (d.traderName) setTraderName(d.traderName);
        if (d.traderPhone) setTraderPhone(d.traderPhone);
        if (d.traderStatus) setTraderStatus(d.traderStatus);
        if (d.notes) setNotes(d.notes);
        if (d.revisitNeeded !== undefined) setRevisitNeeded(d.revisitNeeded);
        if (d.revisitReason) setRevisitReason(d.revisitReason);
        if (d.revisitNotes) setRevisitNotes(d.revisitNotes);
        setHasSavedDraft(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismissDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setHasSavedDraft(false);
  };

  // Search catalogue items for Step 3
  useEffect(() => {
    let isCancelled = false;
    CatalogueRepository.search(searchQuery, primaryCategoryId).then((results) => {
      if (!isCancelled) {
        let filtered = results;
        if (offerTypeFilter !== 'all') {
          filtered = results.filter((r) => r.itemType === offerTypeFilter);
        }
        setSearchResults(filtered);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [searchQuery, offerTypeFilter, primaryCategoryId]);

  // Live duplicate checking
  useEffect(() => {
    let isCancelled = false;
    if (stallNumber.trim() || name.trim()) {
      BusinessRepository.findNearbyDuplicates(
        latitude,
        longitude,
        8.0,
        stallNumber.trim() || undefined,
        name.trim() || undefined,
        initialEditingBusiness?.id
      ).then((dups) => {
        if (!isCancelled) {
          if (dups.length > 0) {
            setDuplicateWarning(dups[0]);
          } else {
            setDuplicateWarning(null);
          }
        }
      });
    } else {
      setDuplicateWarning(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [stallNumber, name, latitude, longitude, initialEditingBusiness]);

  // Step 1: Coordinates fine-tuning
  const handleNudge = (dLat: number, dLng: number) => {
    setLatitude((l) => Number((l + dLat).toFixed(6)));
    setLongitude((l) => Number((l + dLng).toFixed(6)));
    setLocationSource('manual_adjustment');
  };

  const handleResetCoords = () => {
    setLatitude(originalCoords.lat);
    setLongitude(originalCoords.lng);
    setLocationSource('current_gps');
    setMapPanOffset({ x: 0, y: 0 });
  };

  // Step 1: Mini-map direct tap / drag to adjust pin location
  const mapScale = useMemo(() => Math.pow(2, mapZoom) * 2.2, [mapZoom]);
  const miniMapCenter = useMemo(() => ({ lat: originalCoords.lat, lng: originalCoords.lng }), [originalCoords]);

  const projectMiniMapCoord = useCallback(
    (lat: number, lng: number) => {
      const dLat = lat - miniMapCenter.lat;
      const dLng = lng - miniMapCenter.lng;
      const cosLat = Math.cos((miniMapCenter.lat * Math.PI) / 180);
      const width = 340;
      const height = 180;
      const x = width / 2 + dLng * mapScale * cosLat + mapPanOffset.x;
      const y = height / 2 - dLat * mapScale + mapPanOffset.y;
      return { x, y };
    },
    [miniMapCenter, mapScale, mapPanOffset]
  );

  const unprojectMiniMapCoord = useCallback(
    (pixelX: number, pixelY: number) => {
      const width = 340;
      const height = 180;
      const cosLat = Math.cos((miniMapCenter.lat * Math.PI) / 180);
      const relX = pixelX - width / 2 - mapPanOffset.x;
      const relY = pixelY - height / 2 - mapPanOffset.y;
      const dLng = relX / (mapScale * cosLat);
      const dLat = -relY / mapScale;
      return {
        lat: Number((miniMapCenter.lat + dLat).toFixed(6)),
        lng: Number((miniMapCenter.lng + dLng).toFixed(6)),
      };
    },
    [miniMapCenter, mapScale, mapPanOffset]
  );

  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapCanvasRef.current) return;
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const newCoords = unprojectMiniMapCoord(clickX, clickY);
    setLatitude(newCoords.lat);
    setLongitude(newCoords.lng);
    setLocationSource('manual_adjustment');
  };

  const handleMiniMapMouseDown = (e: React.MouseEvent) => {
    isMapDraggingRef.current = true;
    mapDragStartRef.current = { x: e.clientX - mapPanOffset.x, y: e.clientY - mapPanOffset.y };
  };

  const handleMiniMapMouseMove = (e: React.MouseEvent) => {
    if (!isMapDraggingRef.current) return;
    setMapPanOffset({
      x: e.clientX - mapDragStartRef.current.x,
      y: e.clientY - mapDragStartRef.current.y,
    });
  };

  const handleMiniMapMouseUp = () => {
    isMapDraggingRef.current = false;
  };

  const handleMiniMapWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.3 : -0.3;
    setMapZoom((z) => Math.min(Math.max(z + delta, 16.5), 21.0));
  };

  const handleTouchStartMiniMap = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isMapDraggingRef.current = true;
      mapDragStartRef.current = {
        x: e.touches[0].clientX - mapPanOffset.x,
        y: e.touches[0].clientY - mapPanOffset.y,
      };
      pinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      isMapDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMoveMiniMap = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isMapDraggingRef.current) {
      setMapPanOffset({
        x: e.touches[0].clientX - mapDragStartRef.current.x,
        y: e.touches[0].clientY - mapDragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const diff = dist - pinchDistRef.current;
      if (Math.abs(diff) > 4) {
        setMapZoom((z) => Math.min(Math.max(z + (diff > 0 ? 0.05 : -0.05), 16.5), 21.0));
        pinchDistRef.current = dist;
      }
    }
  };

  const handleTouchEndMiniMap = () => {
    isMapDraggingRef.current = false;
    pinchDistRef.current = null;
  };

  // Calculate distance between original GPS coordinate and adjusted coordinate
  const adjustmentDistanceMeters = useMemo(() => {
    const dLat = (latitude - originalCoords.lat) * 111111;
    const dLng = (longitude - originalCoords.lng) * 111111 * Math.cos((originalCoords.lat * Math.PI) / 180);
    return Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;
  }, [latitude, longitude, originalCoords]);

  // Step 3 Offering management
  const handleAddOffering = (item: SearchableOfferItem) => {
    if (selectedOfferings.some((o) => o.catalogueItemId === item.id || o.pendingSuggestionId === item.id)) {
      return;
    }
    setSelectedOfferings((prev) => [
      ...prev,
      {
        catalogueItemId: item.isPendingSuggestion ? undefined : item.id,
        pendingSuggestionId: item.isPendingSuggestion ? item.id : undefined,
        catalogueItemName: item.name,
        itemType: item.itemType,
        howEstablished: 'observed',
        isPendingSuggestion: Boolean(item.isPendingSuggestion),
      },
    ]);
  };

  const handleRemoveOffering = (index: number) => {
    setSelectedOfferings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleObservation = (index: number) => {
    setSelectedOfferings((prev) =>
      prev.map((off, i) => {
        if (i !== index) return off;
        const nextEstablished: OfferingSource =
          off.howEstablished === 'observed'
            ? 'trader_confirmed'
            : off.howEstablished === 'trader_confirmed'
            ? 'both'
            : off.howEstablished === 'both'
            ? 'other'
            : 'observed';
        return { ...off, howEstablished: nextEstablished };
      })
    );
  };

  // Offline catalogue suggestion submission
  const handleCreateSuggestion = async () => {
    if (!suggestName.trim()) return;
    const suggestion = await CatalogueRepository.suggestNewItem({
      name: suggestName.trim(),
      itemType: suggestType,
      notes: suggestNotes.trim() || undefined,
      suggestedBy: currentUser?.name || 'Mapper',
    });

    setSelectedOfferings((prev) => [
      ...prev,
      {
        catalogueItemId: 'custom',
        pendingSuggestionId: suggestion.id,
        catalogueItemName: suggestion.name,
        itemType: suggestion.itemType,
        howEstablished: 'trader_confirmed',
        isPendingSuggestion: true,
      },
    ]);

    setSuggestName('');
    setSuggestNotes('');
    setShowSuggestModal(false);
  };

  // Step 4: Photo capture and local compression
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimized = await optimizeStorefrontPhoto(file, 1280);
      setPhotoUri(optimized.localUri);
      setPhotoState('captured');
      setPhotoDeclined(false);
      setPhotoDeclineReason('');
      setPhotoMeta({
        sizeKb: Math.round(optimized.fileSize / 1024),
        width: optimized.width,
        height: optimized.height,
      });

      const mediaRec: LocalMediaRecord = {
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerUserId: currentUser?.id || 'usr_local',
        entityType: 'business',
        entityId: initialEditingBusiness?.id || 'pending',
        mediaType: 'photo',
        localUri: optimized.localUri,
        thumbnailUri: optimized.thumbnailUri,
        mimeType: optimized.mimeType,
        width: optimized.width,
        height: optimized.height,
        fileSize: optimized.fileSize,
        captureSource: 'camera',
        uploadStatus: 'local_only',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setStagedMediaRecord(mediaRec);
    } catch (err) {
      console.error('Error optimizing photo:', err);
    }
  };

  const handleDeclinePhoto = (reason: string) => {
    setPhotoDeclined(true);
    setPhotoState('declined');
    setPhotoDeclineReason(reason);
    setPhotoUri(null);
    setPhotoMeta(null);
    setStagedMediaRecord(undefined);
  };

  const handleUnablePhoto = (reason: string) => {
    setPhotoState('unable');
    setPhotoDeclineReason(reason);
    setPhotoUri(null);
    setPhotoMeta(null);
    setStagedMediaRecord(undefined);
  };

  // Real-time completeness calculation
  const currentCompleteness = useMemo(() => {
    const candidate: Partial<Business> = {
      name: hasNoVisibleName ? undefined : name,
      hasNoVisibleName,
      stallNumber,
      lineName,
      businessType,
      primaryCategoryId,
      activity,
      stability,
      localPhotoUri: photoUri || undefined,
      photoDeclined,
      photoState,
      offerings: selectedOfferings.map((o) => ({
        id: o.id || `off_${Math.random()}`,
        businessId: 'pending',
        catalogueItemId: o.catalogueItemId || 'custom',
        pendingSuggestionId: o.pendingSuggestionId,
        catalogueItemName: o.catalogueItemName,
        itemType: o.itemType,
        howEstablished: o.howEstablished,
        createdAt: new Date().toISOString(),
      })),
      ownerName: traderName,
      phone: traderPhone,
      latitude,
      longitude,
    };
    return calculateBusinessCompleteness(candidate);
  }, [
    name,
    hasNoVisibleName,
    stallNumber,
    lineName,
    businessType,
    primaryCategoryId,
    activity,
    stability,
    photoUri,
    photoDeclined,
    photoState,
    selectedOfferings,
    traderName,
    traderPhone,
    latitude,
    longitude,
  ]);

  // Save & Add Next or Save & Close
  const handleSave = async (addNext: boolean = false) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const bizId = initialEditingBusiness?.id || `biz_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const businessData: Business = {
        id: bizId,
        marketId: activeMarketId,
        missionId: activeMissionId,
        operationalLabel,
        name: hasNoVisibleName ? undefined : name.trim() || undefined,
        hasNoVisibleName,
        stallNumber: stallNumber.trim() || undefined,
        lineName: lineName.trim() || undefined,
        rowLine: rowLine.trim() || undefined,
        block: block.trim() || undefined,
        floor: floor || 'Ground Floor',
        businessType,
        physicalStructure,
        primaryCategoryId,
        activity,
        stability,
        locationRelationship,
        latitude,
        longitude,
        locationAccuracy,
        locationSource,
        originalLatitude: originalCoords.lat,
        originalLongitude: originalCoords.lng,
        relativePosition: relativePosition || undefined,
        capturedHeading: directionProvenance.heading ?? currentHeading ?? null,
        headingSource: directionProvenance.source,
        directionConfidence: directionProvenance.confidence,
        parentPathSessionId: parentPathSessionId || undefined,
        proposedLatitude: proposedCoords?.lat ?? undefined,
        proposedLongitude: proposedCoords?.lng ?? undefined,
        localPhotoUri: photoUri || undefined,
        photoDeclined,
        photoState,
        ownerName: traderName.trim() || undefined,
        phone: traderPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        revisitNeeded,
        revisitReason: revisitNeeded ? revisitReason : undefined,
        revisitNotes: revisitNeeded ? revisitNotes.trim() : undefined,
        completenessScore: currentCompleteness.score,
        status: revisitNeeded ? 'needs_revisit' : 'pending',
        version: initialEditingBusiness?.version || 1,
        createdBy: initialEditingBusiness?.createdBy || currentUser?.id || 'mapper_local',
        updatedBy: currentUser?.id || 'mapper_local',
        createdAt: initialEditingBusiness?.createdAt || now,
        updatedAt: now,
        clientCreatedAt: initialEditingBusiness?.clientCreatedAt || now,
        isDeleted: false,
        syncStatus: 'local_only',
      };

      const offeringsData = selectedOfferings.map((o) => ({
        catalogueItemId: o.catalogueItemId || 'custom',
        pendingSuggestionId: o.pendingSuggestionId,
        catalogueItemName: o.catalogueItemName,
        itemType: o.itemType,
        howEstablished: o.howEstablished,
      }));

      const revisitRecord = revisitNeeded
        ? {
            reason: revisitReason,
            notes: revisitNotes.trim() || undefined,
            flaggedBy: currentUser?.id || 'mapper_local',
          }
        : undefined;

      let saved: Business;
      if (initialEditingBusiness) {
        saved = await BusinessRepository.update(
          businessData,
          offeringsData,
          stagedMediaRecord,
          revisitRecord
        );
      } else {
        saved = await BusinessRepository.create(
          businessData,
          offeringsData,
          stagedMediaRecord,
          revisitRecord
        );
      }

      // Clear draft storage
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      onSaved(saved);

      if (addNext) {
        // Preserve spatial context: increment label, keep lineName, floor, primaryCategory, clear shop-specific details
        const mapperScope = currentUser?.name ? currentUser.name.slice(0, 3).toUpperCase() : 'M01';
        const nextLabel = await BusinessRepository.getNextOperationalLabel(activeMarketId, mapperScope);

        setOperationalLabel(nextLabel);
        setName('');
        setHasNoVisibleName(false);
        setStallNumber('');
        setSelectedOfferings([]);
        setPhotoUri(null);
        setPhotoState('not_captured');
        setPhotoDeclined(false);
        setPhotoDeclineReason('');
        setPhotoMeta(null);
        setStagedMediaRecord(undefined);
        setTraderName('');
        setTraderPhone('');
        setNotes('');
        setRevisitNeeded(false);
        setRevisitNotes('');
        setStep(1);
        setSaveSuccessNotice(`Saved ${saved.operationalLabel}! Ready for next business.`);
        setTimeout(() => setSaveSuccessNotice(null), 3000);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save business:', err);
      alert('Error saving business data to local SQLite database. Please check field inputs.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentPinScreenPt = projectMiniMapCoord(latitude, longitude);
  const gpsScreenPt = projectMiniMapCoord(originalCoords.lat, originalCoords.lng);

  return (
    <div
      id="business-capture-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden text-slate-900"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-sm">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  {initialEditingBusiness ? 'Edit Mapped Business' : 'Map Business / Stall'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono font-bold">
                  {operationalLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Step {step} of 4 · {step === 1 ? 'Classification & Location' : step === 2 ? 'Details & Structure' : step === 3 ? 'Goods & Services' : 'Finish & Storefront'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Path Recording Indicator Badge (Small, Unobtrusive) */}
            {(isRecordingActive || recordingStatus === 'recording' || recordingStatus === 'paused') && (
              <div
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                  recordingStatus === 'paused'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
                title="Path recording session remains active in background"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    recordingStatus === 'paused' ? 'bg-amber-600' : 'bg-emerald-600 animate-pulse'
                  }`}
                />
                <span>{recordingStatus === 'paused' ? 'Path recording paused' : 'Path recording active'}</span>
              </div>
            )}

            {/* Completeness Score Badge */}
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                currentCompleteness.tier === 'comprehensive'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : currentCompleteness.tier === 'standard'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
              title={`Completeness: ${currentCompleteness.score}% (${currentCompleteness.tier})`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>{currentCompleteness.score}%</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Progress Bar (Outdoor Daylight High Contrast) */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-100/90 text-center text-xs font-bold">
          {[
            { s: 1, label: 'Type & Pin' },
            { s: 2, label: 'Details' },
            { s: 3, label: 'Offerings' },
            { s: 4, label: 'Finish' },
          ].map((item) => {
            const isCompleted = step > item.s;
            const isCurrent = step === item.s;
            return (
              <button
                key={item.s}
                type="button"
                onClick={() => setStep(item.s as any)}
                className={`py-2.5 px-1 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
                  isCurrent
                    ? 'border-emerald-700 bg-white text-emerald-800 font-black'
                    : isCompleted
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                    isCurrent
                      ? 'bg-emerald-700 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {isCompleted ? '✓' : item.s}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Saved Notice Banner */}
        {saveSuccessNotice && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-inner">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        {/* Draft Recovery Notice Banner */}
        {hasSavedDraft && !initialEditingBusiness && (
          <div className="bg-amber-50 border-b border-amber-300 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You have an unfinished business draft saved locally.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={handleDismissDraft}
                className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Duplicate Warning Banner */}
        {duplicateWarning && (
          <div className="bg-rose-50 border-b border-rose-300 px-4 py-2.5 text-xs text-rose-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Possible Duplicate Detected:</strong> {duplicateWarning.reason} (
              {duplicateWarning.business.operationalLabel} · {Math.round(duplicateWarning.distanceMeters)}m away). You
              can still proceed if this is a distinct business.
            </div>
          </div>
        )}

        {/* Modal Body Content (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {/* ================= STEP 1: CLASSIFICATION & LOCATION ================= */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Quick Relative Business Position Selector */}
              <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-700" />
                    <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Business Position
                    </label>
                  </div>
                  {/* Provenance badge */}
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      directionProvenance.confidence === 'high'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : directionProvenance.confidence === 'medium'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                    title={directionProvenance.description}
                  >
                    Heading:{' '}
                    {directionProvenance.source === 'movement_vector'
                      ? 'Path Motion'
                      : directionProvenance.source === 'compass'
                      ? 'Compass'
                      : 'Unknown'}
                  </span>
                </div>

                {/* 5-Choice Position Selector Grid with Large Touch Targets */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectRelativePosition('left')}
                    className={`p-3 min-h-[48px] text-xs font-bold rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      relativePosition === 'left' && locationSource !== 'manual_adjustment'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500/40'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-black">Left</span>
                    <span className="text-[10px] font-medium opacity-80">-90° Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectRelativePosition('right')}
                    className={`p-3 min-h-[48px] text-xs font-bold rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      relativePosition === 'right' && locationSource !== 'manual_adjustment'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500/40'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-black">Right</span>
                    <span className="text-[10px] font-medium opacity-80">+90° Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectRelativePosition('ahead')}
                    className={`p-3 min-h-[48px] text-xs font-bold rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      relativePosition === 'ahead' && locationSource !== 'manual_adjustment'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500/40'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-black">Ahead / End</span>
                    <span className="text-[10px] font-medium opacity-80">Front</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAdjustOnMap}
                    className={`p-3 min-h-[48px] text-xs font-bold rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      locationSource === 'manual_adjustment'
                        ? 'bg-indigo-700 text-white border-indigo-800 shadow-md ring-2 ring-indigo-500/40'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300'
                    }`}
                  >
                    <span className="text-sm font-black">Adjust on Map</span>
                    <span className="text-[10px] font-medium opacity-80">Drag Pin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectRelativePosition('unclear')}
                    className={`p-3 min-h-[48px] text-xs font-bold rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      relativePosition === 'unclear' && locationSource !== 'manual_adjustment'
                        ? 'bg-slate-800 text-white border-slate-900 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-black">Unclear</span>
                    <span className="text-[10px] font-medium opacity-80">GPS Direct</span>
                  </button>
                </div>

                {/* Direction Confidence Advisory (Prevents False Confident Positions) */}
                {confidenceAdvisory && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 flex items-start gap-2 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Notice: </span>
                      {confidenceAdvisory}
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Location Adjuster & Canopy Mini-Map */}
              <div
                className={`p-4 rounded-xl bg-white border space-y-3 transition-all duration-300 ${
                  mapHighlightRing
                    ? 'border-indigo-500 ring-4 ring-indigo-400/40 shadow-lg'
                    : 'border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Business Map Position
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      locationSource === 'manual_adjustment'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {locationSource === 'manual_adjustment'
                      ? `Adjusted (${adjustmentDistanceMeters}m from GPS)`
                      : 'Live GPS Fix'}
                  </span>
                </div>

                {/* Interactive Mini-Map Canvas (Tap to place / Drag to Pan / Wheel or Pinch to Zoom) */}
                <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-100">
                  <div
                    ref={mapCanvasRef}
                    onClick={handleMiniMapClick}
                    onMouseDown={handleMiniMapMouseDown}
                    onMouseMove={handleMiniMapMouseMove}
                    onMouseUp={handleMiniMapMouseUp}
                    onMouseLeave={handleMiniMapMouseUp}
                    onTouchStart={handleTouchStartMiniMap}
                    onTouchMove={handleTouchMoveMiniMap}
                    onTouchEnd={handleTouchEndMiniMap}
                    onWheel={handleMiniMapWheel}
                    className="h-44 w-full relative cursor-crosshair select-none overflow-hidden"
                    title="Tap anywhere to position business pin, drag to pan, pinch/wheel to zoom"
                  >
                    {/* Vector Grid Background */}
                    <svg className="w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="mini-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#mini-grid)" />

                      {/* GPS Origin Halo */}
                      <circle
                        cx={gpsScreenPt.x}
                        cy={gpsScreenPt.y}
                        r="16"
                        fill="rgba(37, 99, 235, 0.15)"
                        stroke="#2563eb"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                      <circle cx={gpsScreenPt.x} cy={gpsScreenPt.y} r="5" fill="#2563eb" />

                      {/* Connecting Line if moved */}
                      {locationSource === 'manual_adjustment' && (
                        <line
                          x1={gpsScreenPt.x}
                          y1={gpsScreenPt.y}
                          x2={currentPinScreenPt.x}
                          y2={currentPinScreenPt.y}
                          stroke="#2563eb"
                          strokeWidth="2"
                          strokeDasharray="4,3"
                        />
                      )}
                    </svg>

                    {/* Adjusted Business Pin */}
                    <div
                      style={{
                        left: `${currentPinScreenPt.x}px`,
                        top: `${currentPinScreenPt.y}px`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
                    >
                      <div className="w-7 h-7 rounded-full bg-emerald-700 text-white border-2 border-white shadow-lg flex items-center justify-center animate-bounce">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-mono font-bold shadow-sm whitespace-nowrap -mt-0.5">
                        {operationalLabel}
                      </span>
                    </div>

                    {/* Mini-Map Instructions Overlay */}
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-md px-2 py-1 text-[10px] text-slate-700 font-medium pointer-events-none">
                      Tap map or use buttons below
                    </div>

                    {/* Mini-Map Zoom Controls */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapZoom((z) => Math.min(z + 0.5, 21.0));
                        }}
                        className="w-7 h-7 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center shadow-sm cursor-pointer"
                        title="Zoom in"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapZoom((z) => Math.max(z - 0.5, 16.5));
                        }}
                        className="w-7 h-7 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center shadow-sm cursor-pointer"
                        title="Zoom out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Coordinates Readout */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-bold">LATITUDE</span>
                    <span className="font-mono text-slate-900 font-bold">{latitude.toFixed(6)}°</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-bold">LONGITUDE</span>
                    <span className="font-mono text-slate-900 font-bold">{longitude.toFixed(6)}°</span>
                  </div>
                </div>

                {/* Canopy Nudge Controls (±2m fine-tuning under zinc roofs) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-600 font-medium">Fine-tune Position (±2m N/S/E/W):</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNudge(0.00002, 0)}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer active:scale-95"
                      title="Nudge North 2m"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudge(-0.00002, 0)}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer active:scale-95"
                      title="Nudge South 2m"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudge(0, -0.00002)}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer active:scale-95"
                      title="Nudge West 2m"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudge(0, 0.00002)}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer active:scale-95"
                      title="Nudge East 2m"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCoords}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 ml-1 cursor-pointer"
                      title="Reset to current GPS"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Commercial Activity Type */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                  Commercial Activity Type <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { type: 'shop', label: 'Lock-up Shop' },
                    { type: 'stall', label: 'Market Stall' },
                    { type: 'kiosk', label: 'Kiosk / Booth' },
                    { type: 'open_stand', label: 'Open Stand / Table' },
                    { type: 'workshop', label: 'Workshop / Artisan' },
                    { type: 'service_point', label: 'Service Point / POS' },
                    { type: 'restaurant_food_point', label: 'Food / Canteen' },
                    { type: 'temporary_stand', label: 'Temporary Stand' },
                    { type: 'mobile_trader', label: 'Mobile Hawker' },
                    { type: 'wholesale_outlet', label: 'Wholesale Depot' },
                    { type: 'other', label: 'Other Activity' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setBusinessType(item.type as BusinessType)}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer min-h-[44px] ${
                        businessType === item.type
                          ? 'bg-emerald-50 border-2 border-emerald-700 text-emerald-900 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Offerings Nature */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                  Offerings Nature <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sells_goods', label: 'Sells Goods', sub: 'Physical products', icon: ShoppingBag },
                    { id: 'offers_services', label: 'Offers Services', sub: 'Repairs, POS, etc.', icon: Wrench },
                    { id: 'both', label: 'Both', sub: 'Goods & Services', icon: Sparkles },
                  ].map((act) => {
                    const Icon = act.icon;
                    const isSelected = activity === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setActivity(act.id as BusinessActivity)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'bg-emerald-50 border-2 border-emerald-700 text-emerald-900 shadow-sm'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1 text-emerald-700" />
                        <div className="text-xs font-bold text-slate-900">{act.label}</div>
                        <div className="text-[10px] text-slate-500">{act.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Physical Structure */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                  Physical Structure <span className="text-slate-500 font-normal lowercase">(optional physical build)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'building_shop', label: 'Permanent Building' },
                    { id: 'lockup_stall', label: 'Lock-up Stall' },
                    { id: 'container', label: 'Cargo Container' },
                    { id: 'kiosk_booth', label: 'Kiosk / Booth' },
                    { id: 'open_table', label: 'Wooden/Metal Table' },
                    { id: 'umbrella', label: 'Umbrella Shade' },
                    { id: 'floor_mat', label: 'Ground Mat' },
                    { id: 'none', label: 'No Fixed Structure' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setPhysicalStructure(st.id as PhysicalStructure)}
                      className={`p-2.5 rounded-lg border text-left text-xs font-medium transition cursor-pointer min-h-[44px] ${
                        physicalStructure === st.id
                          ? 'bg-emerald-50 border-2 border-emerald-700 text-emerald-900 font-bold'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: DETAILS & IDENTIFICATION ================= */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Business Name with No-Visible-Name Toggle */}
              <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-2.5 shadow-sm">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Business Name / Signboard
                </label>
                <input
                  type="text"
                  disabled={hasNoVisibleName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={hasNoVisibleName ? 'No signboard displayed' : 'e.g. Mama Chidi Provisions'}
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition min-h-[44px] ${
                    hasNoVisibleName
                      ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed text-slate-500'
                      : 'border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  }`}
                />

                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={hasNoVisibleName}
                    onChange={(e) => {
                      setHasNoVisibleName(e.target.checked);
                      if (e.target.checked) setName('');
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-0 cursor-pointer"
                  />
                  <span>No visible name / No signboard displayed</span>
                </label>
              </div>

              {/* Stall / Line / Structure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">
                    Stall / Shop Number
                  </label>
                  <input
                    type="text"
                    value={stallNumber}
                    onChange={(e) => setStallNumber(e.target.value)}
                    placeholder="e.g. Shop 14 or Stall B22"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">
                    Line / Alley Name
                  </label>
                  <input
                    type="text"
                    value={lineName}
                    onChange={(e) => setLineName(e.target.value)}
                    placeholder="e.g. Line B / Tailors Line"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Physical Coordinates within Complex */}
              <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-2 shadow-sm">
                <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
                  Complex Section (Optional)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Row / Line</label>
                    <input
                      type="text"
                      value={rowLine}
                      onChange={(e) => setRowLine(e.target.value)}
                      placeholder="e.g. Row 4"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Block / Section</label>
                    <input
                      type="text"
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      placeholder="e.g. Block C"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Floor Level</label>
                    <select
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs text-slate-900 cursor-pointer"
                    >
                      <option value="Ground Floor">Ground Floor</option>
                      <option value="1st Floor">1st Floor</option>
                      <option value="2nd Floor">2nd Floor</option>
                      <option value="Basement">Basement</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Primary Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                  Primary Category <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const isSelected = primaryCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPrimaryCategoryId(cat.id)}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer min-h-[44px] ${
                          isSelected
                            ? 'bg-emerald-50 border-2 border-emerald-700 text-emerald-900 shadow-sm'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: GOODS & SERVICES SELECTION ================= */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Guidance Notice */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  Select items this business sells or offers. <strong>Do not</strong> record prices, inventory counts,
                  or individual stock volumes.
                </span>
              </div>

              {/* Selected Offerings List */}
              <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Selected Offerings ({selectedOfferings.length})
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Tap badge to toggle source</span>
                </div>

                {selectedOfferings.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 bg-slate-50">
                    No offerings added yet. Search below or tap from catalogue shortcuts.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedOfferings.map((off, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-900 shadow-sm"
                      >
                        <span className="font-bold">{off.catalogueItemName}</span>
                        {off.isPendingSuggestion && (
                          <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono font-bold">
                            Pending
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleObservation(idx)}
                          className="text-[10px] px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold cursor-pointer"
                          title="Click to toggle: Observed vs Trader Confirmed"
                        >
                          {off.howEstablished === 'observed'
                            ? 'Observed'
                            : off.howEstablished === 'trader_confirmed'
                            ? 'Confirmed'
                            : off.howEstablished === 'both'
                            ? 'Both'
                            : 'Other'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOffering(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Remove offering"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instant Search Bar & Filter */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search offerings (e.g. Rice, POS, Solar Inverter, Ankara, Repairs)..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 p-1 rounded-xl text-xs">
                    {(['all', 'product', 'service'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setOfferTypeFilter(t)}
                        className={`px-3 py-1.5 rounded-lg capitalize text-xs font-bold transition cursor-pointer min-h-[36px] ${
                          offerTypeFilter === t
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t === 'all' ? 'All' : t === 'product' ? 'Goods' : 'Services'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Results / Shortcuts Grid */}
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2 space-y-1 shadow-sm">
                  {searchResults.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500 space-y-2">
                      <p>No matching item in standard catalogue.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSuggestName(searchQuery);
                          setShowSuggestModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold hover:bg-emerald-200 transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Suggest &quot;{searchQuery || 'New Item'}&quot; Offline
                      </button>
                    </div>
                  ) : (
                    searchResults.map((item) => {
                      const isAdded = selectedOfferings.some(
                        (o) => o.catalogueItemId === item.id || o.pendingSuggestionId === item.id
                      );
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition text-xs border border-transparent hover:border-slate-200"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                                item.itemType === 'service'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-blue-100 text-blue-900 border border-blue-300'
                              }`}
                            >
                              {item.itemType}
                            </span>
                            <span className="text-slate-900 font-bold truncate">{item.name}</span>
                            {item.matchedAlias && (
                              <span className="text-[10px] text-slate-500 italic font-medium">
                                (Matched: {item.matchedAlias})
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleAddOffering(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer min-h-[36px] ${
                              isAdded
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Added
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" /> Add
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Offline Suggest New Item Action Button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSuggestModal(true)}
                    className="text-xs text-emerald-800 hover:text-emerald-900 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Can&apos;t find an item? Suggest offline
                  </button>
                </div>
              </div>

              {/* Inline Modal for Offline Catalogue Suggestion */}
              {showSuggestModal && (
                <div className="p-4 rounded-xl bg-white border-2 border-emerald-600 space-y-3 mt-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                      Offline Catalogue Suggestion
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestModal(false)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-slate-800 font-bold mb-1">Item / Offering Name</label>
                      <input
                        type="text"
                        value={suggestName}
                        onChange={(e) => setSuggestName(e.target.value)}
                        placeholder="e.g. Solar Charge Controller or Moniepoint POS"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-800 font-bold mb-1">Type</label>
                        <select
                          value={suggestType}
                          onChange={(e) => setSuggestType(e.target.value as CatalogueItemType)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs text-slate-900 font-medium cursor-pointer"
                        >
                          <option value="product">Product / Physical Good</option>
                          <option value="service">Service / Repair</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-800 font-bold mb-1">Local Dialect / Notes</label>
                        <input
                          type="text"
                          value={suggestNotes}
                          onChange={(e) => setSuggestNotes(e.target.value)}
                          placeholder="Aliases or local terminology"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateSuggestion}
                      className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs mt-2 cursor-pointer shadow-sm"
                    >
                      Add to Offerings & Queue for Admin Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 4: FINISH, PHOTO & STABILITY ================= */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Storefront Photo Capture & Compression */}
              <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Storefront Photo (Optional)
                    </span>
                  </div>
                  {photoMeta && (
                    <span className="text-[11px] font-mono text-slate-600 font-bold">
                      {photoMeta.sizeKb} KB ({photoMeta.width}x{photoMeta.height})
                    </span>
                  )}
                </div>

                {photoUri ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-900 max-h-52 flex items-center justify-center group">
                    <img
                      src={photoUri}
                      alt="Storefront Preview"
                      className="max-h-52 object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 cursor-pointer shadow-md"
                      >
                        Retake Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoUri(null);
                          setPhotoState('not_captured');
                          setPhotoMeta(null);
                          setStagedMediaRecord(undefined);
                        }}
                        className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-5 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/40 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
                    >
                      <Camera className="w-6 h-6 text-slate-500" />
                      <div className="text-xs text-slate-900 font-bold">
                        Take Storefront Photo or Upload
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Automatically compressed locally for low-bandwidth synchronization
                      </div>
                    </div>

                    {/* Photo State Options */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeclinePhoto('Trader requested privacy / no photo')}
                        className={`px-3 py-1.5 rounded-lg text-xs border font-bold transition cursor-pointer min-h-[36px] ${
                          photoDeclined || photoState === 'declined'
                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Photo Declined by Trader
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnablePhoto('Dense crowd / glare / obstruction')}
                        className={`px-3 py-1.5 rounded-lg text-xs border font-bold transition cursor-pointer min-h-[36px] ${
                          photoState === 'unable'
                            ? 'bg-slate-200 border-slate-400 text-slate-900'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Unable to Photograph
                      </button>
                    </div>

                    {(photoDeclined || photoState === 'declined' || photoState === 'unable') && (
                      <input
                        type="text"
                        value={photoDeclineReason}
                        onChange={(e) => setPhotoDeclineReason(e.target.value)}
                        placeholder="Reason (e.g. Trader requested privacy / dense crowd / security rule)"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 mt-1"
                      />
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </div>

              {/* Physical Stability */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                  Structural Stability <span className="text-slate-500 font-normal lowercase">(&apos;unknown&apos; is valid)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'permanent', label: 'Permanent (Concrete/Brick)' },
                    { id: 'semi_permanent', label: 'Semi-Permanent (Zinc/Wood)' },
                    { id: 'temporary', label: 'Temporary Stand / Umbrella' },
                    { id: 'seasonal', label: 'Seasonal Trader' },
                    { id: 'mobile', label: 'Mobile Hawker / Cart' },
                    { id: 'unknown', label: 'Unknown / Unspecified' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStability(st.id as BusinessStability)}
                      className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer min-h-[44px] ${
                        stability === st.id
                          ? 'bg-emerald-50 border-2 border-emerald-700 text-emerald-900 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Trader Contact & Notes */}
              <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
                  Trader Interaction & Notes (Optional)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Trader Name (Voluntary)</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={traderName}
                        onChange={(e) => setTraderName(e.target.value)}
                        placeholder="e.g. Alhaji Musa"
                        className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-2 text-xs text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">Phone Number (Voluntary)</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={traderPhone}
                        onChange={(e) => setTraderPhone(e.target.value)}
                        placeholder="080... or +234..."
                        className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-2 text-xs text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-600 font-bold mb-1">Field Notes / Landmarks</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Near big transformer, opposite Mosque gate..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Revisit Flagging */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2 shadow-sm">
                <label className="flex items-center gap-2 text-xs text-amber-950 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revisitNeeded}
                    onChange={(e) => setRevisitNeeded(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Flag this business for revisit / field verification</span>
                </label>

                {revisitNeeded && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-amber-900 font-bold mb-1">Reason</label>
                        <select
                          value={revisitReason}
                          onChange={(e) => setRevisitReason(e.target.value as BusinessRevisitReason)}
                          className="w-full bg-white border border-amber-400 rounded-lg px-2 py-2 text-xs text-slate-900 font-medium cursor-pointer"
                        >
                          <option value="details_missing">Details Missing / Incomplete</option>
                          <option value="trader_unavailable">Trader Unavailable / Locked</option>
                          <option value="photo_needed">Photo Needed Later</option>
                          <option value="location_uncertain">Location Uncertain</option>
                          <option value="goods_services_unconfirmed">Goods / Services Unconfirmed</option>
                          <option value="possible_duplicate">Possible Duplicate</option>
                          <option value="verification_needed">Needs Supervisor Check</option>
                          <option value="locked_shop">Locked Shop / Closed Stall</option>
                          <option value="other">Other Reason</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-amber-900 font-bold mb-1">Revisit Instructions</label>
                        <input
                          type="text"
                          value={revisitNotes}
                          onChange={(e) => setRevisitNotes(e.target.value)}
                          placeholder="e.g. Return in afternoon when shop opens"
                          className="w-full bg-white border border-amber-400 rounded-lg px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 sticky bottom-0 z-10">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer min-h-[44px]"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                {/* Save & Finish (Close) */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  Save & Close
                </button>

                {/* Primary: Save & Add Next Business */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black shadow-lg flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" /> Save & Add Next
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
