import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

//Change this to whichever onboarding you choose (/onboardingPathos,/onboardingEthos,/onboardingLogos)
const nextPath = `/onboardingPathos`

export default function Onboarding3() {
  const router = useRouter();
  
  const handleContinue = async () => {
    // Mark onboarding as complete
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.push(nextPath);
  };

  return (
    <View style={styles.container}>
      <View style={styles.spacer} />
      <View style={styles.logoBox}>
        <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
      </View>
      <View style={styles.flexGrow} />
      <Text style={styles.title}>Decide Together{"\n"}in Minutes</Text>
      <View style={styles.bulletContainer}>
        <Text style={styles.bulletPoint}>• Input your ingredients</Text>
        <Text style={styles.bulletPoint}>• Get 3 personalized recipes</Text>
        <Text style={styles.bulletPoint}>• Share & vote with partner</Text>
        <Text style={styles.bulletPoint}>• Cook with confidence</Text>
      </View>
      <View style={styles.flexGrow} />
      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      <View style={styles.spacer} />
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
  spacer: { height: 40 },
  logoBox: { 
    marginBottom: 32,
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
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 24, 
    textAlign: 'center', 
    color: '#000',
    lineHeight: 40,
  },
  bulletContainer: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  bulletPoint: { 
    fontSize: 18, 
    color: '#000', 
    marginBottom: 12,
    textAlign: 'left',
    lineHeight: 24,
  },
  flexGrow: { flex: 1 },
  button: { 
    backgroundColor: '#000', 
    paddingVertical: 16, 
    paddingHorizontal: 48, 
    borderRadius: 20, 
    marginBottom: 12, 
    width: '100%' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
});
