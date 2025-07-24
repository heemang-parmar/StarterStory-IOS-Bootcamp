import { Session, sessionsAtom } from '@/lib/atoms';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Detail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sessions] = useAtom(sessionsAtom);
  const session = sessions.find((s: Session) => s.id === id);

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Detail</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.error}>Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Detail</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{session.title || 'Detail'}</Text>
        {session.summary && <Text style={styles.summary}>{session.summary}</Text>}
        {session.image && <Image source={{ uri: session.image }} style={styles.image} />}
        {session.facts && (
          <View style={styles.factsContainer}>
            {session.facts.map((fact, idx) => (
              <View key={idx} style={styles.factBox}>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </View>
        )}
        {session.furtherImpact && (
          <View style={styles.impactBox}>
            <Text style={styles.impactText}>{session.furtherImpact}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.buttonText}>Try again?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: { 
    padding: 24 
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: { 
    textAlign: 'center', 
    color: '#ff3b30',
    fontSize: 16,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 12,
    color: '#000',
  },
  summary: { 
    fontSize: 16, 
    marginBottom: 12,
    lineHeight: 24,
    color: '#333',
  },
  image: { 
    width: '100%', 
    height: 200, 
    borderRadius: 8, 
    marginBottom: 12 
  },
  factsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8, 
    marginBottom: 12 
  },
  factBox: { 
    backgroundColor: '#f8f9fa', 
    padding: 12, 
    borderRadius: 8, 
    margin: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  factText: { 
    fontSize: 14,
    color: '#495057',
  },
  impactBox: { 
    backgroundColor: '#f8f9fa', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  impactText: { 
    fontSize: 14,
    lineHeight: 20,
    color: '#495057',
  },
  button: { 
    backgroundColor: '#007AFF', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});
