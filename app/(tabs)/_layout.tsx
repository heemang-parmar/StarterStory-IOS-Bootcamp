import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { ChatTabIcon } from '@/components/ChatTabIcon';
import { PartnerTabIcon } from '@/components/PartnerTabIcon';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [hasPartner, setHasPartner] = useState(false);

  useEffect(() => {
    checkPartnerStatus();
    
    // Subscribe to partnership changes
    const subscription = supabase
      .channel('partnership_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'partnerships'
      }, () => {
        checkPartnerStatus();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkPartnerStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: partnership } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .single();

      setHasPartner(!!partnership);
    } catch (error) {
      setHasPartner(false);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          // Remove display: 'none' to show tabs
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="partner"
        options={{
          title: 'Partner',
          tabBarIcon: ({ color }) => <PartnerTabIcon color={color} />,
          href: hasPartner ? undefined : null, // Hide tab if no partner
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <ChatTabIcon color={color} />,
          href: hasPartner ? undefined : null, // Hide tab if no partner
        }}
      />
      <Tabs.Screen
        name="detail"
        options={{
          title: 'Detail',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="loading"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
