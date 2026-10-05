import { getDatabase } from '../sqlite';

export type BusinessCaptureDraftStatus = 'active' | 'saved_later';
export type BusinessCaptureDraft = {
  id: 'business_capture';
  status: BusinessCaptureDraftStatus;
  step: number;
  form: Record<string, any>;
  context?: { missionId?: string; pathSessionId?: string; latitude?: number; longitude?: number };
  updatedAt: string;
};

async function ensureTable(){
  await getDatabase().execAsync(`CREATE TABLE IF NOT EXISTS local_capture_drafts (
    id TEXT PRIMARY KEY,
    draft_type TEXT NOT NULL,
    status TEXT NOT NULL,
    step INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`);
}

export class CaptureDraftRepository {
  static async saveBusiness(draft: Omit<BusinessCaptureDraft,'id'|'updatedAt'>){
    await ensureTable(); const now=new Date().toISOString();
    await getDatabase().runAsync(
      `INSERT OR REPLACE INTO local_capture_drafts(id,draft_type,status,step,payload_json,updated_at) VALUES('business_capture','business',?,?,?,?,?);`,
      [draft.status,draft.step,JSON.stringify({form:draft.form,context:draft.context||{}}),now]
    );
  }
  static async getBusiness():Promise<BusinessCaptureDraft|null>{
    await ensureTable();
    const row=await getDatabase().getFirstAsync<any>(`SELECT * FROM local_capture_drafts WHERE id='business_capture';`);
    if(!row)return null;
    try{const p=JSON.parse(row.payload_json||'{}');return {id:'business_capture',status:row.status,step:Number(row.step||1),form:p.form||{},context:p.context||{},updatedAt:row.updated_at};}catch{return null}
  }
  static async discardBusiness(){await ensureTable();await getDatabase().runAsync(`DELETE FROM local_capture_drafts WHERE id='business_capture';`);}
  static async hasActiveBusiness(){const d=await this.getBusiness();return d?.status==='active';}
}
