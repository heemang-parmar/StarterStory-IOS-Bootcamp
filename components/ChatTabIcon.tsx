import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { useUnread } from '@/lib/unreadContext';

interface ChatTabIconProps {
  color: string;
  size?: number;
}

export function ChatTabIcon({ color, size = 28 }: ChatTabIconProps) {
  const { unreadCount } = useUnread();

  return (
    <View style={styles.container}>
      <IconSymbol name="message.fill" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});