import { Session, sessionsAtom } from '@/lib/atoms';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React, { useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [sessions] = useAtom(sessionsAtom);
  const [input, setInput] = useState('');

  const handleSendMessage = () => {
    if (input.trim()) {
      router.push(`/loading?prompt=${encodeURIComponent(input.trim())}`);
      setInput('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Sessions</Text>
        <Text style={styles.headerSubtitle}>Ask anything to get started</Text>
      </View>
      
      <FlatList
        data={sessions}
        keyExtractor={(item: Session) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.sessionItem}
            onPress={() => router.push(`/detail?id=${item.id}`)}
          >
            <Text style={styles.sessionDate}>{item.date}</Text>
            <Text style={styles.sessionTitle}>{item.title}</Text>
            {item.summary && (
              <Text style={styles.sessionSummary} numberOfLines={2}>
                {item.summary}
              </Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Welcome! 👋</Text>
            <Text style={styles.emptyText}>
              You haven't created any sessions yet. Type a question below to get started with your first AI-powered experience.
            </Text>
            <View style={styles.suggestionContainer}>
              <Text style={styles.suggestionTitle}>Try asking:</Text>
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => setInput("What should I cook for dinner tonight?")}
              >
                <Text style={styles.suggestionText}>"What should I cook for dinner tonight?"</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => setInput("Help me plan a weekend trip")}
              >
                <Text style={styles.suggestionText}>"Help me plan a weekend trip"</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => setInput("Give me workout ideas for beginners")}
              >
                <Text style={styles.suggestionText}>"Give me workout ideas for beginners"</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask anything to get started..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!input.trim()}
        >
          <Text style={[styles.sendText, !input.trim() && styles.sendTextDisabled]}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: { 
    flexGrow: 1,
    padding: 24 
  },
  sessionItem: { 
    marginBottom: 16, 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sessionDate: { 
    fontSize: 12, 
    color: '#6c757d',
    marginBottom: 4,
  },
  sessionTitle: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sessionSummary: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  suggestionContainer: {
    width: '100%',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  suggestionButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  suggestionText: {
    fontSize: 14,
    color: '#495057',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e9ecef',
  },
  sendText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sendTextDisabled: {
    color: '#adb5bd',
  },
});
