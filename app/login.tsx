import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Image source={require('../assets/images/icon.png')} style={styles.logoImage} />
      </View>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Ready to plan your next meal?</Text>
      <Text style={styles.label}>Email<Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        placeholder="ras@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.label}>Password<Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        placeholder="enter a secure password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
        <Text style={styles.buttonText}>{loading ? 'Logging In...' : 'Login'}</Text>
      </TouchableOpacity>
      <View style={styles.policyRow}>
        <TouchableOpacity><Text style={styles.policyLink}>Privacy Policy</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.policyLink}>Terms of Service</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.policyLink}>EULA</Text></TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.footerLink}>Need to make a new account?</Text>
        </TouchableOpacity>
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
    marginBottom: 24, 
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
    padding: 12, 
    marginBottom: 16, 
    fontSize: 16, 
    color: '#222', 
    width: '100%' 
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
  policyRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginVertical: 8 
  },
  policyLink: { 
    marginHorizontal: 8, 
    fontSize: 14, 
    color: '#000', 
    textDecorationLine: 'underline' 
  },
  footer: { 
    marginTop: 32, 
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
