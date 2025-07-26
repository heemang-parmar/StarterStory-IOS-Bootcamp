import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

interface UnreadContextType {
  unreadCount: number;
  unreadRecipesCount: number;
  refreshUnreadCount: () => Promise<void>;
  refreshUnreadRecipesCount: () => Promise<void>;
  markRecipesAsRead: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextType>({
  unreadCount: 0,
  unreadRecipesCount: 0,
  refreshUnreadCount: async () => {},
  refreshUnreadRecipesCount: async () => {},
  markRecipesAsRead: async () => {},
});

export const useUnread = () => useContext(UnreadContext);

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadRecipesCount, setUnreadRecipesCount] = useState(0);
  const [lastSeenRecipeTime, setLastSeenRecipeTime] = useState<string | null>(null);

  const refreshUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUnreadCount(0);
        return;
      }

      const { count, error } = await supabase
        .from('partner_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', session.user.id)
        .eq('is_read', false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const loadLastSeenTime = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get or create user's last seen time for recipes
      const { data } = await supabase
        .from('user_profiles')
        .select('last_seen_recipes_at')
        .eq('user_id', session.user.id)
        .single();

      if (data?.last_seen_recipes_at) {
        setLastSeenRecipeTime(data.last_seen_recipes_at);
      } else {
        // If no last seen time, set it to now
        const now = new Date().toISOString();
        setLastSeenRecipeTime(now);
        await supabase
          .from('user_profiles')
          .update({ last_seen_recipes_at: now })
          .eq('user_id', session.user.id);
      }
    } catch (error) {
      console.error('Error loading last seen time:', error);
    }
  };

  const refreshUnreadRecipesCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !lastSeenRecipeTime) {
        setUnreadRecipesCount(0);
        return;
      }

      const { count, error } = await supabase
        .from('shared_recipes')
        .select('*', { count: 'exact', head: true })
        .eq('shared_with', session.user.id)
        .gt('shared_at', lastSeenRecipeTime);

      if (!error) {
        setUnreadRecipesCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread recipes count:', error);
    }
  };

  const markRecipesAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('user_profiles')
        .update({ last_seen_recipes_at: now })
        .eq('user_id', session.user.id);

      if (!error) {
        setLastSeenRecipeTime(now);
        setUnreadRecipesCount(0);
      }
    } catch (error) {
      console.error('Error marking recipes as read:', error);
    }
  };

  // Refresh recipes count when last seen time changes
  useEffect(() => {
    if (lastSeenRecipeTime) {
      refreshUnreadRecipesCount();
    }
  }, [lastSeenRecipeTime]);

  useEffect(() => {
    refreshUnreadCount();
    loadLastSeenTime();

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('unread_messages_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'partner_messages'
      }, () => {
        refreshUnreadCount();
      })
      .subscribe();

    // Subscribe to new shared recipes
    const recipesSubscription = supabase
      .channel('unread_recipes_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'shared_recipes'
      }, () => {
        refreshUnreadRecipesCount();
      })
      .subscribe();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshUnreadCount();
      loadLastSeenTime();
    });

    return () => {
      messagesSubscription.unsubscribe();
      recipesSubscription.unsubscribe();
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <UnreadContext.Provider value={{ 
      unreadCount, 
      unreadRecipesCount,
      refreshUnreadCount,
      refreshUnreadRecipesCount,
      markRecipesAsRead
    }}>
      {children}
    </UnreadContext.Provider>
  );
}