import { Session, sessionsAtom } from '@/lib/atoms';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Alert, Modal, TextInput } from 'react-native';

export default function Detail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sessions] = useAtom(sessionsAtom);
  const session = sessions.find((s: Session) => s.id === id);
  const [hasPartner, setHasPartner] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [partnerId, setPartnerId] = useState<string>('');

  useEffect(() => {
    checkPartnerStatus();
  }, []);

  const checkPartnerStatus = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const { data: partnership } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user1_id.eq.${authSession.user.id},user2_id.eq.${authSession.user.id}`)
        .single();

      if (partnership) {
        setHasPartner(true);
        
        // Get partner's ID and profile
        const partnerIdValue = partnership.user1_id === authSession.user.id 
          ? partnership.user2_id 
          : partnership.user1_id;

        setPartnerId(partnerIdValue);

        const { data: partnerProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', partnerIdValue)
          .single();

        setPartner(partnerProfile);
      }
    } catch (error) {
      console.error('Error checking partner status:', error);
    }
  };

  const shareWithPartner = async () => {
    if (!session || !partner) return;

    try {
      setSharing(true);
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      // Get recipe from database
      const { data: dbRecipe } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (!dbRecipe) {
        Alert.alert('Error', 'Recipe not found in database');
        return;
      }

      // Check if already shared
      const { data: existing } = await supabase
        .from('shared_recipes')
        .select('*')
        .eq('recipe_id', id)
        .eq('shared_by', authSession.user.id)
        .single();

      if (existing) {
        Alert.alert('Info', 'This recipe has already been shared with your partner');
        return;
      }

      // Share the recipe
      const { error } = await supabase
        .from('shared_recipes')
        .insert({
          recipe_id: id,
          shared_by: authSession.user.id,
          shared_with: partnerId,
          message: shareMessage.trim() || null
        });

      if (error) throw error;

      Alert.alert('Success', 'Recipe shared with your partner!');
      setShowShareModal(false);
      setShareMessage('');
    } catch (error) {
      console.error('Error sharing recipe:', error);
      Alert.alert('Error', 'Failed to share recipe');
    } finally {
      setSharing(false);
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
              <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
          <Text style={styles.headerTitle}>Recipe Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.error}>Recipe not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Details</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* User's uploaded image */}
        {session.image && (
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>Your ingredients photo:</Text>
            <Image 
              source={{ uri: session.image }}
              style={styles.uploadedImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Validation/Summary */}
        {session.summary && (
          <View style={styles.validationBox}>
            <Text style={styles.validationText}>{session.summary}</Text>
          </View>
        )}

        {/* Detected Ingredients */}
        {session.detectedIngredients && (
          <View style={styles.ingredientsBox}>
            <Text style={styles.sectionTitle}>Detected Ingredients</Text>
            <Text style={styles.ingredientsText}>{session.detectedIngredients}</Text>
          </View>
        )}

        {/* Recipes */}
        {session.recipes && session.recipes.map((recipe, index) => (
          <View key={index} style={styles.recipeCard}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <View style={styles.recipeMetaRow}>
              <Text style={styles.recipeMeta}>⏱️ {recipe.cookingTime} min</Text>
              <Text style={styles.recipeMeta}>👥 {recipe.servings} servings</Text>
              <Text style={styles.recipeMeta}>📊 {recipe.difficulty}</Text>
            </View>
            
            <View style={styles.recipeSection}>
              <Text style={styles.recipeSectionTitle}>Why this recipe?</Text>
              <Text style={styles.recipeText}>{recipe.matchReason}</Text>
            </View>

            <View style={styles.recipeSection}>
              <Text style={styles.recipeSectionTitle}>Nutrition Highlight</Text>
              <Text style={styles.nutritionText}>{recipe.nutritionHighlight}</Text>
            </View>

            <View style={styles.recipeSection}>
              <Text style={styles.recipeSectionTitle}>Ingredients</Text>
              {recipe.ingredients.map((ingredient, idx) => (
                <Text key={idx} style={styles.ingredientItem}>• {ingredient}</Text>
              ))}
            </View>

            <View style={styles.recipeSection}>
              <Text style={styles.recipeSectionTitle}>Instructions</Text>
              <Text style={styles.instructionsText}>{recipe.instructions}</Text>
            </View>
          </View>
        ))}

        {/* Encouragement */}
        {session.encouragement && (
          <View style={styles.encouragementBox}>
            <Text style={styles.encouragementText}>💪 {session.encouragement}</Text>
          </View>
        )}

        {/* Shopping Tip */}
        {session.shoppingTip && (
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 Shopping Tip</Text>
            <Text style={styles.tipText}>{session.shoppingTip}</Text>
          </View>
        )}

        {/* Share with Partner Button */}
        {hasPartner && (
          <TouchableOpacity 
            style={[styles.button, styles.shareButton]} 
            onPress={() => setShowShareModal(true)}
          >
            <Text style={styles.buttonText}>Share with {partner?.display_name || 'Partner'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.buttonText}>Try another recipe</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Recipe</Text>
            <Text style={styles.modalSubtitle}>
              Share "{session.title}" with {partner?.display_name || 'your partner'}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Add a message (optional)"
              value={shareMessage}
              onChangeText={setShareMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowShareModal(false);
                  setShareMessage('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.shareModalButton]}
                onPress={shareWithPartner}
                disabled={sharing}
              >
                <Text style={styles.shareModalButtonText}>
                  {sharing ? 'Sharing...' : 'Share Recipe'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: { 
    padding: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: { 
    textAlign: 'center', 
    color: '#ff3b30',
    fontSize: 16,
  },
  imageContainer: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    padding: 12,
    paddingBottom: 8,
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  validationBox: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  validationText: {
    fontSize: 16,
    color: '#2e7d2e',
    lineHeight: 24,
  },
  ingredientsBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  ingredientsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  recipeCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recipeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  recipeMeta: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  recipeSection: {
    marginBottom: 16,
  },
  recipeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  recipeText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  nutritionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    lineHeight: 20,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#333',
    lineHeight: 24,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  encouragementBox: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  encouragementText: {
    fontSize: 16,
    color: '#856404',
    fontWeight: '500',
    lineHeight: 24,
  },
  tipBox: {
    backgroundColor: '#d1ecf1',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#bee5eb',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c5460',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#0c5460',
    lineHeight: 20,
  },
  button: { 
    backgroundColor: '#007AFF', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  shareButton: {
    backgroundColor: '#4CAF50',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  shareModalButton: {
    backgroundColor: '#4CAF50',
  },
  shareModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
