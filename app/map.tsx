import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from 'react-native-maps';
import type { LocationSubscription } from '@/src/lib/location/locationService';
import { NativeFieldMap } from '@/src/native/NativeFieldMap';
import { nativeLocationService } from '@/src/native/locationService';
import { NativePathRecorder } from '@/src/native/NativePathRecorder';
import { savePlaceDuringPath, saveQuickBusiness, saveQuickJunction, saveQuickIssue } from '@/src/native/fieldCapture';
import { getAssignedNativeMissions, requireNativeUserContext, type NativeMissionContext, type NativeUserContext } from '@/src/native/userContext';
import { NativeBusinessCapture, NativeIssueCapture, NativeJunctionPicker, NativePlaceCapture, type BusinessCaptureValue } from '@/src/native/NativeCaptureSheets';
import { RemainingBranchesSheet } from '@/src/native/RemainingBranchesSheet';
import { persistBusinessPhoto } from '@/src/native/businessMedia';
import { PathRepository } from '@/src/db/repositories/PathRepository';
import { getNativeSyncSnapshot, retryNativeSync, runNativeSync, type NativeSyncSnapshot } from '@/src/native/syncCoordinator';

const recorder = new NativePathRecorder();

export default function MapScreen() {
  const [permission, setPermission] = useState<'checking' | 'granted' | 'denied' | 'services_disabled'>('checking');
  const [current, setCurrent] = useState<LatLng | null>(null);
  const [snapshot, setSnapshot] = useState(recorder.getSnapshot());
  const [busy, setBusy] = useState(false);
  const [userContext, setUserContext] = useState<NativeUserContext | null>(null);
  const [mission, setMission] = useState<NativeMissionContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [capture, setCapture] = useState<'business' | 'junction' | 'place' | 'issue' | null>(null);
  const [showBranches, setShowBranches] = useState(false);
  const [sync, setSync] = useState<NativeSyncSnapshot>({ state: 'saved', relationalPending: 0, mediaPending: 0 });
  const [syncBusy, setSyncBusy] = useState(false);
  const [branchTarget, setBranchTarget] = useState<{ branchId: string; label: string; latitude: number; longitude: number } | null>(null);
  const subscription = useRef<LocationSubscription | null>(null);

  const path = snapshot.acceptedPoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

  const ensureLocation = async () => {
    const existing = await nativeLocationService.getForegroundPermissionsAsync();
    const result = existing.granted ? existing : await nativeLocationService.requestForegroundPermissionsAsync();
    if (!result.granted) {
      setPermission(result.status === 'services_disabled' ? 'services_disabled' : 'denied');
      return;
    }
    setPermission('granted');
    subscription.current?.remove();
    subscription.current = await nativeLocationService.watchPositionAsync(
      { timeInterval: 1000, distanceInterval: 1 },
      async (location) => {
        const point = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setCurrent(point);
        if (recorder.getSnapshot().status === 'recording') {
          try {
            const next = await recorder.ingest({ ...location.coords, timestamp: location.timestamp });
            setSnapshot(next);
          } catch (error) {
            console.error('GPS sample persistence failed', error);
          }
        }
      },
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const user = await requireNativeUserContext();
        setUserContext(user);
        const missions = await getAssignedNativeMissions(user.userId);
        setMission(missions[0] ?? null);
        if (missions.length === 0) setContextError('NO_ASSIGNED_MISSION');
      } catch (error) {
        setContextError(error instanceof Error ? error.message : 'AUTH_REQUIRED');
        console.error('Native user context failed', error);
      }

      try {
        setSnapshot(await recorder.recover());
      } catch (error) {
        console.error('Path recovery failed', error);
      }

      setSync(await getNativeSyncSnapshot());
      await ensureLocation();
    })();
    return () => subscription.current?.remove();
  }, []);

  const run = async (action: () => Promise<ReturnType<NativePathRecorder['getSnapshot']>>) => {
    setBusy(true);
    try { setSnapshot(await action()); } finally { setBusy(false); }
  };

  if (contextError === 'AUTH_REQUIRED') return <Centered title="Sign in is required before field mapping." />;
  if (contextError === 'ACCOUNT_INACTIVE') return <Centered title="This account is inactive. Contact an administrator." />;
  if (permission === 'checking') return <Centered title="Preparing field map…" loading />;
  if (permission !== 'granted') {
    return <Centered title={permission === 'services_disabled' ? 'Location services are off' : 'Location permission is required'} action={ensureLocation} />;
  }

  if (snapshot.status === 'reviewing') {
    return (
      <ScrollView contentContainerStyle={styles.review}>
        <Text style={styles.eyebrow}>PATH REVIEW</Text>
        <Text style={styles.reviewTitle}>Check this path before saving</Text>
        <View style={styles.reviewMap}><NativeFieldMap currentLocation={current} path={path} /></View>
        {branchTarget ? <Text style={styles.branchTarget}>Return to {branchTarget.label} to map the selected branch.</Text> : null}
        <Pressable disabled={syncBusy} onPress={async()=>{setSyncBusy(true);try{setSync({...sync,state:'syncing'});setSync(await (sync.state==='failed'?retryNativeSync():runNativeSync()));}finally{setSyncBusy(false)}}} style={[styles.syncBadge,sync.state==='failed'&&styles.syncFailed]}>
          <Text style={[styles.syncText,sync.state==='failed'&&styles.syncFailedText]}>{syncLabel(sync)}{sync.relationalPending+sync.mediaPending>0?` · ${sync.relationalPending+sync.mediaPending}`:''}</Text>
        </Pressable>
        <View style={styles.metrics}>
          <Metric label="Distance" value={formatDistance(snapshot.distanceMeters)} />
          <Metric label="Total time" value={formatTime(snapshot.durationSeconds)} />
          <Metric label="Active" value={formatTime(snapshot.activeDurationSeconds)} />
          <Metric label="Points" value={String(snapshot.acceptedPoints.length)} />
        </View>
        <Text style={styles.reviewNote}>Raw GPS samples remain in local SQLite for audit and correction. Saving queues the finalized path for synchronization.</Text>
        <Pressable disabled={busy} style={styles.primary} onPress={async () => {
          setBusy(true);
          try {
            if (!userContext) throw new Error('Authenticated user is required.');
            const savedPath = await recorder.save(userContext.userId);
            if (branchTarget) {
              await PathRepository.markBranchMapped(branchTarget.branchId, savedPath.id, userContext.userId);
              setBranchTarget(null);
            }
            setSnapshot(recorder.getSnapshot());
            setSync(await getNativeSyncSnapshot());
          } catch (error) {
            Alert.alert('Could not save path', error instanceof Error ? error.message : 'Please try again.');
          } finally { setBusy(false); }
        }}><Text style={styles.primaryText}>{busy ? 'Saving…' : 'Save Path'}</Text></Pressable>
        <Pressable disabled={busy} style={styles.danger} onPress={() => Alert.alert('Discard path?', 'This permanently removes the unfinished local recording.', [
          { text: 'Keep Path', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: async () => { await recorder.discard(); setSnapshot(recorder.getSnapshot()); } },
        ])}><Text style={styles.dangerText}>Discard Path</Text></Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <NativeFieldMap currentLocation={current} path={path} />
      <View style={styles.hud}>
        <Text style={styles.missionText}>{mission ? mission.title : 'No assigned mission'}</Text>
        <View style={styles.hudTop}>
          <Text style={styles.state}>{snapshot.status === 'recording' ? snapshot.movementState : snapshot.status.toUpperCase()}</Text>
          <Text style={styles.gps}>{current ? 'GPS LIVE' : 'GPS SEARCHING'}</Text>
        </View>
        <View style={styles.metrics}>
          <Metric label="Distance" value={formatDistance(snapshot.distanceMeters)} />
          <Metric label="Time" value={formatTime(snapshot.durationSeconds)} />
        </View>
      </View>
      {snapshot.status === 'recording' || snapshot.status === 'paused' ? <View style={styles.captureActions}>
        <Pressable style={styles.captureButton} onPress={() => setCapture('business')}><Text style={styles.captureText}>+ Business</Text></Pressable>
        <Pressable style={styles.captureButton} onPress={() => setCapture('place')}><Text style={styles.captureText}>+ Place</Text></Pressable>
        <Pressable style={styles.captureButton} onPress={() => setCapture('junction')}><Text style={styles.captureText}>Junction</Text></Pressable>
        <Pressable style={styles.captureButton} onPress={() => setCapture('issue')}><Text style={styles.captureText}>Issue</Text></Pressable>
      </View> : null}
      {snapshot.status === 'idle' && mission && userContext ? <Pressable style={styles.branchesButton} onPress={() => setShowBranches(true)}><Text style={styles.branchesText}>Remaining Branches</Text></Pressable> : null}
      <View style={styles.actions}>
        {snapshot.status === 'idle' ? (
          <Pressable disabled={busy} style={styles.primary} onPress={() => { if (!mission) { Alert.alert('No active mission', 'You need an assigned mission before starting field mapping.'); return; } run(() => recorder.start(mission.id)); }}><Text style={styles.primaryText}>Start Path</Text></Pressable>
        ) : snapshot.status === 'recording' ? (
          <>
            <Pressable disabled={busy} style={styles.secondary} onPress={() => run(() => recorder.pause())}><Text style={styles.secondaryText}>Pause</Text></Pressable>
            <Pressable disabled={busy} style={styles.primary} onPress={() => run(() => recorder.finish())}><Text style={styles.primaryText}>Finish</Text></Pressable>
          </>
        ) : (
          <>
            <Pressable disabled={busy} style={styles.primary} onPress={() => run(() => recorder.resume())}><Text style={styles.primaryText}>Resume</Text></Pressable>
            <Pressable disabled={busy} style={styles.secondary} onPress={() => run(() => recorder.finish())}><Text style={styles.secondaryText}>Finish</Text></Pressable>
          </>
        )}
      </View>
      {mission && userContext ? <RemainingBranchesSheet visible={showBranches} missionId={mission.id} userId={userContext.userId} onClose={() => setShowBranches(false)} onSelect={({junction, branch}) => setBranchTarget({ branchId: branch.id, label: `${junction.operationalLabel} · ${branch.label}`, latitude: junction.latitude, longitude: junction.longitude })} /> : null}
      <NativeBusinessCapture visible={capture === 'business'} onClose={() => setCapture(null)} onSave={async (value: BusinessCaptureValue) => {
        if (!current || !snapshot.missionId || !userContext) throw new Error('Mapping context is unavailable.');
        const before = recorder.getSnapshot().status;
        const savedBusiness = await saveQuickBusiness({ missionId: snapshot.missionId, userId: userContext.userId, pathSessionId: snapshot.sessionId, latitude: current.latitude, longitude: current.longitude }, { ...value, photoDeclined: value.photoDeclined, localPhotoUri: value.photo?.localUri });
        if (value.photo) await persistBusinessPhoto(userContext.userId, savedBusiness.id, value.photo);
        if (recorder.getSnapshot().status !== before) throw new Error('Business capture changed path state.');
        setSync(await getNativeSyncSnapshot());
        setCapture(null);
        Alert.alert('Business saved', 'Business and offerings saved locally. Path recording state was preserved.');
      }} />
      <NativePlaceCapture visible={capture === 'place'} onClose={() => setCapture(null)} onSave={async (value) => {
        if (!current || !snapshot.missionId || !userContext) throw new Error('Mapping context is unavailable.');
        const before = recorder.getSnapshot().status;
        await savePlaceDuringPath({ missionId: snapshot.missionId, userId: userContext.userId, marketId: mission?.marketId, pathSessionId: snapshot.sessionId, latitude: current.latitude, longitude: current.longitude }, value);
        if (recorder.getSnapshot().status !== before) throw new Error('Place capture changed path state.');
        setSync(await getNativeSyncSnapshot());
        setCapture(null); Alert.alert('Place saved', 'Place saved locally without changing path state.');
      }} />
      <NativeIssueCapture visible={capture === 'issue'} onClose={() => setCapture(null)} onSave={async (value) => {
        if (!current || !snapshot.missionId || !userContext) throw new Error('Mapping context is unavailable.');
        const before = recorder.getSnapshot().status;
        await saveQuickIssue({ missionId: snapshot.missionId, userId: userContext.userId, pathSessionId: snapshot.sessionId, latitude: current.latitude, longitude: current.longitude }, value);
        if (recorder.getSnapshot().status !== before) throw new Error('Issue capture changed path state.');
        setSync(await getNativeSyncSnapshot());
        setCapture(null); Alert.alert('Issue reported', 'Issue saved locally without changing path state.');
      }} />
      <NativeJunctionPicker visible={capture === 'junction'} onClose={() => setCapture(null)} onSave={async (junctionType) => {
        if (!current || !snapshot.missionId || !snapshot.sessionId || !userContext) throw new Error('Active path context is unavailable.');
        const before = recorder.getSnapshot().status;
        await saveQuickJunction({ missionId: snapshot.missionId, userId: userContext.userId, pathSessionId: snapshot.sessionId, latitude: current.latitude, longitude: current.longitude }, { junctionType });
        if (recorder.getSnapshot().status !== before) throw new Error('Junction capture changed path state.');
        setSync(await getNativeSyncSnapshot());
        Alert.alert('Junction saved', 'Junction saved without stopping the path.');
      }} />
    </View>
  );
}

