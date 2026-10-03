import { AccessToken } from 'npm:livekit-server-sdk@2.13.3';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

Deno.serve(async(req)=>{
 try{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const auth=req.headers.get('Authorization');if(!auth)return Response.json({error:'Sign in required'},{status:401});
  const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:ue}=await supabase.auth.getUser();if(ue||!user)return Response.json({error:'Sign in required'},{status:401});
  const {channelId,callType='audio',roomName}=await req.json();if(!channelId||!['audio','video'].includes(callType))return Response.json({error:'Invalid call request'},{status:400});
  const {data:allowed,error:ae}=await supabase.rpc('can_access_chat_channel',{p_channel_id:channelId});if(ae||!allowed)return Response.json({error:'You cannot access this call'},{status:403});
  const room=roomName||('mm-'+channelId.replace(/[^a-zA-Z0-9_-]/g,'-')+'-'+Date.now());
  const key=Deno.env.get('LIVEKIT_API_KEY'),secret=Deno.env.get('LIVEKIT_API_SECRET'),url=Deno.env.get('LIVEKIT_URL');if(!key||!secret||!url)throw new Error('Calling service is not configured');
  const token=new AccessToken(key,secret,{identity:user.id,name:user.user_metadata?.full_name||user.email||'Market Mapper user',ttl:'15m'});
  token.addGrant({roomJoin:true,room,canPublish:true,canSubscribe:true});
  return Response.json({token:await token.toJwt(),url,room,callType});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Could not start call'},{status:500})}
});
