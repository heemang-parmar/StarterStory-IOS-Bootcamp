import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { useUnread } from '@/lib/unreadContext';

interface PartnerTabIconProps {
  color: string;
  size?: number;
}

export function PartnerTabIcon({ color, size = 28 }: PartnerTabIconProps) {
  const { unreadRecipesCount } = useUnread();

  return (
    <View style={styles.container}>
      <IconSymbol name="heart.fill" size={size} color={color} />
      {unreadRecipesCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadRecipesCount > 99 ? '99+' : unreadRecipesCount}
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
    backgroundColor: '#4CAF50', // Green color for recipes
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