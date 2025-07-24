import { PersonalizationAnswers, personalizationAtom } from '@/lib/atoms';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSetAtom } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, StyleSheet, Text, View } from 'react-native';

const progressMessages = [
  'Finding perfect recipes based on your preferences...',
  'Analyzing your cooking skill level',
  'Personalizing your experience',
  'Saving your preferences...',
  'Almost done...'
];

export default function PersonalizingScreen() {
  const router = useRouter();
  const setPersonalization = useSetAtom(personalizationAtom);
  const { q1, q2, q3, dietaryPreference } = useLocalSearchParams<{ 
    q1?: string; 
    q2?: string; 
    q3?: string | string[]; 
    dietaryPreference?: string;
  }>();

  const [messageIndex, setMessageIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const savePreferences = async () => {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No session found');
          router.replace('/signup');
          return;
        }

        // Parse dietary restrictions from comma-separated string
        const dietaryRestrictions = q2 ? q2.split(', ').filter(item => item.trim() !== '') : [];
        
        // Parse favorite cuisines
        const favoriteCuisines = Array.isArray(q3) ? q3 : q3 ? [q3] : [];

        // Save preferences to database using upsert (insert or update)
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: session.user.id,
            cooking_skill: q1 || '',
            dietary_restrictions: dietaryRestrictions,
            dietary_preference: dietaryPreference || '',
            favorite_cuisines: favoriteCuisines,
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error saving preferences:', error);
          Alert.alert('Error', 'Failed to save your preferences. Please try again.');
          return;
        }

        console.log('Preferences saved successfully');

        // Also save to local storage for quick access
        const answers: PersonalizationAnswers = {
          q1: q1 || '',
          q2: q2 || '',
          q3: favoriteCuisines,
        };
        setPersonalization(answers);

      } catch (error) {
        console.error('Error in savePreferences:', error);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    };

    // Start saving preferences
    savePreferences();

    // Animate percentage
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 8000, // Increased to 8 seconds to allow for database save
      useNativeDriver: false,
    }).start();

    // Animate messages
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % progressMessages.length;
      setMessageIndex(msgIdx);
    }, 1600); // Slightly faster to fit more messages

    // Update progress state for display
    const progressListener = progressAnim.addListener(({ value }) => {
      setProgress(Math.round(value));
    });

    // Go to signup after 8 seconds
    const timer = setTimeout(() => {
      clearInterval(msgInterval);
      progressAnim.removeListener(progressListener);
      router.replace('/signup');
    }, 8000);

    return () => {
      clearInterval(msgInterval);
      progressAnim.removeListener(progressListener);
      clearTimeout(timer);
    };
  }, [q1, q2, q3, dietaryPreference, setPersonalization, router, progressAnim]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generating</Text>
      <Text style={styles.subtitle}>your first experience</Text>
      <View style={styles.logoBox}>
        <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
      </View>
      <Text style={styles.progress}>{progress}% complete</Text>
      <Text style={styles.progressSub}>{progressMessages[messageIndex]}</Text>
      <View style={styles.button}>
        <Text style={styles.buttonText}>Please Wait</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24, 
    backgroundColor: '#fff' 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 0, 
    textAlign: 'center', 
    color: '#000' 
  },
  subtitle: { 
    fontSize: 18, 
    color: '#000', 
    marginBottom: 32, 
    textAlign: 'center', 
    fontWeight: '400' 
  },
  logoBox: { 
    marginVertical: 32,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  progress: { 
    fontSize: 18, 
    color: '#666', 
    marginTop: 32, 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  progressSub: { 
    fontSize: 16, 
    color: '#666', 
    marginBottom: 32, 
    textAlign: 'center' 
  },
  button: { 
    backgroundColor: '#000', 
    paddingVertical: 16, 
    paddingHorizontal: 48, 
    borderRadius: 20, 
    marginTop: 24, 
    width: '100%', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
}); 