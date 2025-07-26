import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUnread } from '@/lib/unreadContext';

interface SharedRecipe {
  id: string;
  recipe_id: string;
  shared_by: string;
  shared_with: string;
  shared_at: string;
  message?: string;
  recipe: any;
  sharer_profile: any;
  reaction?: string;
}

export default function PartnerScreen() {
  const router = useRouter();
  const { markRecipesAsRead } = useUnread();
  const [sharedRecipes, setSharedRecipes] = useState<SharedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    loadPartnerData();
    setupRealtimeSubscription();
  }, []);

  // Mark recipes as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      markRecipesAsRead();
      return () => {};
    }, [])
  );

  const setupRealtimeSubscription = () => {
    // Subscribe to new shared recipes
    const sharedRecipesSubscription = supabase
      .channel('shared_recipes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shared_recipes'
      }, () => {
        loadSharedRecipes();
      })
      .subscribe();

    // Subscribe to reaction changes
    const reactionsSubscription = supabase
      .channel('recipe_reactions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recipe_reactions'
      }, () => {
        loadSharedRecipes();
      })
      .subscribe();

    return () => {
      sharedRecipesSubscription.unsubscribe();
      reactionsSubscription.unsubscribe();
    };
  };

  const loadPartnerData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      setUserId(session.user.id);

      // Get partner info
      const { data: partnership } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .single();

      if (!partnership) {
        // No partner, redirect to settings
        router.replace('/(tabs)/settings');
        return;
      }

      const partnerId = partnership.user1_id === session.user.id 
        ? partnership.user2_id 
        : partnership.user1_id;

      // Get partner's profile
      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', partnerId)
        .single();

      setPartner(partnerProfile);
      await loadSharedRecipes();
    } catch (error) {
      console.error('Error loading partner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedRecipes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get all shared recipes (both sent and received)
      const { data: shared, error } = await supabase
        .from('shared_recipes')
        .select('*')
        .or(`shared_by.eq.${session.user.id},shared_with.eq.${session.user.id}`)
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error loading shared recipes:', error);
        throw error;
      }

      console.log('Shared recipes found:', shared?.length || 0);

      // Get the recipe details for each shared recipe
      const recipeIds = [...new Set(shared?.map(s => s.recipe_id) || [])];
      
      if (recipeIds.length === 0) {
        console.log('No recipe IDs to fetch');
        setSharedRecipes([]);
        return;
      }

      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);

      if (recipesError) {
        console.error('Error loading recipe details:', recipesError);
      }

      console.log('Recipes loaded:', recipes?.length || 0);

      // Get reactions for these shared recipes
      const sharedRecipeIds = shared?.map(s => s.id) || [];
      const { data: reactions } = await supabase
        .from('recipe_reactions')
        .select('*')
        .in('shared_recipe_id', sharedRecipeIds);

      // Get sharer profiles
      const sharerIds = [...new Set(shared?.map(s => s.shared_by) || [])];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', sharerIds);

      // Combine data
      const recipesWithReactions = shared?.map(sharedRecipe => {
        const userReaction = reactions?.find(
          r => r.shared_recipe_id === sharedRecipe.id && r.user_id === session.user.id
        );
        const sharerProfile = profiles?.find(p => p.user_id === sharedRecipe.shared_by);
        const recipe = recipes?.find(r => r.id === sharedRecipe.recipe_id);
        
        return {
          ...sharedRecipe,
          recipe: recipe,
          sharer_profile: sharerProfile,
          reaction: userReaction?.reaction
        };
      }).filter(item => item.recipe !== undefined) || [];

      console.log('Final recipes with reactions:', recipesWithReactions.length);
      setSharedRecipes(recipesWithReactions);
    } catch (error) {
      console.error('Error loading shared recipes:', error);
    }
  };

  const handleReaction = async (sharedRecipeId: string, reaction: 'like' | 'dislike') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if user already reacted
      const currentRecipe = sharedRecipes.find(r => r.id === sharedRecipeId);
      
      if (currentRecipe?.reaction === reaction) {
        // Remove reaction
        await supabase
          .from('recipe_reactions')
          .delete()
          .eq('shared_recipe_id', sharedRecipeId)
          .eq('user_id', session.user.id);
      } else {
        // Add or update reaction
        await supabase
          .from('recipe_reactions')
          .upsert({
            shared_recipe_id: sharedRecipeId,
            user_id: session.user.id,
            reaction: reaction
          }, {
            onConflict: 'shared_recipe_id,user_id'
          });
      }

      // Reload to get updated reactions
      loadSharedRecipes();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSharedRecipes();
    setRefreshing(false);
  };

  const renderRecipeCard = ({ item }: { item: SharedRecipe }) => {
    const isFromPartner = item.shared_by !== userId;
    const recipe = item.recipe;
    
    if (!recipe) return null;

    return (
      <TouchableOpacity 
        style={styles.recipeCard}
        onPress={() => router.push(`/detail?id=${recipe.id}`)}
      >
        {/* Recipe Image */}
        {recipe.image_url && (
          <Image 
            source={{ uri: recipe.image_url }}
            style={styles.recipeImage}
            contentFit="cover"
          />
        )}
        
        {/* Recipe Content */}
        <View style={styles.recipeContent}>
          <View style={styles.recipeHeader}>
            <View style={styles.sharerInfo}>
              <Text style={styles.sharerText}>
                {isFromPartner ? `${item.sharer_profile?.display_name || 'Partner'} shared` : 'You shared'}
              </Text>
              <Text style={styles.shareDate}>
                {new Date(item.shared_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          {recipe.summary && (
            <Text style={styles.recipeSummary} numberOfLines={2}>
              {recipe.summary}
            </Text>
          )}

          {item.message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>"{item.message}"</Text>
            </View>
          )}

          {/* Reactions - only show for recipes shared by partner */}
          {isFromPartner && (
            <View style={styles.reactionContainer}>
              <TouchableOpacity 
                style={[
                  styles.reactionButton,
                  item.reaction === 'like' && styles.reactionButtonActive
                ]}
                onPress={() => handleReaction(item.id, 'like')}
              >
                <Text style={[
                  styles.reactionIcon,
                  item.reaction === 'like' && styles.reactionIconActive
                ]}>👍</Text>
                <Text style={[
                  styles.reactionText,
                  item.reaction === 'like' && styles.reactionTextActive
                ]}>Like</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.reactionButton,
                  item.reaction === 'dislike' && styles.reactionButtonActive
                ]}
                onPress={() => handleReaction(item.id, 'dislike')}
              >
                <Text style={[
                  styles.reactionIcon,
                  item.reaction === 'dislike' && styles.reactionIconActive
                ]}>👎</Text>
                <Text style={[
                  styles.reactionText,
                  item.reaction === 'dislike' && styles.reactionTextActive
                ]}>Dislike</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading shared recipes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shared with {partner?.display_name || 'Partner'}</Text>
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <Text style={styles.chatIcon}>💬</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sharedRecipes}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipeCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyText}>No shared recipes yet</Text>
            <Text style={styles.emptySubtext}>
              Share recipes from your history to start the conversation!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  chatButton: {
    padding: 8,
  },
  chatIcon: {
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recipeImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  recipeContent: {
    padding: 16,
  },
  recipeHeader: {
    marginBottom: 8,
  },
  sharerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharerText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  shareDate: {
    fontSize: 12,
    color: '#999',
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  recipeSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  messageBox: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  reactionContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    gap: 4,
  },
  reactionButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  reactionIcon: {
    fontSize: 16,
  },
  reactionIconActive: {
    fontSize: 18,
  },
  reactionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reactionTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});