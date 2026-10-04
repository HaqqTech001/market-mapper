import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@/src/types';

export function MessageMeta({
  message,
  isMine,
}: {
  message: ChatMessage;
  isMine: boolean;
}) {
  const created = new Date(message.createdAt);
  const time = Number.isNaN(created.getTime())
    ? ''
    : created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.row}>
      {message.isPinned ? (
        <Ionicons name="pin" size={11} color="#64748B" />
      ) : null}
      {time ? <Text style={styles.time}>{time}</Text> : null}
      {isMine ? (
        <Ionicons name="checkmark-done" size={14} color="#047857" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  time: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
});
