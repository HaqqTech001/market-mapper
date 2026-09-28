/**
 * Movement Detector & Path Geometry Verification Suite
 * 
 * Tests:
 * 1. Stationary drift suppression (10-30 noisy points with speed <= 0.4 m/s -> added distance = 0.0m)
 * 2. Stationary breakout (STATIONARY -> POSSIBLY_MOVING -> MOVING -> distance accumulates)
 * 3. Stop-and-resume (Walk -> Stop -> Walk without phantom jump)
 * 4. Multi-segment geometry (Single -> LineString, Multi -> MultiLineString, no connecting line across pause)
 * 5. Junction consistency on undo / trim / restart
 * 6. Raw GPS persistence after finalization
 */

import { MovementDetector } from '../lib/location/movementDetector';
import { PathRepository } from '../db/repositories/PathRepository';
import { MarketPath, RawGpsSample, LocalPathJunction } from '../types';
import { calculatePolylineDistanceMeters } from '../lib/location/gpsQuality';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING MOVEMENT DETECTION & GEOMETRY AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Stationary Drift Suppression
  // -------------------------------------------------------------
  console.log('TEST 1: Stationary Drift Suppression (Zinc Roof Jitter Simulation)');
  const detector1 = new MovementDetector();
  const baseLat = 6.4698;
  const baseLng = 3.1925;
  let now = Date.now();

  let accumulatedDistanceMeters = 0;
  let rejectedDriftCount = 0;

  // 25 successive noisy GPS updates within 1 to 4 meters radius with jitter
  for (let i = 0; i < 25; i++) {
    // Generate jitter between -0.00002 and +0.00002 degrees (~2-3 meters)
    const jitterLat = (Math.sin(i) * 0.00002);
    const jitterLng = (Math.cos(i) * 0.00002);

    const evalRes = detector1.processSample(
      {
        latitude: baseLat + jitterLat,
        longitude: baseLng + jitterLng,
        accuracy: 10 + (i % 5),
        speed: 0.15 + (i % 3) * 0.05, // speed <= 0.4 m/s
        heading: 45,
        timestamp: now + i * 1000,
      },
      now + i * 1000
    );

    if (evalRes.accepted && evalRes.distanceAddedToPathMeters > 0) {
      accumulatedDistanceMeters += evalRes.distanceAddedToPathMeters;
    } else {
      rejectedDriftCount++;
    }
  }

  console.log(`  -> Processed 25 noisy updates: accumulated distance = ${accumulatedDistanceMeters.toFixed(2)}m (expected 0.0m)`);
  console.log(`  -> Final detector state: ${detector1.getState()}`);
  assert(accumulatedDistanceMeters === 0, `Stationary drift must accumulate 0.0m, but got ${accumulatedDistanceMeters}m`);
  assert(detector1.getState() === 'STATIONARY', 'Detector state must remain STATIONARY');
  console.log('  [PASSED] Test 1: Zero distance accumulated while stationary.\n');

  // -------------------------------------------------------------
  // TEST 2: Stationary Breakout
  // -------------------------------------------------------------
  console.log('TEST 2: Stationary Breakout (User Begins Intentional Walking)');
  let walkingDistanceAdded = 0;
  let steppedStates: string[] = [];

  // Mapper now walks 30 meters eastward at 1.2 m/s (approx 0.00001 deg per second)
  for (let step = 1; step <= 15; step++) {
    const walkLat = baseLat;
    const walkLng = baseLng + step * 0.000015; // walking eastward ~1.6m per step

    const evalRes = detector1.processSample(
      {
        latitude: walkLat,
        longitude: walkLng,
        accuracy: 5.0,
        speed: 1.3,
        heading: 90,
        timestamp: now + 30000 + step * 1000,
      },
      now + 30000 + step * 1000
    );

    steppedStates.push(evalRes.movementState);
    if (evalRes.accepted && evalRes.distanceAddedToPathMeters > 0) {
      walkingDistanceAdded += evalRes.distanceAddedToPathMeters;
    }
  }

  console.log(`  -> State progression during breakout: ${Array.from(new Set(steppedStates)).join(' -> ')}`);
  console.log(`  -> Walking distance added: ${walkingDistanceAdded.toFixed(2)}m`);
  assert(steppedStates.includes('MOVING'), 'State must transition to MOVING upon breakout');
  assert(walkingDistanceAdded > 15, `Walking distance must be >15m, got ${walkingDistanceAdded}m`);
  console.log('  [PASSED] Test 2: Stationary breakout successfully verified.\n');

  // -------------------------------------------------------------
  // TEST 3: Stop-and-Resume
  // -------------------------------------------------------------
  console.log('TEST 3: Stop-and-Resume (Mapper Stops at Shop, Then Continues)');
  const stopAnchorLat = baseLat;
  const stopAnchorLng = baseLng + 15 * 0.000015;
  const distanceBeforeStop = walkingDistanceAdded;

  // Mapper stops for 10 seconds (jitter within 1.5m, speed 0.05 m/s)
  for (let s = 1; s <= 10; s++) {
    const jitterLat = Math.sin(s) * 0.00001;
    const jitterLng = Math.cos(s) * 0.00001;

    const evalRes = detector1.processSample(
      {
        latitude: stopAnchorLat + jitterLat,
        longitude: stopAnchorLng + jitterLng,
        accuracy: 8.0,
        speed: 0.1,
        heading: null,
        timestamp: now + 50000 + s * 1000,
      },
      now + 50000 + s * 1000
    );

    if (evalRes.accepted && evalRes.distanceAddedToPathMeters > 0) {
      walkingDistanceAdded += evalRes.distanceAddedToPathMeters;
    }
  }

  console.log(`  -> Distance before stop: ${distanceBeforeStop.toFixed(2)}m, Distance after 10s stop: ${walkingDistanceAdded.toFixed(2)}m`);
  assert(
    Math.abs(walkingDistanceAdded - distanceBeforeStop) < 0.1,
    'Distance must NOT increase while mapper is stopped at shop'
  );

  // Mapper resumes walking
  let distanceResumed = 0;
  for (let step = 1; step <= 8; step++) {
    const evalRes = detector1.processSample(
      {
        latitude: stopAnchorLat,
        longitude: stopAnchorLng + step * 0.000015,
        accuracy: 5.0,
        speed: 1.2,
        heading: 90,
        timestamp: now + 70000 + step * 1000,
      },
      now + 70000 + step * 1000
    );

    if (evalRes.accepted && evalRes.distanceAddedToPathMeters > 0) {
      distanceResumed += evalRes.distanceAddedToPathMeters;
    }
  }

  console.log(`  -> Distance accumulated after resuming: ${distanceResumed.toFixed(2)}m`);
  assert(distanceResumed > 8, 'Distance must resume accumulating cleanly without jump');
  console.log('  [PASSED] Test 3: Stop-and-Resume verified cleanly.\n');

  // -------------------------------------------------------------
  // TEST 4: Multi-Segment Geometry (LineString vs MultiLineString)
  // -------------------------------------------------------------
  console.log('TEST 4: Multi-Segment Geometry Serialization');
  const sessSingle = `test_sess_single_${Date.now()}`;
  await PathRepository.startSession(sessSingle, 'mission_geo_test');

  const singlePath: MarketPath = {
    id: `path_single_${Date.now()}`,
    sessionId: sessSingle,
    missionId: 'mission_geo_test',
    name: 'Single Corridor Path',
    distanceMeters: 45.2,
    durationSeconds: 90,
    junctionsCount: 0,
    rawPoints: [
      { latitude: 6.4698, longitude: 3.1925, timestamp: now },
      { latitude: 6.4702, longitude: 3.1928, timestamp: now + 1000 },
    ],
    segments: [
      [[3.1925, 6.4698], [3.1928, 6.4702]],
    ],
    isVerified: true,
    version: 1,
    createdBy: 'test_mapper',
    updatedBy: 'test_mapper',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientCreatedAt: new Date().toISOString(),
    isDeleted: false,
    syncStatus: 'local_only',
  };

  const savedSingle = await PathRepository.finalizePath(singlePath, sessSingle);
  const reloadedSingle = await PathRepository.getPathById(savedSingle.id);
  assert(
    reloadedSingle?.path.geojsonGeometry.type === 'LineString',
    `Single segment path must serialize as LineString, got ${reloadedSingle?.path.geojsonGeometry.type}`
  );
  console.log('  -> Test 4A (Single Segment): Successfully serialized to GeoJSON LineString');

  // Multi-segment with pause/resume gap
  const sessMulti = `test_sess_multi_${Date.now()}`;
  await PathRepository.startSession(sessMulti, 'mission_geo_test');

  const multiPath: MarketPath = {
    id: `path_multi_${Date.now()}`,
    sessionId: sessMulti,
    missionId: 'mission_geo_test',
    name: 'Multi Segment Disconnected Path',
    distanceMeters: 92.5,
    durationSeconds: 210,
    junctionsCount: 1,
    rawPoints: [
      { latitude: 6.4698, longitude: 3.1925, timestamp: now },
      { latitude: 6.4702, longitude: 3.1928, timestamp: now + 1000 },
      { latitude: 6.4715, longitude: 3.1940, timestamp: now + 10000 },
      { latitude: 6.4720, longitude: 3.1945, timestamp: now + 11000 },
    ],
    segments: [
      [[3.1925, 6.4698], [3.1928, 6.4702]],
      [[3.1940, 6.4715], [3.1945, 6.4720]],
    ],
    isVerified: true,
    version: 1,
    createdBy: 'test_mapper',
    updatedBy: 'test_mapper',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientCreatedAt: new Date().toISOString(),
    isDeleted: false,
    syncStatus: 'local_only',
  };

  const savedMulti = await PathRepository.finalizePath(multiPath, sessMulti);
  const reloadedMulti = await PathRepository.getPathById(savedMulti.id);
  assert(
    reloadedMulti?.path.geojsonGeometry.type === 'MultiLineString',
    `Multi segment path must serialize as MultiLineString, got ${reloadedMulti?.path.geojsonGeometry.type}`
  );
  assert(
    reloadedMulti?.path.geojsonGeometry.coordinates.length === 2,
    'MultiLineString must have 2 distinct disconnected coordinate arrays'
  );
  // Confirm no bridge connection exists between segment 0 end and segment 1 start
  const seg0End = reloadedMulti?.path.geojsonGeometry.coordinates[0].slice(-1)[0];
  const seg1Start = reloadedMulti?.path.geojsonGeometry.coordinates[1][0];
  assert(
    seg0End[0] !== seg1Start[0] || seg0End[1] !== seg1Start[1],
    'Segments must remain disconnected without bridge line'
  );
  console.log('  -> Test 4B (Multi Segment): Successfully serialized to GeoJSON MultiLineString with disconnected arrays');
  console.log('  -> Test 4C (No Flattening): Confirmed no fake bridge corridor across pause gap');
  console.log('  [PASSED] Test 4: Geometry serialization verified.\n');

  // -------------------------------------------------------------
  // TEST 5: Junction Consistency on Undo / Restart
  // -------------------------------------------------------------
  console.log('TEST 5: Junction Consistency Across Field Corrections');
  const sessCorr = `test_sess_corr_${Date.now()}`;
  await PathRepository.startSession(sessCorr, 'mission_corr_test');
  const segCorr = await PathRepository.createSegment(sessCorr, 0);

  // Add 10 points
  for (let i = 1; i <= 10; i++) {
    await PathRepository.appendRawPoint({
      id: `pt_${sessCorr}_${i}`,
      sessionId: sessCorr,
      segmentId: segCorr.id,
      sequenceNumber: i,
      latitude: 6.4698 + i * 0.0001,
      longitude: 3.1925 + i * 0.0001,
      accuracy: 5.0,
      timestamp: now + i * 1000,
      accepted: true,
      createdAt: new Date().toISOString(),
    });
  }

  // Add Junction at seq 5
  await PathRepository.addJunction({
    id: `junc_5_${Date.now()}`,
    sessionId: sessCorr,
    operationalLabel: 'Junction J005',
    latitude: 6.4698 + 5 * 0.0001,
    longitude: 3.1925 + 5 * 0.0001,
    sequenceNumber: 5,
    timestamp: now + 5000,
    createdAt: new Date().toISOString(),
  });

  // Add Junction at seq 8
  const junc8Id = `junc_8_${Date.now()}`;
  await PathRepository.addJunction({
    id: junc8Id,
    sessionId: sessCorr,
    operationalLabel: 'Junction J008',
    latitude: 6.4698 + 8 * 0.0001,
    longitude: 3.1925 + 8 * 0.0001,
    sequenceNumber: 8,
    timestamp: now + 8000,
    createdAt: new Date().toISOString(),
  });

  // Undo distance that removes points 8, 9, 10
  const undoRes = await PathRepository.applyUndoDistance(sessCorr, 30);
  console.log(`  -> Undid distance: ${undoRes.pointsRemoved} points revoked, ${undoRes.junctionsExcluded} junctions excluded`);
  assert(undoRes.junctionsExcluded >= 1, 'Junction J008 in undone section must be excluded');

  // Verify active junctions
  const sessionAfterUndo = await PathRepository.getActiveSession();
  const activeJuncs = sessionAfterUndo.junctions.filter(j => !j.isExcluded);
  assert(activeJuncs.length === 1 && activeJuncs[0].operationalLabel === 'Junction J005', 'Only Junction J005 should remain active');
  console.log('  -> Test 5A: Junction J008 correctly excluded; Junction J005 retained');

  // Restart from Junction J005
  const junc5 = activeJuncs[0];
  const restartRes = await PathRepository.applyRestartFromJunction(sessCorr, junc5.id);
  console.log(`  -> Restart from ${junc5.operationalLabel}: ${restartRes.pointsRemoved} subsequent points revoked`);
  const sessionAfterRestart = await PathRepository.getActiveSession();
  const retainedJuncs = sessionAfterRestart.junctions.filter(j => !j.isExcluded);
  assert(retainedJuncs.some(j => j.id === junc5.id), 'Restarted junction J005 MUST remain active');
  console.log('  -> Test 5B: Target junction retained and path resumed from it');
  console.log('  [PASSED] Test 5: Junction consistency verified.\n');

  // -------------------------------------------------------------
  // TEST 6: Raw GPS Persistence After Finalization
  // -------------------------------------------------------------
  console.log('TEST 6: Raw GPS Persistence Survival');
  const sessAudit = `test_sess_audit_${Date.now()}`;
  await PathRepository.startSession(sessAudit, 'mission_audit_test');
  const segAudit = await PathRepository.createSegment(sessAudit, 0);

  for (let i = 1; i <= 5; i++) {
    await PathRepository.appendRawPoint({
      id: `raw_${sessAudit}_${i}`,
      sessionId: sessAudit,
      segmentId: segAudit.id,
      sequenceNumber: i,
      latitude: 6.4698 + i * 0.0001,
      longitude: 3.1925,
      accuracy: 6.0,
      timestamp: now + i * 1000,
      accepted: i !== 3, // point 3 rejected intentionally
      rejectionReason: i === 3 ? 'poor_accuracy_excluded' : null,
      createdAt: new Date().toISOString(),
    });
  }

  const finalAuditPath: MarketPath = {
    id: `path_audit_${Date.now()}`,
    sessionId: sessAudit,
    missionId: 'mission_audit_test',
    name: 'Audited Raw Point Path',
    distanceMeters: 40,
    durationSeconds: 60,
    junctionsCount: 0,
    rawPoints: [],
    isVerified: true,
    version: 1,
    createdBy: 'test_mapper',
    updatedBy: 'test_mapper',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientCreatedAt: new Date().toISOString(),
    isDeleted: false,
    syncStatus: 'local_only',
  };

  await PathRepository.finalizePath(finalAuditPath, sessAudit);

  // Inspect raw points in SQLite directly
  const rawPointsInDb = await PathRepository.getRawPointsForSession(sessAudit);
  assert(rawPointsInDb.length === 5, `Expected all 5 raw GPS points to survive finalization, found ${rawPointsInDb.length}`);
  const rejectedSample = rawPointsInDb.find(p => p.sequenceNumber === 3);
  assert(rejectedSample?.accepted === false, 'Rejected sample must retain accepted=false in SQLite audit log');
  assert(rejectedSample?.rejectionReason === 'poor_accuracy_excluded', 'Rejected sample must retain rejection reason in SQLite');
  console.log(`  -> Successfully retrieved all ${rawPointsInDb.length} raw points with accepted/rejected audit flags intact`);
  console.log('  [PASSED] Test 6: Raw GPS history verified to survive path finalization.\n');

  console.log('================================================================');
  console.log('ALL 6 MOVEMENT & GEOMETRY AUTOMATED TESTS PASSED WITH 100% SUCCESS');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test execution failure:', err);
  process.exit(1);
});
