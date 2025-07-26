import { Session, sessionsAtom } from '@/lib/atoms';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Share } from 'react-native';
import { BrandColors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function HomeScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Load recipes from Supabase when component mounts
  useEffect(() => {
    loadRecipesFromDatabase();
  }, []);

  const loadRecipesFromDatabase = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No session found, skipping recipe load');
        return;
      }

      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading recipes:', error);
        return;
      }

      if (recipes && recipes.length > 0) {
        const sessionsFromDb: Session[] = recipes.map(recipe => ({
          id: recipe.id,
          date: recipe.date,
          title: recipe.title,
          summary: recipe.summary,
          detectedIngredients: recipe.detected_ingredients,
          encouragement: recipe.encouragement,
          shoppingTip: recipe.shopping_tip,
          recipes: recipe.recipe_data,
          image: recipe.image_url
        }));

        setSessions(sessionsFromDb);
        console.log('Loaded', recipes.length, 'recipes from database');
      }
    } catch (error) {
      console.error('Error in loadRecipesFromDatabase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (input.trim()) {
      router.push(`/loading?prompt=${encodeURIComponent(input.trim())}`);
      setInput('');
    }
  };

  const handleSurpriseMe = () => {
    const surprisePrompts = [
      "I have some leftover chicken and rice. What can I make?",
      "Quick healthy dinner with vegetables",
      "Creative pasta dish with what's in my pantry",
      "Easy breakfast with eggs and bread",
      "Healthy snack ideas with fruits",
      "Simple dessert with basic ingredients",
      "One-pot meal for busy weeknight",
      "Kid-friendly lunch ideas",
      "Vegetarian dinner with beans",
      "Quick meal with frozen ingredients"
    ];
    const randomPrompt = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
    router.push(`/loading?prompt=${encodeURIComponent(randomPrompt)}`);
  };

  const handleShareRecipe = async (item: Session) => {
    try {
      const recipe = item.recipes?.[0];
      if (!recipe) return;
      
      const message = `Check out this recipe: ${recipe.name}\n\nCooking time: ${recipe.cookingTime} min\nServings: ${recipe.servings}\n\nMade with DishDecide!`;
      
      await Share.share({
        message,
        title: recipe.name
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };


  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logoImage} />
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <IconSymbol name="gearshape.fill" size={24} color={BrandColors.warmGray} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Previous Recipes</Text>
        
        <FlatList
          data={sessions}
          keyExtractor={(item: Session) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sessionItem}
              onPress={() => router.push(`/detail?id=${item.id}`)}
            >
              <View style={styles.sessionContent}>
                <Text style={styles.sessionDate}>{item.date}</Text>
                <Text style={styles.sessionTitle}>{item.title}</Text>
              </View>
              <View style={styles.sessionActions}>
                <TouchableOpacity 
                  style={styles.shareButton} 
                  onPress={(e) => {
                    e.stopPropagation();
                    handleShareRecipe(item);
                  }}
                >
                  <IconSymbol name="square.and.arrow.up" size={20} color={BrandColors.primary} />
                </TouchableOpacity>
                <Text style={styles.sessionArrow}>→</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No previous recipes yet</Text>
              <Text style={styles.emptySubtext}>Start by asking something below!</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
      
      {/* Surprise Me Button */}
      <TouchableOpacity style={styles.surpriseButton} onPress={handleSurpriseMe}>
        <Text style={styles.surpriseIcon}>🎲</Text>
        <Text style={styles.surpriseText}>Surprise Me!</Text>
      </TouchableOpacity>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="ask something here to get started!"
          placeholderTextColor={BrandColors.warmGray}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!input.trim()}
        >
          <Text style={[styles.sendText, !input.trim() && styles.sendTextDisabled]}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BrandColors.cream,
    paddingTop: StatusBar.currentHeight || 44, // Add padding for status bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
  },
  logoBox: { 
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  logoImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  settingsButton: {
    padding: 10,
    borderRadius: 12,
  },
  settingsIcon: {
    fontSize: 24,
    color: BrandColors.warmGray,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: BrandColors.softBlack,
    marginBottom: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  listContainer: { 
    flexGrow: 1,
  },
  sessionItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 4,
    marginBottom: 12,
    backgroundColor: BrandColors.white,
    borderRadius: 16,
    shadowColor: BrandColors.warmGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionContent: {
    flex: 1,
  },
  sessionDate: { 
    fontSize: 14, 
    color: BrandColors.warmGray,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  sessionTitle: { 
    fontSize: 17, 
    fontWeight: '500',
    color: BrandColors.softBlack,
    letterSpacing: -0.3,
  },
  sessionArrow: {
    fontSize: 20,
    color: BrandColors.warmGray,
    marginLeft: 12,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    padding: 10,
    marginRight: 8,
    borderRadius: 8,
  },
  shareIcon: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 17,
    color: BrandColors.warmGray,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: BrandColors.warmGray,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 18,
    backgroundColor: BrandColors.lightBeige,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: BrandColors.warmGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    color: BrandColors.softBlack,
    fontSize: 16,
    paddingVertical: 4,
    letterSpacing: -0.3,
  },
  sendButton: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: BrandColors.primary,
    fontSize: 22,
    fontWeight: '600',
  },
  sendTextDisabled: {
    color: BrandColors.warmGray,
  },
  surpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  surpriseIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  surpriseText: {
    fontSize: 17,
    fontWeight: '600',
    color: BrandColors.white,
    letterSpacing: -0.3,
  },
});
