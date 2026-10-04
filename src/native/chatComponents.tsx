import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@/src/types';
export function MessageMeta({message,isMine,receiptState='sent'}:{message:ChatMessage;isMine:boolean;receiptState?:'sent'|'delivered'|'read'}){
 const created=new Date(message.createdAt);const time=Number.isNaN(created.getTime())?'':created.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 return <View style={s.row}>{message.isPinned?<Ionicons name="pin" size={11} color="#64748B"/>:null}{time?<Text style={s.time}>{time}</Text>:null}{isMine?<Ionicons name={receiptState==='sent'?'checkmark':'checkmark-done'} size={15} color={receiptState==='read'?'#16A34A':'#94A3B8'}/>:null}</View>
}
const s=StyleSheet.create({row:{marginTop:5,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:4},time:{color:'#64748B',fontSize:10,fontWeight:'600'}});