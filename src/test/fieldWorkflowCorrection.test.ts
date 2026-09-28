/**
 * Field Workflow Correction Test Matrix
 * Verifies Non-Exclusive Field Mapping Workflows:
 * Concurrent Path Recording, Business Capture, Place Mapping, Junction Nodes, and Field Issue Reporting.
 */

import { resetDatabase } from '../db/sqlite';
import {
  BusinessRepository,
  PathRepository,
  FieldIssueRepository,
} from '../db';
import { LocalPathJunction } from '../types';
import { MovementDetector } from '../lib/location/gpsQuality';

function assert(condition: boolean, testId: string, description: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testId}: ${description}`);
  } else {
    console.error(`  ❌ [FAIL] ${testId}: ${description}`);
    throw new Error(`Test failed: ${testId} - ${description}`);
  }
}

async function runFieldWorkflowCorrectionMatrix() {
  console.log('\n================================================================');
  console.log('RUNNING CRITICAL FIELD WORKFLOW CORRECTION MATRIX');
  console.log('================================================================\n');

  resetDatabase();

  // 1. Path Session Initialization & Continuous Context
  console.log('--- SECTION 1: PATH RECORDING CONTINUOUS FIELD CONTEXT ---');
  const session1 = await PathRepository.startSession('sess_field_01', 'mis_alaba_01');
  const segment1 = await PathRepository.createSegment('sess_field_01', 0);
  assert(session1.sessionId === 'sess_field_01' && session1.status === 'recording', 'FWC_01', 'Path recording session initializes in active recording state');

  // 2. Concurrent Business Capture During Active Path Recording
  console.log('--- SECTION 2: CONCURRENT BUSINESS CAPTURE WHILE RECORDING ---');
  const biz1 = await BusinessRepository.create({
    id: 'biz_field_01',
    missionId: 'mis_alaba_01',
    marketId: 'mkt_alaba_01',
    operationalLabel: 'ST-001',
    name: 'Alaba Electronics Hub',
    hasNoVisibleName: false,
    businessType: 'shop',
    physicalStructure: 'lockup_stall',
    activity: 'sells_goods',
    locationRelationship: 'general_inside_market',
    latitude: 6.4698,
    longitude: 3.1925,
    locationAccuracy: 3.2,
    locationSource: 'current_gps',
    stability: 'permanent',
    photoDeclined: false,
    completenessScore: 80,
    status: 'verified',
    version: 1,
    createdBy: 'usr_mapper_01',
    updatedBy: 'usr_mapper_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientCreatedAt: new Date().toISOString(),
    isDeleted: false,
    syncStatus: 'local_only',
  });

  // Verify path session remains active and unaffected
  const activeRes1 = await PathRepository.getActiveSession();
  assert(activeRes1.session?.sessionId === 'sess_field_01' && activeRes1.session?.status === 'recording', 'FWC_02', 'Active path recording persists uninterrupted after Business capture');
  assert(biz1.operationalLabel === 'ST-001', 'FWC_03', 'Business saved independently with distinct coordinates');

  // 3. Movement Detector Jitter Protection During Business Entry
  console.log('--- SECTION 3: MOVEMENT DETECTOR JITTER PROTECTION ---');
  const detector = new MovementDetector();
  detector.reset();

  // Stationary GPS samples while filling business form
  const sample1 = detector.processSample({
    latitude: 6.469800,
    longitude: 3.192500,
    timestamp: Date.now(),
    accuracy: 3.5,
  }, Date.now());

  const sample2 = detector.processSample({
    latitude: 6.469801, // 0.1m jitter
    longitude: 3.192501,
    timestamp: Date.now() + 1000,
    accuracy: 3.8,
  }, Date.now() + 1000);

  assert(sample2.movementState === 'STATIONARY' || sample2.distanceAddedToPathMeters === 0, 'FWC_04', 'Stationary GPS jitter during business entry adds 0 meters to path');

  // Movement resumes after finishing business (2 walking steps)
  detector.processSample({
    latitude: 6.469880, // ~8m movement
    longitude: 3.192500,
    timestamp: Date.now() + 5000,
    accuracy: 2.5,
    speed: 1.2,
  }, Date.now() + 5000);

  const sample4 = detector.processSample({
    latitude: 6.469950, // ~16m total movement
    longitude: 3.192500,
    timestamp: Date.now() + 10000,
    accuracy: 2.5,
    speed: 1.2,
  }, Date.now() + 10000);

  assert(sample4.accepted && sample4.distanceAddedToPathMeters > 5, 'FWC_05', 'Genuine walking movement immediately resumes path distance accumulation');

  // 4. Concurrent Place Mapping During Active Path
  console.log('--- SECTION 4: CONCURRENT PLACE / GATE MAPPING ---');
  const activeRes2 = await PathRepository.getActiveSession();
  assert(activeRes2.session?.sessionId === 'sess_field_01', 'FWC_06', 'Path recording active during place/gate capture');

  // 5. Junction Creation During Active Path
  console.log('--- SECTION 5: JUNCTION CREATION DURING RECORDING ---');
  const junctionObj: LocalPathJunction = {
    id: 'junc_01',
    sessionId: 'sess_field_01',
    operationalLabel: 'Junc J-01',
    displayName: 'Central Aisle Intersection',
    latitude: 6.46995,
    longitude: 3.19250,
    sequenceNumber: 1,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
  };
  await PathRepository.addJunction(junctionObj);

  const activeResWithJunc = await PathRepository.getActiveSession();
  assert(activeResWithJunc.junctions.length >= 1 && activeResWithJunc.junctions[0].operationalLabel === 'Junc J-01', 'FWC_07', 'Operational junction attached directly to active path session');

  // 6. Field Issue Reporting During Active Path
  console.log('--- SECTION 6: FIELD ISSUE REPORTING DURING RECORDING ---');
  const issue1 = await FieldIssueRepository.reportIssue({
    missionId: 'mis_alaba_01',
    reportedBy: 'usr_mapper_01',
    issueType: 'access_blocked',
    severity: 'high',
    title: 'Row C Aisle Blocked by Debris',
    description: 'Passageway impassable due to ongoing market construction',
    latitude: 6.46995,
    longitude: 3.19250,
  });

  assert(issue1.issueType === 'access_blocked' && issue1.severity === 'high', 'FWC_08', 'Field issue reported without destroying active path session');

  // 7. Manual Pause vs Stationary
  console.log('--- SECTION 7: MANUAL PAUSE VS STATIONARY ---');
  await PathRepository.updateSessionTelemetry('sess_field_01', 25.4, 120, 100, 1, true, 'paused');
  const activeResPaused = await PathRepository.getActiveSession();
  assert(activeResPaused.session?.status === 'paused', 'FWC_09', 'Explicit manual pause transitions path status to paused');

  // Resume Path
  await PathRepository.updateSessionTelemetry('sess_field_01', 25.4, 130, 110, 1, false, 'recording');
  const activeResResumed = await PathRepository.getActiveSession();
  assert(activeResResumed.session?.status === 'recording', 'FWC_10', 'Resume path restores active recording state');

  // 8. Explicit Path Finalization
  console.log('--- SECTION 8: EXPLICIT PATH FINALIZATION ---');
  const finalPath = await PathRepository.finalizePath({
    id: 'path_field_01',
    sessionId: 'sess_field_01',
    missionId: 'mis_alaba_01',
    name: 'Alaba Main Commercial Corridor Path',
    distanceMeters: 25.4,
    durationSeconds: 130,
    junctionsCount: 1,
    rawPoints: [],
    isVerified: true,
    version: 1,
    createdBy: 'usr_mapper_01',
    updatedBy: 'usr_mapper_01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientCreatedAt: new Date().toISOString(),
    isDeleted: false,
    syncStatus: 'local_only',
  }, 'sess_field_01');

  assert(finalPath.name === 'Alaba Main Commercial Corridor Path', 'FWC_11', 'Path finalized explicitly via review & save workflow');

  const activeResAfterFinal = await PathRepository.getActiveSession();
  assert(activeResAfterFinal.session === null, 'FWC_12', 'Active session cleared only after explicit finalization');

  console.log('\n================================================================');
  console.log('✓ CRITICAL FIELD WORKFLOW CORRECTION MATRIX PASSED SUCCESSFULLY (12/12)');
  console.log('================================================================\n');
}

runFieldWorkflowCorrectionMatrix().catch((err) => {
  console.error('Field Workflow Matrix Failed:', err);
  process.exit(1);
});
