import { Session, sessionsAtom } from '@/lib/atoms';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Share } from 'react-native';
import { BrandColors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function Detail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sessions] = useAtom(sessionsAtom);
  const session = sessions.find((s: Session) => s.id === id);

  const handleShare = async () => {
    if (!session || !session.recipes || session.recipes.length === 0) return;

    try {
      const recipe = session.recipes[0];
      const message = `Check out this recipe I found: ${recipe.name}\n\nCooking time: ${recipe.cookingTime} min\nServings: ${recipe.servings}\nDifficulty: ${recipe.difficulty}\n\nMade with DishDecide!`;
      
      const result = await Share.share({
        message,
        title: recipe.name
      });

      if (result.action === Share.sharedAction) {
        console.log('Recipe shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error);
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

        {/* Share Button */}
        <TouchableOpacity 
          style={[styles.button, styles.shareButton]} 
          onPress={handleShare}
        >
          <Text style={styles.buttonText}>Share Recipe</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.buttonText}>Try another recipe</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: BrandColors.cream
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderLight,
    backgroundColor: BrandColors.white,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: BrandColors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.softBlack,
    letterSpacing: -0.3,
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
    backgroundColor: BrandColors.primary, 
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24, 
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonText: { 
    color: BrandColors.white, 
    fontSize: 17, 
    fontWeight: '600',
    letterSpacing: -0.3, 
  },
  shareButton: {
    backgroundColor: BrandColors.success,
    shadowColor: BrandColors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
