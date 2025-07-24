import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Personalization() {
  const router = useRouter();
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

  const handleContinue = () => {
    router.push({ 
      pathname: '/personalizingscreen', 
      params: { 
        q1: cookingSkill, 
        q2: dietaryRestrictions.join(', '), 
        q3: favoriteCuisines,
        dietaryPreference 
      } 
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.spacer} />
      <View style={styles.logoBox}>
        <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
      </View>
      <Text style={styles.title}>Lets personalize</Text>
      <Text style={styles.subtitle}>your account</Text>

      {/* Cooking Skill Level Dropdown */}
      <Text style={styles.question}>What's your cooking skill level?<Text style={styles.required}>*</Text></Text>
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

      {/* Dietary Restrictions Multiselect */}
      <Text style={styles.question}>Any dietary restrictions?<Text style={styles.required}>*</Text></Text>
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

      {/* Dietary Preference Radio Buttons */}
      <Text style={styles.question}>Dietary preference?<Text style={styles.required}>*</Text></Text>
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
      <Text style={styles.question}>Favorite cuisines?<Text style={styles.required}>*</Text></Text>
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

      <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    padding: 24, 
    backgroundColor: '#fff' 
  },
  spacer: { height: 24 },
  logoBox: { 
    marginBottom: 24,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 0, 
    textAlign: 'center', 
    color: '#000', 
    marginTop: 0 
  },
  subtitle: { 
    fontSize: 20, 
    color: '#000', 
    marginBottom: 32, 
    textAlign: 'center', 
    fontWeight: '400' 
  },
  question: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 8, 
    color: '#000', 
    alignSelf: 'flex-start' 
  },
  required: { 
    color: 'red', 
    fontSize: 18 
  },
  input: { 
    backgroundColor: '#f3f3f3', 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 18, 
    fontSize: 16, 
    color: '#222', 
    width: '100%' 
  },
  choice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f3f3f3', 
    borderRadius: 10, 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    marginBottom: 12, 
    width: '100%' 
  },
  choiceSelected: { 
    backgroundColor: '#4CAF50' 
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
  choiceText: { 
    fontSize: 16, 
    color: '#888' 
  },
  choiceTextSelected: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  button: { 
    backgroundColor: '#000', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 20, 
    marginTop: 18, 
    width: '100%', 
    alignItems: 'center', 
    marginBottom: 18 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    width: '100%',
  },
  dropdownSelected: {
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#4CAF50',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    width: '100%',
  },
  radioOptionSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 16,
    color: '#888',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  cuisineChip: {
    backgroundColor: '#f3f3f3',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
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
});
