import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoBox}>
          <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
        </View>
        <Text style={styles.title}>Sign up</Text>
        <Text style={styles.subtitle}>so you can start your recommended journey</Text>
        
        <Text style={styles.label}>Email<Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email address"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        
        <Text style={styles.label}>Password<Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Create a secure password"
          placeholderTextColor="#999"
          secureTextEntry={true}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          value={password}
          onChangeText={setPassword}
        />
        
        <Text style={styles.label}>Confirm Password<Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Confirm your password"
          placeholderTextColor="#999"
          secureTextEntry={true}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          value={confirm}
          onChangeText={setConfirm}
        />
        
        <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{loading ? 'Signing Up...' : 'Sign Up'}</Text>
        </TouchableOpacity>
        
        <View style={styles.policyRow}>
          <TouchableOpacity><Text style={styles.policyLink}>Privacy Policy</Text></TouchableOpacity>
          <TouchableOpacity><Text style={styles.policyLink}>Terms of Service</Text></TouchableOpacity>
          <TouchableOpacity><Text style={styles.policyLink}>EULA</Text></TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.footerLink}>Already A User?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  scrollContainer: { 
    flexGrow: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24,
    paddingVertical: 40,
  },
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
    textAlign: 'center', 
    marginBottom: 8, 
    color: '#000' 
  },
  subtitle: { 
    fontSize: 18, 
    color: '#000', 
    textAlign: 'center', 
    marginBottom: 32, 
    fontWeight: '400' 
  },
  label: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    alignSelf: 'flex-start', 
    marginBottom: 8, 
    color: '#000' 
  },
  required: { 
    color: 'red', 
    fontSize: 16 
  },
  input: { 
    backgroundColor: '#f3f3f3', 
    borderRadius: 10, 
    padding: 16, 
    marginBottom: 20, 
    fontSize: 16, 
    color: '#222', 
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  passwordInput: {
    backgroundColor: '#f3f3f3',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  button: { 
    backgroundColor: '#000', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 20, 
    marginTop: 8, 
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
  policyRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  policyLink: { 
    marginHorizontal: 8, 
    fontSize: 14, 
    color: '#000', 
    textDecorationLine: 'underline',
    marginVertical: 4,
  },
  footer: { 
    marginTop: 24, 
    alignItems: 'center', 
    width: '100%' 
  },
  footerLink: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: 'bold', 
    textDecorationLine: 'underline' 
  },
});
