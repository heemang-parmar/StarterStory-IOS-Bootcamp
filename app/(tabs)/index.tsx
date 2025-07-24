import { Session, sessionsAtom } from '@/lib/atoms';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
          recipes: recipe.recipe_data
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
          <Text style={styles.settingsIcon}>⚙️</Text>
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
              <Text style={styles.sessionArrow}>→</Text>
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
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="ask something here to get started!"
          placeholderTextColor="#999"
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
    backgroundColor: '#fff',
    paddingTop: StatusBar.currentHeight || 44, // Add padding for status bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  logoBox: { 
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    fontWeight: '600',
  },
  listContainer: { 
    flexGrow: 1,
  },
  sessionItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionContent: {
    flex: 1,
  },
  sessionDate: { 
    fontSize: 14, 
    color: '#999',
    marginBottom: 4,
  },
  sessionTitle: { 
    fontSize: 16, 
    fontWeight: '500',
    color: '#000',
  },
  sessionArrow: {
    fontSize: 20,
    color: '#999',
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#000',
    borderRadius: 24,
    margin: 16,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sendButton: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sendTextDisabled: {
    color: '#666',
  },
});
