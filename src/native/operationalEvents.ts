type Listener=()=>void;
const listeners=new Set<Listener>();
export function subscribeOperationalData(listener:Listener){listeners.add(listener);return()=>{listeners.delete(listener)}}
export function emitOperationalDataChanged(){for(const listener of [...listeners]){try{listener()}catch{}}}
