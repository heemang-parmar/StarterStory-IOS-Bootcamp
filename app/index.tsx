import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const nextPath = `/onboarding1`;
const loginPath = `/login`;

export default function Start() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.flexGrow} />
      <View style={styles.logoBox}>
        <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
      </View>
      <Text style={styles.title}>DishDecide</Text>
      <Text style={styles.subtitle}>Your Meal Planning companion</Text>
      <View style={styles.flexGrow} />
      <TouchableOpacity style={styles.button} onPress={() => router.push(nextPath)}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
      <Pressable onPress={() => router.push(loginPath)}>
        <Text style={styles.signInText}>or Sign In here</Text>
      </Pressable>
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
    fontSize: 36, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    textAlign: 'center', 
    color: '#000' 
  },
  subtitle: { 
    fontSize: 18, 
    color: '#000', 
    marginBottom: 32, 
    textAlign: 'center' 
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
  signInText: { 
    color: '#000', 
    fontSize: 16, 
    textAlign: 'center', 
    textDecorationLine: 'underline', 
    marginBottom: 24 
  },
});
