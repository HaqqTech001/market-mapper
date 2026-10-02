import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export function AuthScreenShell({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  const insets = useSafeAreaInsets();
  return <SafeAreaView style={s.safe} edges={['top','right','bottom','left']}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[s.body,{paddingBottom:Math.max(24,insets.bottom+16)}]}
      >
        <View style={s.brand}><Text style={s.eyebrow}>MARKET MAPPER</Text><Text style={s.brandText}>Field Operations</Text></View>
        <View style={s.card}><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export const authStyles=StyleSheet.create({
 label:{color:'#374151',fontSize:13,fontWeight:'800',marginTop:14,marginBottom:6},
 input:{minHeight:52,borderWidth:2,borderColor:'#D1D5DB',borderRadius:12,backgroundColor:'#FFFFFF',paddingHorizontal:14,color:'#111827',fontSize:16},
 passwordRow:{minHeight:52,borderWidth:2,borderColor:'#D1D5DB',borderRadius:12,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center'},
 passwordInput:{flex:1,minHeight:50,paddingHorizontal:14,color:'#111827',fontSize:16},
 eye:{width:52,minHeight:50,alignItems:'center',justifyContent:'center'},
 primary:{minHeight:54,marginTop:20,borderRadius:12,backgroundColor:'#047857',alignItems:'center',justifyContent:'center',paddingHorizontal:16},
 primaryText:{color:'#FFFFFF',fontSize:16,fontWeight:'900'},link:{minHeight:44,justifyContent:'center',alignItems:'center',marginTop:8},
 linkText:{color:'#065F46',fontWeight:'900',fontSize:14},error:{marginTop:12,color:'#991B1B',fontSize:13,lineHeight:19,fontWeight:'700'},
 success:{marginTop:12,color:'#065F46',fontSize:13,lineHeight:19,fontWeight:'700'}
});
const s=StyleSheet.create({flex:{flex:1},safe:{flex:1,backgroundColor:'#F7FAF8'},body:{flexGrow:1,justifyContent:'center',paddingHorizontal:20,paddingTop:20},brand:{marginBottom:20},eyebrow:{color:'#047857',fontWeight:'900',fontSize:13,letterSpacing:1.5},brandText:{color:'#111827',fontWeight:'900',fontSize:28,marginTop:4},card:{borderWidth:2,borderColor:'#D1D5DB',borderRadius:18,padding:20,backgroundColor:'#FFFFFF'},title:{color:'#111827',fontSize:26,fontWeight:'900'},subtitle:{color:'#4B5563',fontSize:14,lineHeight:21,marginTop:6}});
