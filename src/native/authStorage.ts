import * as SecureStore from 'expo-secure-store';

const SESSION_FIRST_SEEN_KEY='mm.auth.session.first_seen';
export const SESSION_MAX_AGE_MS=7*24*60*60*1000;

export const nativeAuthStorage = {
  async getItem(key: string): Promise<string | null> { return SecureStore.getItemAsync(key); },
  async setItem(key: string, value: string): Promise<void> { await SecureStore.setItemAsync(key, value); },
  async removeItem(key: string): Promise<void> { await SecureStore.deleteItemAsync(key); },
};

export async function rememberSessionWindow(){
 const existing=await SecureStore.getItemAsync(SESSION_FIRST_SEEN_KEY);
 if(!existing)await SecureStore.setItemAsync(SESSION_FIRST_SEEN_KEY,String(Date.now()));
}
export async function clearSessionWindow(){await SecureStore.deleteItemAsync(SESSION_FIRST_SEEN_KEY)}
export async function isSessionWindowExpired(){
 const raw=await SecureStore.getItemAsync(SESSION_FIRST_SEEN_KEY);
 if(!raw)return false;
 const started=Number(raw);
 return Number.isFinite(started)&&Date.now()-started>=SESSION_MAX_AGE_MS;
}
