import { PersonalizationAnswers, personalizationAtom } from '@/lib/atoms';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSetAtom } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

const progressMessages = [
  'Finding perfect recipes based on your preferences...',
  'Analyzing your cooking skill level',
  'Personalizing your experience',
  'Almost done...'
];

export default function PersonalizingScreen() {
  const router = useRouter();
  const setPersonalization = useSetAtom(personalizationAtom);
  const { q1, q2, q3 } = useLocalSearchParams<{ q1?: string; q2?: string; q3?: string | string[] }>();

  const [messageIndex, setMessageIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // q3 may be a string or array depending on navigation
    const answers: PersonalizationAnswers = {
      q1: q1 || '',
      q2: q2 || '',
      q3: Array.isArray(q3) ? q3 : q3 ? [q3] : [],
    };
    setPersonalization(answers);

    // Animate percentage
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 7000,
      useNativeDriver: false,
    }).start();

    // Animate messages
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % progressMessages.length;
      setMessageIndex(msgIdx);
    }, 2000);

    // Update progress state for display
    const progressListener = progressAnim.addListener(({ value }) => {
      setProgress(Math.round(value));
    });

    // Go to signup after 7 seconds
    const timer = setTimeout(() => {
      clearInterval(msgInterval);
      progressAnim.removeListener(progressListener);
      router.replace('/signup');
    }, 7000);

    return () => {
      clearInterval(msgInterval);
      progressAnim.removeListener(progressListener);
      clearTimeout(timer);
    };
  }, [q1, q2, q3, setPersonalization, router, progressAnim]);

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