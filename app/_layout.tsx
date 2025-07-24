import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSessionAndOnboarding = async () => {
      // Check if user has seen onboarding
      const onboardingSeen = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(onboardingSeen === 'true');
      
      // Check authentication status
      const { data } = await supabase.auth.getSession();
      setIsSignedIn(!!data.session && !!data.session.user);
    };
    
    checkSessionAndOnboarding();
    
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const isAuthenticated = !!session && !!session.user;
      console.log('Auth state change:', event, 'isAuthenticated:', isAuthenticated);
      
      setIsSignedIn(isAuthenticated);
      
      if (event === 'SIGNED_IN' && isAuthenticated) {
        router.replace('/(tabs)');
      }
    });
    
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (!loaded || isSignedIn === null || hasSeenOnboarding === null) {
    return null;
  }

  // Show onboarding if user hasn't seen it yet, regardless of auth status
  const shouldShowOnboarding = !hasSeenOnboarding;

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{ headerShown: false }}
      >
        {shouldShowOnboarding ? (
          <>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding1" />
            <Stack.Screen name="onboarding2" />
            <Stack.Screen name="onboarding3" />
            <Stack.Screen name="onboardingPathos" />
            <Stack.Screen name="onboardingEthos" />
            <Stack.Screen name="onboardingLogos" />
            <Stack.Screen name="personalization" />
            <Stack.Screen name="personalizingscreen" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="login" />
            <Stack.Screen name="+not-found" />
          </>
        ) : (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
