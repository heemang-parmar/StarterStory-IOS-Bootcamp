import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OnboardingPathos() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.spacer} />
      <View style={styles.logoBox}>
        <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
      </View>
      <View style={styles.flexGrow} />
      <Text style={styles.title}>Not this fight again...</Text>
      <Text style={styles.subtitle}>The daily stress. The wasted time. The guilt of more takeout.</Text>
      <Text style={styles.description}>You deserve peaceful evenings and happy meals together. Let's end the dinner drama. Forever. ❤️❤️</Text>
      <View style={styles.flexGrow} />
      <TouchableOpacity style={styles.button} onPress={() => router.push('/personalization')}>
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
  subtitle: { 
    fontSize: 18, 
    color: '#000', 
    marginBottom: 16, 
    textAlign: 'center',
    lineHeight: 24,
  },
  description: { 
    fontSize: 18, 
    color: '#000', 
    marginBottom: 32, 
    textAlign: 'center',
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
