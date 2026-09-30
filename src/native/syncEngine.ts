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


function mapRevisit(p:Payload){return {id:p.id,mission_id:p.missionId,entity_type:p.entityType,entity_id:p.entityId,entity_title:p.entityTitle||null,reason:p.reason,notes:p.notes||null,status:p.status||'open',assigned_to:p.assignedTo||null,flagged_by:p.flaggedBy,resolved_by:p.resolvedBy||null,resolution_notes:p.resolutionNotes||null,resolved_at:p.resolvedAt||null,created_at:p.createdAt,updated_at:p.updatedAt};}
function mapHandover(p:Payload){return {id:p.id,mission_id:p.missionId,mission_title:p.missionTitle||null,area_id:p.areaId,area_name:p.areaName||null,from_user_id:p.fromUserId,from_user_name:p.fromUserName||null,to_user_id:p.toUserId,to_user_name:p.toUserName||null,status:p.status||'pending',notes:p.notes||null,checklist:p.checklist||{},stalls_count_at_handover:p.stallsCountAtHandover||0,paths_count_at_handover:p.pathsCountAtHandover||0,created_at:p.createdAt,updated_at:p.updatedAt};}
function mapReconciliation(p:Payload){return {id:p.id,mission_id:p.missionId,mission_title:p.missionTitle||null,area_id:p.areaId,area_name:p.areaName,reconciled_by:p.reconciledBy,reconciled_by_name:p.reconciledByName||null,stalls_counted:p.stallsCounted||0,paths_recorded:p.pathsRecorded||0,unresolved_issues_count:p.unresolvedIssuesCount||0,status:p.status||'pending_lead_review',review_notes:p.reviewNotes||null,reviewed_by:p.reviewedBy||null,reviewed_at:p.reviewedAt||null,created_at:p.createdAt,updated_at:p.updatedAt};}
function mapChatChannel(p:Payload){return {id:p.id,name:p.name,channel_type:p.channelType,team_id:p.teamId||null,mission_id:p.missionId||null,created_at:p.createdAt};}
function mapChatMessage(p:Payload){return {id:p.id,channel_id:p.channelId,sender_id:p.senderId,sender_name:p.senderName,sender_avatar:p.senderAvatar||null,sender_role:p.senderRole,reply_to_id:p.replyToId||null,text:p.text,is_pinned:!!p.isPinned,linked_business_id:p.linkedBusinessId||null,linked_business_name:p.linkedBusinessName||null,linked_path_id:p.linkedPathId||null,linked_path_name:p.linkedPathName||null,linked_issue_id:p.linkedIssueId||null,linked_issue_title:p.linkedIssueTitle||null,shared_location:p.sharedLocation||null,created_at:p.createdAt};}
function mapCatalogueSuggestion(p:Payload){return {id:p.id,suggested_by:p.suggestedBy,name:p.name,item_type:p.itemType,suggested_category_id:p.suggestedCategoryId||null,notes:p.reviewerNotes||p.notes||null,status:'pending',created_at:p.createdAt};}
function mapNotification(p:Payload){return {id:p.id,recipient_id:p.recipientId,type:p.type,title:p.title,body:p.body,entity_reference_type:p.entityReferenceType||null,entity_reference_id:p.entityReferenceId||null,is_read:!!p.isRead,created_at:p.createdAt};}

