import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Onboarding1() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.spacer} />
      <View style={styles.logoBox}>
        <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
      </View>
      <View style={styles.flexGrow} />
      <Text style={styles.title}>The Daily{"\n"}Dinner Dilemma</Text>
      <View style={styles.bulletContainer}>
        <Text style={styles.bulletPoint}>• "What should I cook?"</Text>
        <Text style={styles.bulletPoint}>• "I don't know, what do you want?"</Text>
        <Text style={styles.bulletPoint}>• "Just tell me what to make!"</Text>
      </View>
      <View style={styles.flexGrow} />
      <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding2')}>
        <Text style={styles.buttonText}>Next</Text>
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
