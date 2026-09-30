import { nativeSupabase } from './supabase';
import { OutboxRepository } from '@/src/db/repositories/OutboxRepository';
import { getDatabase } from '@/src/db/sqlite';
import type { OutboxQueueItem } from '@/src/types';

type Payload = Record<string, any>;
const point = (lat?: number, lon?: number) => lat == null || lon == null ? null : `POINT(${lon} ${lat})`;
const line = (raw: any[] = []) => raw.length < 2 ? null : `LINESTRING(${raw.map(p=>`${p.longitude} ${p.latitude}`).join(',')})`;

function mapBusiness(p: Payload) {
 return { id:p.id, mission_id:p.missionId, market_id:p.marketId||null, area_id:p.areaId||null, operational_label:p.operationalLabel, business_type:p.businessType, physical_structure:p.physicalStructure||null, activity:p.activity, location_relationship:p.locationRelationship||null, name:p.name||null, has_no_visible_name:!!p.hasNoVisibleName, stall_number:p.stallNumber||null, line_name:p.lineName||null, row_block_floor:p.rowBlockFloor||null, row_line:p.rowLine||null, block:p.block||null, floor:p.floor||null, primary_category_id:p.primaryCategoryId||null, location:point(p.latitude,p.longitude), location_accuracy:p.locationAccuracy??null, location_source:p.locationSource||null, original_location:point(p.originalLatitude??p.latitude,p.originalLongitude??p.longitude), relative_position:p.relativePosition||null, captured_heading:p.capturedHeading??null, parent_path_session_id:p.parentPathSessionId||null, proposed_location:point(p.proposedLatitude,p.proposedLongitude), stability:p.stability||'unknown', remote_photo_path:p.remotePhotoPath||null, photo_declined:!!p.photoDeclined, photo_state:p.photoState||'not_captured', phone:p.phone||null, owner_name:p.ownerName||null, notes:p.notes||null, completeness_score:p.completenessScore??null, status:p.status||'pending', revisit_needed:!!p.revisitNeeded, revisit_reason:p.revisitReason||null, revisit_notes:p.revisitNotes||null, trader_interaction_status:p.traderInteractionStatus||null, version:p.version||1, created_by:p.createdBy, updated_by:p.updatedBy||p.createdBy, client_created_at:p.clientCreatedAt||null, created_at:p.createdAt, updated_at:p.updatedAt };
}
function mapIssue(p:Payload){return {id:p.id,mission_id:p.missionId,area_id:p.areaId||null,reported_by:p.reportedBy,reported_by_role:p.reportedByRole||'mapper',issue_type:p.issueType,severity:p.severity||'medium',title:p.title,description:p.description,location:point(p.latitude,p.longitude),location_label:p.locationLabel||null,photo_path:p.photoUri||null,status:p.status||'open',resolved_by:p.resolvedBy||null,resolution_notes:p.resolutionNotes||null,resolved_at:p.resolvedAt||null,created_at:p.createdAt,updated_at:p.updatedAt};}
function mapPath(p:Payload){return {id:p.id,mission_id:p.missionId,session_id:p.sessionId||null,name:p.name,distance_meters:p.distanceMeters||0,duration_seconds:p.durationSeconds||0,geometry:line(p.rawPoints||[]),raw_points:p.rawPoints||[],is_verified:!!p.isVerified,version:p.version||1,created_by:p.createdBy,updated_by:p.updatedBy||p.createdBy,client_created_at:p.clientCreatedAt||null,created_at:p.createdAt,updated_at:p.updatedAt};}
function mapJunction(p:Payload){return {id:p.id,mission_id:p.missionId||null,path_id:p.pathId||null,session_id:p.sessionId||null,operational_label:p.operationalLabel,display_name:p.displayName||null,junction_type:p.junctionType||'unknown',location:point(p.latitude,p.longitude),verification_state:p.verificationState||'unverified',created_by:p.createdBy||null,created_at:p.createdAt};}
function mapBranch(p:Payload){return {id:p.id,junction_id:p.junctionId,label:p.label,relative_side:p.relativeSide||null,status:p.status||'unmapped',connected_path_id:p.connectedPathId||null,connected_target_junction_id:p.connectedTargetJunctionId||null,notes:p.notes||null,mapped_at:p.mappedAt||null,mapped_by:p.mappedBy||null,created_at:p.createdAt};}
function mapPlace(p:Payload){return {id:p.id,market_id:p.marketId,mission_id:p.missionId||null,area_id:p.areaId||null,operational_label:p.operationalLabel,display_name:p.displayName||null,place_type:p.placeType,location:point(p.latitude,p.longitude),description:p.description||null,created_by:p.createdBy||null,created_at:p.createdAt,updated_at:p.updatedAt};}