function Centered({ title, loading, action }: { title: string; loading?: boolean; action?: () => void }) {
  return <View style={styles.center}>{loading ? <ActivityIndicator /> : null}<Text style={styles.reviewTitle}>{title}</Text>{action ? <Pressable style={styles.primary} onPress={action}><Text style={styles.primaryText}>Try Again</Text></Pressable> : null}</View>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const formatDistance = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FAF8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: '#F7FAF8' },
  hud: { position: 'absolute', left: 16, right: 16, top: 16, padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D1D5DB' },
  missionText: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 8 },
  hudTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  state: { fontSize: 14, fontWeight: '900', color: '#065F46', letterSpacing: 1 },
  gps: { fontSize: 12, fontWeight: '800', color: '#374151' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  metric: { minWidth: 92, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  metricValue: { fontSize: 18, fontWeight: '900', color: '#111827' },
  metricLabel: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#4B5563' },
  captureActions: { position: 'absolute', left: 16, right: 16, bottom: 88, flexDirection: 'row', gap: 8 },
  captureButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#065F46', paddingHorizontal: 8 },
  captureText: { color: '#065F46', fontSize: 13, fontWeight: '900' },
  syncBadge:{alignSelf:'flex-start',minHeight:36,justifyContent:'center',paddingHorizontal:10,borderRadius:9,borderWidth:2,borderColor:'#047857',backgroundColor:'#ECFDF5',marginTop:8},
  syncFailed:{borderColor:'#B91C1C',backgroundColor:'#FEF2F2'},
  syncText:{fontSize:11,fontWeight:'900',color:'#065F46'},syncFailedText:{color:'#991B1B'},
  branchTarget: { marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#FFFBEB', color: '#92400E', fontSize: 13, fontWeight: '800' },
  branchesButton: { position: 'absolute', left: 16, right: 16, bottom: 88, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#047857' },
  branchesText: { color: '#047857', fontSize: 15, fontWeight: '900' },
  actions: { position: 'absolute', left: 16, right: 16, bottom: 20, flexDirection: 'row', gap: 12 },
  primary: { minHeight: 52, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#047857', paddingHorizontal: 18 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondary: { minHeight: 52, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#374151', paddingHorizontal: 18 },
  secondaryText: { color: '#111827', fontSize: 16, fontWeight: '900' },
  review: { flexGrow: 1, padding: 20, backgroundColor: '#F7FAF8', gap: 14 },
  eyebrow: { fontSize: 13, fontWeight: '900', letterSpacing: 1.4, color: '#047857' },
  reviewTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900', color: '#111827', textAlign: 'center' },
  reviewMap: { height: 360, overflow: 'hidden', borderRadius: 16, borderWidth: 2, borderColor: '#D1D5DB' },
  reviewNote: { fontSize: 14, lineHeight: 21, color: '#4B5563' },
  danger: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 2, borderColor: '#B91C1C' },
  dangerText: { color: '#991B1B', fontSize: 15, fontWeight: '900' },
});