async function apply(item:OutboxQueueItem){
 const p:Payload=JSON.parse(item.payload);
 if(item.tableName==='local_notifications' && item.action==='INSERT'){
   if(p.entityReferenceType==='handover'){
     const {error}=await nativeSupabase.rpc('create_mission_notification',{target_user_id:p.recipientId,notification_id:p.id,notification_type:p.type,notification_title:p.title,notification_body:p.body,reference_type:'handover',reference_id:p.entityReferenceId});if(error)throw error;return;
   }
   const user=(await nativeSupabase.auth.getUser()).data.user;
   const {data:profile}=user?await nativeSupabase.from('profiles').select('role').eq('id',user.id).single():{data:null};
   if(profile?.role!=='admin')throw new Error('NOTIFICATION_INSERT_REQUIRES_PRIVILEGED_FLOW');
 }
 if(item.tableName==='businesses'){
   const offerings=p.offerings||[]; const business=mapBusiness(p);
   const {error}=await nativeSupabase.from('businesses').upsert(business,{onConflict:'id'}); if(error)throw error;
   if(offerings.length){const rows=offerings.map((o:any)=>({id:o.id,business_id:p.id,catalogue_item_id:o.catalogueItemId||null,pending_suggestion_id:o.pendingSuggestionId||null,item_type:o.itemType||'product',item_name:o.catalogueItemName||null,how_established:o.howEstablished||'observed',created_at:o.createdAt}));const {error:e}=await nativeSupabase.from('business_offerings').upsert(rows,{onConflict:'id'});if(e)throw e;}
   return;
 }
 const config:Record<string,{table:string,map:(p:Payload)=>Payload}>={market_paths:{table:'market_paths',map:mapPath},path_junctions:{table:'path_junctions',map:mapJunction},junction_branches:{table:'junction_branches',map:mapBranch},local_field_issues:{table:'field_issues',map:mapIssue},local_market_places:{table:'market_places',map:mapPlace},local_revisits:{table:'revisits',map:mapRevisit},local_handovers:{table:'handovers',map:mapHandover},local_area_reconciliations:{table:'area_reconciliations',map:mapReconciliation},local_chat_channels:{table:'chat_channels',map:mapChatChannel},local_chat_messages:{table:'chat_messages',map:mapChatMessage},local_notifications:{table:'notifications',map:mapNotification},catalogue_suggestions:{table:'catalogue_suggestions',map:mapCatalogueSuggestion}};
 const target=config[item.tableName]; if(!target)throw new Error(`SYNC_UNSUPPORTED_TABLE:${item.tableName}`);
 let mapped:Payload;
 if(item.tableName==='local_notifications' && item.action==='UPDATE'){
   mapped={is_read:!!p.isRead};
 } else if(item.tableName==='local_handovers' && item.action==='UPDATE'){
   mapped={};
   if(p.status!==undefined)mapped.status=p.status;
   mapped.updated_at=p.updatedAt||p.updated_at||new Date().toISOString();
 } else if(item.tableName==='local_revisits' && item.action==='UPDATE'){
   mapped={};
   if(p.status!==undefined)mapped.status=p.status;
   if(p.resolvedBy!==undefined)mapped.resolved_by=p.resolvedBy;
   if(p.resolutionNotes!==undefined)mapped.resolution_notes=p.resolutionNotes;
   if(p.resolvedAt!==undefined)mapped.resolved_at=p.resolvedAt;
   mapped.updated_at=p.updatedAt||p.updated_at||new Date().toISOString();
 } else if(item.tableName==='local_chat_messages' && item.action==='UPDATE'){
   mapped={};
   if(p.isPinned!==undefined)mapped.is_pinned=!!p.isPinned;
 } else if(item.tableName==='junction_branches' && item.action==='UPDATE'){
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
 const pending=(await OutboxRepository.getPending(limit)).sort((a,b)=>{const rank=(x:OutboxQueueItem)=>x.tableName==='local_chat_channels'?0:x.tableName==='local_chat_messages'?2:1;return rank(a)-rank(b)||a.clientTimestamp-b.clientTimestamp;}); let synced=0,failed=0;
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
 const db=getDatabase(); const local:Record<string,string>={businesses:'local_businesses',market_paths:'local_paths',local_field_issues:'local_field_issues',local_market_places:'local_market_places',local_revisits:'local_revisits',local_handovers:'local_handovers',local_area_reconciliations:'local_area_reconciliations',local_chat_messages:'local_chat_messages',local_notifications:'local_notifications',catalogue_suggestions:'local_catalogue_suggestions'};
 const table=local[tableName]; if(!table)return;
 await db.runAsync(`UPDATE ${table} SET sync_status = 'synced' WHERE id = ?;`,[id]).catch(()=>{});
}
