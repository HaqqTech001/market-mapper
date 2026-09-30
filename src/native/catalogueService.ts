import { nativeSupabase } from './supabase';
import { requireNativeUserContext } from './userContext';
import { getDatabase } from '@/src/db/sqlite';
async function admin(){const u=await requireNativeUserContext();if(u.role!=='admin')throw new Error('ADMIN_REQUIRED');return u}
export async function hydrateCatalogue(){
 const [{data:c,error:ce},{data:i,error:ie},{data:a,error:ae}]=await Promise.all([nativeSupabase.from('catalogue_categories').select('*').eq('is_archived',false),nativeSupabase.from('catalogue_items').select('*').eq('is_archived',false),nativeSupabase.from('catalogue_aliases').select('*')]);if(ce)throw ce;if(ie)throw ie;if(ae)throw ae;const db=getDatabase();
 for(const x of c||[])await db.runAsync("INSERT OR REPLACE INTO local_categories(id,name,icon_name,sort_order,created_at,updated_at,is_deleted) VALUES(?,?,?,?,?,?,0)",[x.id,x.name,x.icon_name||'Tag',x.sort_order||0,x.created_at,x.updated_at]);
 for(const x of i||[])await db.runAsync("INSERT OR REPLACE INTO local_catalogue_items(id,name,item_type,primary_category_id,is_archived,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",[x.id,x.name,x.item_type,x.primary_category_id||null,x.is_archived?1:0,x.created_at,x.updated_at]);
 for(const x of a||[])await db.runAsync("INSERT OR IGNORE INTO local_catalogue_aliases(id,catalogue_item_id,alias_name) VALUES(?,?,?)",[x.id,x.catalogue_item_id,x.alias_name]);
}
export async function listPendingCloudSuggestions(){await admin();const {data,error}=await nativeSupabase.from('catalogue_suggestions').select('*').eq('status','pending').order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function reviewSuggestion(id:string,decision:'approved'|'merged'|'rejected',mergedIntoId?:string,notes?:string){
 const u=await admin();if(decision==='merged'&&!mergedIntoId)throw new Error('MERGE_TARGET_REQUIRED');
 const {data:s,error:e}=await nativeSupabase.from('catalogue_suggestions').select('*').eq('id',id).single();if(e)throw e;
 let target=mergedIntoId||null;
 if(decision==='approved'){target='cat_'+Date.now().toString(36);const {error:ie}=await nativeSupabase.from('catalogue_items').insert({id:target,name:s.name,item_type:s.item_type,primary_category_id:s.suggested_category_id});if(ie)throw ie}
 const {error}=await nativeSupabase.from('catalogue_suggestions').update({status:decision,merged_into_id:target,reviewer_notes:notes||null,reviewed_by:u.userId,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('status','pending');if(error)throw error;
 await hydrateCatalogue();return target;
}

export async function listCanonicalCatalogueItems(){await admin();const {data,error}=await nativeSupabase.from('catalogue_items').select('id,name,item_type,primary_category_id').eq('is_archived',false).order('name');if(error)throw error;return data||[]}
export async function mergeSuggestion(id:string,targetId:string,notes?:string){
 await admin();const {data:s,error:se}=await nativeSupabase.from('catalogue_suggestions').select('name,item_type').eq('id',id).eq('status','pending').single();if(se)throw se;
 const {data:t,error:te}=await nativeSupabase.from('catalogue_items').select('id,item_type').eq('id',targetId).eq('is_archived',false).single();if(te)throw te;if(t.item_type!==s.item_type)throw new Error('MERGE_TYPE_MISMATCH');
 const alias=String(s.name||'').trim();if(alias){const {error:ae}=await nativeSupabase.from('catalogue_aliases').upsert({catalogue_item_id:targetId,alias_name:alias},{onConflict:'catalogue_item_id,alias_name'});if(ae)throw ae}
 return reviewSuggestion(id,'merged',targetId,notes);
}
export async function archiveCatalogueItem(id:string){await admin();const {error}=await nativeSupabase.from('catalogue_items').update({is_archived:true,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;const db=getDatabase();await db.runAsync("UPDATE local_catalogue_items SET is_archived=1,updated_at=? WHERE id=?",[new Date().toISOString(),id]);}