async function apply(item:OutboxQueueItem){
 const p:Payload=JSON.parse(item.payload);
 if(item.tableName==='businesses'){
   const offerings=p.offerings||[]; const business=mapBusiness(p);
   const {error}=await nativeSupabase.from('businesses').upsert(business,{onConflict:'id'}); if(error)throw error;
   if(offerings.length){const rows=offerings.map((o:any)=>({id:o.id,business_id:p.id,catalogue_item_id:o.catalogueItemId||null,pending_suggestion_id:o.pendingSuggestionId||null,item_type:o.itemType||'product',item_name:o.catalogueItemName||null,how_established:o.howEstablished||'observed',created_at:o.createdAt}));const {error:e}=await nativeSupabase.from('business_offerings').upsert(rows,{onConflict:'id'});if(e)throw e;}
   return;
 }
 const config:Record<string,{table:string,map:(p:Payload)=>Payload}>={market_paths:{table:'market_paths',map:mapPath},path_junctions:{table:'path_junctions',map:mapJunction},junction_branches:{table:'junction_branches',map:mapBranch},local_field_issues:{table:'field_issues',map:mapIssue},local_market_places:{table:'market_places',map:mapPlace}};
 const target=config[item.tableName]; if(!target)throw new Error(`SYNC_UNSUPPORTED_TABLE:${item.tableName}`);
 let mapped:Payload;
 if(item.tableName==='junction_branches' && item.action==='UPDATE'){
   mapped={};
   if(p.status!==undefined)mapped.status=p.status;
   if(p.mappedBy!==undefined)mapped.mapped_by=p.mappedBy;
   if(p.mappedAt!==undefined)mapped.mapped_at=p.mappedAt;
   if(p.connectedPathId!==undefined)mapped.connected_path_id=p.connectedPathId;
   if(p.connectedTargetJunctionId!==undefined)mapped.connected_target_junction_id=p.connectedTargetJunctionId;
 } else mapped=target.map(p);
 const query=item.action==='DELETE'?nativeSupabase.from(target.table).delete().eq('id',item.recordId):item.action==='UPDATE'?nativeSupabase.from(target.table).update(mapped).eq('id',item.recordId):nativeSupabase.from(target.table).upsert(mapped,{onConflict:'id'});
 const {error}=await query; if(error)throw error;
}

export async function syncPendingOutbox(limit=50){
 const pending=await OutboxRepository.getPending(limit); let synced=0,failed=0;
 for(const item of pending){
   try{await apply(item);await OutboxRepository.markSynced(item.id);await markLocalSynced(item.tableName,item.recordId);synced++;}
   catch(error){
     const message=error instanceof Error?error.message:String(error);
     const conflict=/409|conflict|duplicate key|version/i.test(message);
     if(conflict) await OutboxRepository.markConflict(item.id,message);
     else await OutboxRepository.markFailed(item.id,message);
     failed++;
   }
 }
 return {attempted:pending.length,synced,failed,remaining:await OutboxRepository.countPending()};
}
async function markLocalSynced(tableName:string,id:string){
 const db=getDatabase(); const local:Record<string,string>={businesses:'local_businesses',market_paths:'local_paths',local_field_issues:'local_field_issues',local_market_places:'local_market_places'};
 const table=local[tableName]; if(!table)return;
 await db.runAsync(`UPDATE ${table} SET sync_status = 'synced' WHERE id = ?;`,[id]).catch(()=>{});
}
