import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Preferences() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cookingSkill, setCookingSkill] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [dietaryPreference, setDietaryPreference] = useState('');
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);
  
  const cookingSkillLevels = [
    'Kitchen Newbie 🔰',
    'Home Chef Hero 👨‍🍳', 
    'Culinary Wizard 🧙‍♂️'
  ];
  
  const dietaryOptions = [
    'Gluten-Free',
    'Dairy-Free', 
    'Nut Allergies',
    'Low Sodium',
    'Diabetic Friendly',
    'Heart Healthy'
  ];
  
  const dietaryPreferences = ['Vegetarian', 'Non-Vegetarian', 'Vegan'];
  
  const cuisineOptions = [
    'Italian', 'Chinese', 'Indian', 'Mexican', 'Mediterranean',
    'Thai', 'Japanese', 'French', 'American', 'Korean',
    'Greek', 'Lebanese', 'Spanish', 'Vietnamese', 'Turkish'
  ];

  // Load existing preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error loading preferences:', error);
        Alert.alert('Error', 'Failed to load your preferences.');
        return;
      }

      if (data) {
        setCookingSkill(data.cooking_skill || '');
        setDietaryRestrictions(data.dietary_restrictions || []);
        setDietaryPreference(data.dietary_preference || '');
        setFavoriteCuisines(data.favorite_cuisines || []);
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setDietaryRestrictions(prev => 
      prev.includes(restriction) 
        ? prev.filter(r => r !== restriction) 
        : [...prev, restriction]
    );
  };

  const toggleCuisine = (cuisine: string) => {
    setFavoriteCuisines(prev => 
      prev.includes(cuisine) 
        ? prev.filter(c => c !== cuisine) 
        : [...prev, cuisine]
    );
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          cooking_skill: cookingSkill,
          dietary_restrictions: dietaryRestrictions,
          dietary_preference: dietaryPreference,
          favorite_cuisines: favoriteCuisines,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving preferences:', error);
        Alert.alert('Error', 'Failed to save your preferences. Please try again.');
        return;
      }

      Alert.alert('Success', 'Your preferences have been updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error in savePreferences:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Preferences</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
        </View>

        {/* Cooking Skill Level */}
        <Text style={styles.question}>What's your cooking skill level?</Text>
        {cookingSkillLevels.map(level => (
          <TouchableOpacity
            key={level}
            style={[styles.dropdownOption, cookingSkill === level && styles.dropdownSelected]}
            onPress={() => setCookingSkill(level)}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, cookingSkill === level && styles.radioSelected]}>
              {cookingSkill === level ? <View style={styles.radioInner} /> : null}
            </View>
            <Text style={[styles.optionText, cookingSkill === level && styles.optionTextSelected]}>{level}</Text>
          </TouchableOpacity>
        ))}

        {/* Dietary Restrictions */}
        <Text style={styles.question}>Any dietary restrictions?</Text>
        {dietaryOptions.map(restriction => (
          <TouchableOpacity
            key={restriction}
            style={[styles.choice, dietaryRestrictions.includes(restriction) && styles.choiceSelected]}
            onPress={() => toggleDietaryRestriction(restriction)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, dietaryRestrictions.includes(restriction) && styles.checkboxSelected]}>
              {dietaryRestrictions.includes(restriction) ? <View style={styles.checkboxInner} /> : null}
            </View>
            <Text style={[styles.choiceText, dietaryRestrictions.includes(restriction) && styles.choiceTextSelected]}>{restriction}</Text>
          </TouchableOpacity>
        ))}

        {/* Dietary Preference */}
        <Text style={styles.question}>Dietary preference?</Text>
        {dietaryPreferences.map(preference => (
          <TouchableOpacity
            key={preference}
            style={[styles.radioOption, dietaryPreference === preference && styles.radioOptionSelected]}
            onPress={() => setDietaryPreference(preference)}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, dietaryPreference === preference && styles.radioSelected]}>
              {dietaryPreference === preference ? <View style={styles.radioInner} /> : null}
            </View>
            <Text style={[styles.optionText, dietaryPreference === preference && styles.optionTextSelected]}>{preference}</Text>
          </TouchableOpacity>
        ))}

        {/* Favorite Cuisines */}
        <Text style={styles.question}>Favorite cuisines?</Text>
        <View style={styles.cuisineGrid}>
          {cuisineOptions.map(cuisine => (
            <TouchableOpacity
              key={cuisine}
              style={[styles.cuisineChip, favoriteCuisines.includes(cuisine) && styles.cuisineChipSelected]}
              onPress={() => toggleCuisine(cuisine)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cuisineText, favoriteCuisines.includes(cuisine) && styles.cuisineTextSelected]}>{cuisine}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.button, saving && styles.buttonDisabled]} 
          onPress={savePreferences} 
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Preferences'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 50,
  },
  content: { 
    flexGrow: 1, 
    padding: 24, 
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  logoBox: { 
    marginBottom: 24,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  logoImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  question: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    marginTop: 16,
    color: '#000', 
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  dropdownSelected: {
    backgroundColor: '#4CAF50',
  },
  choice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f3f3f3', 
    borderRadius: 10, 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    marginBottom: 8, 
  },
  choiceSelected: { 
    backgroundColor: '#4CAF50' 
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  radioOptionSelected: {
    backgroundColor: '#007AFF',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#fff',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  checkbox: { 
    width: 22, 
    height: 22, 
    borderRadius: 5, 
    borderWidth: 2, 
    borderColor: '#ccc', 
    backgroundColor: '#fff', 
    marginRight: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  checkboxSelected: { 
    borderColor: '#fff', 
    backgroundColor: '#4CAF50' 
  },
  checkboxInner: { 
    width: 12, 
    height: 12, 
    borderRadius: 2, 
    backgroundColor: '#fff' 
  },
  optionText: {
    fontSize: 16,
    color: '#888',
    flex: 1,
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  choiceText: { 
    fontSize: 16, 
    color: '#888',
    flex: 1,
  },
  choiceTextSelected: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  cuisineChip: {
    backgroundColor: '#f3f3f3',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
  },
  cuisineChipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  cuisineText: {
    fontSize: 14,
    color: '#888',
  },
  cuisineTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: { 
    backgroundColor: '#000', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 20, 
    marginTop: 24, 
    alignItems: 'center', 
    marginBottom: 24 
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
}); 