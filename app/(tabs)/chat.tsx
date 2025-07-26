import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnread } from '@/lib/unreadContext';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  recipe_id?: string;
  is_read: boolean;
  created_at: string;
  sender_profile?: any;
  recipe?: any;
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshUnreadCount } = useUnread();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [partnerId, setPartnerId] = useState<string>('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadPartnerAndMessages();
    setupRealtimeSubscription();

    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Refresh messages and mark as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadMessages();
      return () => {};
    }, [])
  );

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('partner_messages_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'partner_messages'
      }, (payload) => {
        loadMessages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const loadPartnerAndMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      setUserId(session.user.id);

      // Get partner info
      const { data: partnership } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .single();

      if (!partnership) {
        router.replace('/(tabs)/settings');
        return;
      }

      const partnerIdValue = partnership.user1_id === session.user.id 
        ? partnership.user2_id 
        : partnership.user1_id;
      
      setPartnerId(partnerIdValue);

      // Get partner's profile
      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', partnerIdValue)
        .single();

      setPartner(partnerProfile);
      await loadMessages();
    } catch (error) {
      console.error('Error loading partner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: messages, error } = await supabase
        .from('partner_messages')
        .select('*')
        .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        // Don't throw, just log and continue with empty messages
      }

      setMessages(messages || []);

      // Mark messages as read
      const { error: updateError } = await supabase
        .from('partner_messages')
        .update({ is_read: true })
        .eq('recipient_id', session.user.id)
        .eq('is_read', false);

      if (!updateError) {
        // Refresh unread count after marking messages as read
        refreshUnreadCount();
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !partnerId || sending) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('partner_messages')
        .insert({
          sender_id: session.user.id,
          recipient_id: partnerId,
          message: inputText.trim()
        })
        .select();

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please ensure the partner_messages table is created in Supabase.');
        return;
      }

      setInputText('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const shareRecipe = async (recipeId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First share the recipe
      const { error: shareError } = await supabase
        .from('shared_recipes')
        .insert({
          recipe_id: recipeId,
          shared_by: session.user.id,
          shared_with: partnerId,
          message: 'Check out this recipe!'
        });

      if (shareError && !shareError.message.includes('already exists')) {
        throw shareError;
      }

      // Then send a message about it
      const { error: messageError } = await supabase
        .from('partner_messages')
        .insert({
          sender_id: session.user.id,
          recipient_id: partnerId,
          message: 'I shared a recipe with you!',
          recipe_id: recipeId
        });

      if (messageError) throw messageError;

      await loadMessages();
    } catch (error) {
      console.error('Error sharing recipe:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === userId;

    return (
      <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
        <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.message}
          </Text>

          {item.recipe && (
            <TouchableOpacity 
              style={styles.recipePreview}
              onPress={() => router.push(`/detail?id=${item.recipe.id}`)}
            >
              {item.recipe.image_url && (
                <Image 
                  source={{ uri: item.recipe.image_url }}
                  style={styles.recipeImage}
                />
              )}
              <Text style={styles.recipeTitle}>{item.recipe.title}</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
            {new Date(item.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat with {partner?.display_name || 'Partner'}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: keyboardHeight > 0 ? 20 : 10 }
          ]}
          onContentSizeChange={() => {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start a conversation with your partner!</Text>
            </View>
          }
        />

        <View style={[
          styles.inputContainer,
          { marginBottom: Platform.OS === 'ios' ? 0 : keyboardHeight }
        ]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            <Text style={[styles.sendText, (!inputText.trim() || sending) && styles.sendTextDisabled]}>
              {sending ? 'Sending...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  myMessageBubble: {
    backgroundColor: '#000',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  myMessageTime: {
    color: '#ccc',
  },
  recipePreview: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  recipeTitle: {
    padding: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  sendTextDisabled: {
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});