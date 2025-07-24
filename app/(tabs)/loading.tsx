import { Session, sessionsAtom } from '@/lib/atoms';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

export default function LoadingScreen() {
  const router = useRouter();
  const { prompt } = useLocalSearchParams<{ prompt: string }>();
  const [, setSessions] = useAtom(sessionsAtom);

  useEffect(() => {
    const handleApiCall = async () => {
      try {
        if (!prompt) throw new Error('No prompt provided');
        
        console.log('Starting API call with prompt:', prompt);
        
        // Get the current session for authentication
        const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth error:', authError);
          throw new Error(`Authentication error: ${authError.message}`);
        }
        
        console.log('Auth session exists:', !!authSession);
        
        if (!authSession) {
          throw new Error('Not authenticated - please log in again');
        }
        
        console.log('Making API call to Supabase Edge Function...');
        console.log('URL:', 'https://ihbpcgpixmioqnfbjoqz.supabase.co/functions/v1/openai-completion');
        console.log('Token exists:', !!authSession.access_token);
        
        // Call the OpenAI completion endpoint with proper auth headers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch('https://ihbpcgpixmioqnfbjoqz.supabase.co/functions/v1/openai-completion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          
          // If it's a 401, the user might need to re-authenticate
          if (response.status === 401) {
            throw new Error('Authentication expired. Please log in again.');
          }
          
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Raw response data:', responseData);
        
        // Check if response has the expected structure
        if (!responseData || typeof responseData !== 'object') {
          console.error('Invalid response type:', typeof responseData);
          throw new Error('Invalid response format from API');
        }
        
        let recipeData;
        
        // Try to parse the response - handle different possible formats
        if (responseData.text) {
          try {
            recipeData = JSON.parse(responseData.text);
          } catch (parseError) {
            console.error('Failed to parse response.text as JSON:', parseError);
            throw new Error('Invalid JSON format in API response');
          }
        } else if (responseData.personalizedRecipes) {
          // Direct format
          recipeData = responseData;
        } else {
          console.error('Unexpected response structure:', responseData);
          throw new Error('Unexpected response format from API');
        }
        
        console.log('Parsed recipe data:', recipeData);
        
        // Ensure all recipes have at least 2 servings
        const recipesWithMinServings = (recipeData.personalizedRecipes || []).map((recipe: any) => ({
          ...recipe,
          servings: Math.max(recipe.servings || 1, 2)
        }));
        
        // Create a session object from the response
        const newSession: Session = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString(),
          title: recipeData.personalizedRecipes?.[0]?.name || 'Recipe Suggestions',
          summary: recipeData.validation || '',
          recipes: recipesWithMinServings,
          encouragement: recipeData.encouragement || '',
          shoppingTip: recipeData.shoppingTip || '',
          detectedIngredients: recipeData.detectedIngredients || '',
        };
        
        console.log('Created session object:', newSession);
        
        // Save recipe to Supabase database
        const { error: insertError } = await supabase
          .from('recipes')
          .insert({
            user_id: authSession.user.id,
            title: newSession.title,
            date: newSession.date,
            summary: newSession.summary,
            detected_ingredients: newSession.detectedIngredients,
            encouragement: newSession.encouragement,
            shopping_tip: newSession.shoppingTip,
            recipe_data: newSession.recipes
          });

        if (insertError) {
          console.error('Error saving recipe to database:', insertError);
          // Continue anyway - show the recipe even if saving failed
        } else {
          console.log('Recipe saved to database successfully');
        }
        
        setSessions((prev: Session[]) => [newSession, ...prev]);
        router.replace(`/detail?id=${newSession.id}`);
        
      } catch (error) {
        console.error('Full error details:', error);
        
        // Handle network timeout
        if (error instanceof Error && error.name === 'AbortError') {
          Alert.alert(
            'Timeout', 
            'The request took too long. Please try again.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
          return;
        }
        
        // More detailed error message
        let errorMessage = 'Unknown error occurred';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        Alert.alert(
          'Recipe Generation Failed', 
          `We couldn't generate your recipes right now: ${errorMessage}`,
          [
            { text: 'Try Again', onPress: () => router.replace('/(tabs)') },
            { text: 'Cancel', onPress: () => router.replace('/(tabs)') }
          ]
        );
      }
    };

    handleApiCall();
  }, [prompt, router, setSessions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Creating your personalized recipes</Text>
      <ActivityIndicator size="large" color="#000" style={styles.spinner} />
      <Text style={styles.subtitle}>Analyzing ingredients and preferences...</Text>
      <View style={styles.button}>
        <Text style={styles.buttonText}>Please Wait</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', alignItems:'center', padding:24, backgroundColor:'#fff' },
  title: { fontSize:24, fontWeight:'bold', marginBottom:16, textAlign:'center', color:'#000' },
  spinner: { marginVertical:24 },
  subtitle: { fontSize:16, color:'#666', marginBottom:24, textAlign:'center' },
  button: { backgroundColor:'#000', paddingVertical:12, paddingHorizontal:32, borderRadius:8 },
  buttonText: { color:'#fff', fontSize:16, fontWeight:'bold' }
});
