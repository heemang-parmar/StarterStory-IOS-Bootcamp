import { sessionsAtom } from '@/lib/atoms';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSetAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { decode } from 'base64-arraybuffer';

// Partner Section Component
function PartnerSection() {
  const [partner, setPartner] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);

  useEffect(() => {
    loadPartnerData();
  }, []);

  const loadPartnerData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Store session for later use
      setCurrentSession(session);

      // Check if user has a partner
      const { data: partnership } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .single();

      if (partnership) {
        // Get partner's ID
        const partnerId = partnership.user1_id === session.user.id 
          ? partnership.user2_id 
          : partnership.user1_id;

        // Get partner's profile
        const { data: partnerProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', partnerId)
          .single();

        setPartner(partnerProfile);
      }

      // Get pending requests - use case-insensitive email matching
      const { data: requests, error: requestsError } = await supabase
        .from('partner_requests')
        .select('*')
        .eq('status', 'pending')
        .or(`sender_id.eq.${session.user.id},recipient_email.ilike.${session.user.email}`);

      console.log('Partner requests query result:', { requests, error: requestsError });
      console.log('Current user email:', session.user.email);
      console.log('Current user ID:', session.user.id);
      
      if (requestsError) {
        console.error('Error loading partner requests:', requestsError);
        // Only show error if user doesn't have a partner
        if (!partnership) {
          console.warn('Could not load partner requests - check RLS policies');
        }
        setPendingRequests([]);
      } else {
        setPendingRequests(requests || []);
        console.log('Found', requests?.length || 0, 'partner requests');
        
        // Get sender profiles for incoming requests
        if (requests && requests.length > 0) {
          const incomingRequests = requests.filter(r => r.recipient_email?.toLowerCase() === session.user.email?.toLowerCase());
          const senderIds = [...new Set(incomingRequests.map(r => r.sender_id))];
          
          if (senderIds.length > 0) {
            const { data: profiles } = await supabase
              .from('user_profiles')
              .select('user_id, display_name')
              .in('user_id', senderIds);
            
            // Attach profiles to requests
            const requestsWithProfiles = requests.map(req => ({
              ...req,
              sender_profile: profiles?.find(p => p.user_id === req.sender_id)
            }));
            
            setPendingRequests(requestsWithProfiles);
          }
        }
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
      // Don't show error alert if user already has a partner
      if (!partner) {
        // Only log the error, don't show alert
        console.warn('Partner data loading error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendPartnerRequest = async () => {
    if (!partnerEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if user already has a partner
      if (partner) {
        Alert.alert('Error', 'You already have a partner. Unlink first to add a new one.');
        return;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('partner_requests')
        .select('*')
        .eq('sender_id', session.user.id)
        .eq('recipient_email', partnerEmail)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        Alert.alert('Info', 'Request already sent to this email');
        return;
      }

      // Send new request
      const { error } = await supabase
        .from('partner_requests')
        .insert({
          sender_id: session.user.id,
          recipient_email: partnerEmail.trim().toLowerCase()
        });

      if (error) throw error;

      Alert.alert('Success', 'Partner request sent!');
      setShowAddPartnerModal(false);
      setPartnerEmail('');
      loadPartnerData();
    } catch (error) {
      console.error('Error sending partner request:', error);
      Alert.alert('Error', 'Failed to send partner request');
    } finally {
      setSending(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      console.log('Accepting partner request:', requestId);
      
      const { data, error } = await supabase.rpc('accept_partner_request', {
        request_id: requestId
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      console.log('Accept request result:', data);
      Alert.alert('Success', 'Partner request accepted!');
      
      // Reload partner data after a short delay
      setTimeout(() => {
        loadPartnerData();
      }, 500);
    } catch (error: any) {
      console.error('Error accepting request:', error);
      Alert.alert(
        'Error', 
        `Failed to accept request: ${error?.message || 'Unknown error'}`
      );
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('partner_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      loadPartnerData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const unlinkPartner = async () => {
    Alert.alert(
      'Unlink Partner',
      'Are you sure you want to unlink from your partner? This will remove all shared recipes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              // Delete partnership
              const { error } = await supabase
                .from('partnerships')
                .delete()
                .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);

              if (error) throw error;

              setPartner(null);
              Alert.alert('Success', 'Partner unlinked successfully');
            } catch (error) {
              console.error('Error unlinking partner:', error);
              Alert.alert('Error', 'Failed to unlink partner');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  const incomingRequests = pendingRequests.filter(req => 
    req.recipient_email?.toLowerCase() === currentSession?.user?.email?.toLowerCase()
  );
  const outgoingRequests = pendingRequests.filter(req => 
    req.sender_id === currentSession?.user?.id
  );

  return (
    <>
      {/* Debug info - only show when no partner */}
      {!partner && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Debug: {pendingRequests.length} total requests</Text>
          <Text style={styles.debugText}>Incoming: {incomingRequests.length} | Outgoing: {outgoingRequests.length}</Text>
          <TouchableOpacity onPress={loadPartnerData} style={styles.refreshButton}>
            <Text style={styles.refreshText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {partner ? (
        <View style={styles.partnerCard}>
          <View style={styles.partnerInfo}>
            <View style={styles.partnerAvatar}>
              {partner.profile_image_url ? (
                <Image
                  source={{ uri: partner.profile_image_url }}
                  style={styles.partnerAvatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.partnerAvatarText}>
                  {partner.display_name?.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.partnerName}>{partner.display_name}</Text>
          </View>
          <TouchableOpacity onPress={unlinkPartner} style={styles.unlinkButton}>
            <Text style={styles.unlinkText}>Unlink</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.linkButton} onPress={() => setShowAddPartnerModal(true)}>
          <Text style={styles.linkText}>Add Partner</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.requestsTitle}>Pending Invitations</Text>
          {incomingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <Text style={styles.requestText}>
                From: {request.sender_profile?.display_name || request.sender_id}
              </Text>
              <View style={styles.requestButtons}>
                <TouchableOpacity 
                  style={[styles.requestButton, styles.acceptButton]}
                  onPress={() => acceptRequest(request.id)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.requestButton, styles.rejectButton]}
                  onPress={() => rejectRequest(request.id)}
                >
                  <Text style={styles.rejectButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.requestsTitle}>Sent Requests</Text>
          {outgoingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <Text style={styles.requestText}>To: {request.recipient_email}</Text>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          ))}
        </View>
      )}

      {/* Add Partner Modal */}
      <Modal
        visible={showAddPartnerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPartnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Partner</Text>
            <Text style={styles.modalSubtitle}>
              Enter your partner's email address to send them an invitation
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="partner@email.com"
              value={partnerEmail}
              onChangeText={setPartnerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowAddPartnerModal(false);
                  setPartnerEmail('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.sendModalButton]}
                onPress={sendPartnerRequest}
                disabled={sending}
              >
                <Text style={styles.sendModalButtonText}>
                  {sending ? 'Sending...' : 'Send Invitation'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function Settings() {
  console.log('🔥 SETTINGS COMPONENT LOADED - NEW CODE VERSION 2.0 🔥');
  const router = useRouter();
  const setSessions = useSetAtom(sessionsAtom);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [useDirectUrl, setUseDirectUrl] = useState(false);
  const [joinedDate, setJoinedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }

      // Get user email and join date from auth
      setUserEmail(session.user.email || '');
      const createdAt = new Date(session.user.created_at);
      setJoinedDate(createdAt.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));

      // Get profile data from database
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      console.log('Profile query result:', { profile, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error loading profile:', error);
      }

      if (profile) {
        console.log('Setting profile data:', {
          display_name: profile.display_name,
          profile_image_url: profile.profile_image_url,
          profile_image_url_type: typeof profile.profile_image_url,
          profile_image_url_length: profile.profile_image_url?.length
        });
        setUserName(profile.display_name || 'User');
        setProfileImageUrl(profile.profile_image_url || '');
        console.log('Loaded profile from database:', {
          display_name: profile.display_name,
          profile_image_url: profile.profile_image_url
        });
      } else {
        // Create initial profile if it doesn't exist
        const initialName = session.user.user_metadata?.display_name || 
                           session.user.user_metadata?.full_name || 
                           'User';
        
        setUserName(initialName);
        
        // Create profile in database
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: session.user.id,
            display_name: initialName
          });

        if (createError) {
          console.error('Error creating profile:', createError);
        }
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNameEdit = () => {
    setTempName(userName);
    setEditingName(true);
  };

  const handleNameSave = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setSavingName(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }

      // Save to database
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: session.user.id,
          display_name: tempName.trim()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update name. Please try again.');
        return;
      }

      // Also update auth metadata for compatibility
      await supabase.auth.updateUser({
        data: { display_name: tempName.trim() }
      });

      setUserName(tempName.trim());
      setEditingName(false);
      Alert.alert('Success', 'Your name has been updated!');
    } catch (error) {
      console.error('Error in handleNameSave:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const handleNameCancel = () => {
    setTempName('');
    setEditingName(false);
  };

  const handleProfileImage = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Remove Photo', onPress: removePhoto },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return { cameraStatus, libraryStatus };
  };

  const takePhoto = async () => {
    try {
      const { cameraStatus } = await requestPermissions();
      
      if (cameraStatus !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Enable base64 for proper upload
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const { libraryStatus } = await requestPermissions();
      
      if (libraryStatus !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please enable photo library access in your device settings to select photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Enable base64 for proper upload
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadProfileImage = async (imageAsset: any) => {
    try {
      setUploadingImage(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'No active session found. Please sign in again.');
        return;
      }

      console.log('Starting image upload for user:', session.user.id);

      // Check if base64 data is available
      if (!imageAsset.base64) {
        Alert.alert('Error', 'Image data not available. Please try again.');
        return;
      }

      // Create a unique filename with user ID in the path
      const fileExt = imageAsset.uri.split('.').pop() || 'jpg';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      console.log('Generated filename:', fileName);
      console.log('Base64 string length:', imageAsset.base64.length);
      
      // Upload to Supabase Storage using base64-arraybuffer decode
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, decode(imageAsset.base64), {
          contentType: imageAsset.type || `image/${fileExt}`,
          upsert: true
        });
      
      console.log('Supabase upload response:', { data: uploadData, error: uploadError });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        
        // Check if it's a bucket not found error
        if (uploadError.message?.includes('Bucket not found')) {
          Alert.alert(
            'Storage Setup Required', 
            'The storage bucket needs to be created. Please contact support or run the database setup first.'
          );
        } else if (uploadError.message?.includes('403') || uploadError.message?.includes('Unauthorized')) {
          Alert.alert(
            'Permission Error', 
            'Storage permissions need to be configured. Please run the database setup to create storage policies.'
          );
        } else {
          Alert.alert('Upload Error', `Failed to upload image: ${uploadError.message || uploadError}`);
        }
        return;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL - try multiple approaches
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      console.log('Generated public URL:', imageUrl);
      console.log('URL data object:', urlData);
      
      // Alternative URL construction (sometimes needed for Supabase)
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const alternativeUrl = `${supabaseUrl}/storage/v1/object/public/profile-images/${fileName}`;
      console.log('Alternative URL construction:', alternativeUrl);
      
      // Use the official URL but log both for comparison
      const finalImageUrl = imageUrl;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: session.user.id,
          display_name: userName,
          profile_image_url: finalImageUrl
        }, {
          onConflict: 'user_id'
        });

      console.log('Database update payload:', {
        user_id: session.user.id,
        display_name: userName,
        profile_image_url: finalImageUrl
      });

      if (updateError) {
        console.error('Profile update error:', updateError);
        Alert.alert('Database Error', `Failed to update profile: ${updateError.message}`);
        return;
      }

      console.log('Profile updated successfully');
      setProfileImageUrl(finalImageUrl);
      setUseDirectUrl(false); // Reset to try proxy first for new image
      
      // Test if the image URL is accessible
      try {
        const testResponse = await fetch(finalImageUrl);
        console.log('Image URL test response:', {
          status: testResponse.status,
          ok: testResponse.ok,
          headers: Object.fromEntries(testResponse.headers.entries())
        });
      } catch (testError) {
        console.log('Image URL test failed:', testError);
      }
      
      // Force a reload of user profile to ensure UI is updated
      await loadUserProfile();
      
      Alert.alert('Success', 'Profile picture updated successfully!');

    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to update profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const removePhoto = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingImage(true);
              
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              // Update profile in database to remove image URL
              const { error } = await supabase
                .from('user_profiles')
                .upsert({
                  user_id: session.user.id,
                  display_name: userName,
                  profile_image_url: null
                }, {
                  onConflict: 'user_id'
                });

              if (error) {
                console.error('Error removing photo:', error);
                Alert.alert('Error', 'Failed to remove photo. Please try again.');
                return;
              }

              setProfileImageUrl('');
              
              // Force a reload of user profile to ensure UI is updated
              await loadUserProfile();
              
              Alert.alert('Success', 'Profile picture removed successfully!');
            } catch (error) {
              console.error('Error removing photo:', error);
              Alert.alert('Error', 'Failed to remove photo. Please try again.');
            } finally {
              setUploadingImage(false);
            }
          }
        }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            // Clear local sessions
            setSessions([]);
            // Sign out from Supabase
            await supabase.auth.signOut();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your recipes. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear local sessions first
              setSessions([]);
              
              // Get current user session
              const { data: { session } } = await supabase.auth.getSession();
              
              if (!session) {
                Alert.alert('Error', 'No active session found.');
                return;
              }

              // Delete all user's recipes from database first
              const { error: recipesError } = await supabase
                .from('recipes')
                .delete()
                .eq('user_id', session.user.id);

              if (recipesError) {
                console.error('Error deleting recipes:', recipesError);
                // Continue with account deletion even if recipes deletion fails
              }

              // Delete the user account using the correct method
              const { error: deleteError } = await supabase.rpc('delete_user');
              
              if (deleteError) {
                console.error('Error deleting user:', deleteError);
                Alert.alert('Error', 'Failed to delete account. Please contact support.');
                return;
              }

              // Clear onboarding state
              await AsyncStorage.removeItem('hasSeenOnboarding');
              
              // Redirect to signup page
              router.replace('/signup');
              
              // Show success message after a short delay
              setTimeout(() => {
                Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
              }, 500);
              
            } catch (error) {
              console.error('Error in delete account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
            }
          }
        }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Privacy Policy functionality would be implemented here.');
  };

  const handleTermsOfService = () => {
    Alert.alert('Terms of Service', 'Terms of Service functionality would be implemented here.');
  };

  const handleEULA = () => {
    Alert.alert('EULA', 'End User License Agreement functionality would be implemented here.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <View style={styles.profileCard}>
                {/* Profile Image */}
                <View style={styles.profileImageSection}>
                  <TouchableOpacity onPress={handleProfileImage} style={styles.profileImageContainer} disabled={uploadingImage}>
                    <View style={styles.profileImage}>
                      {uploadingImage ? (
                        <ActivityIndicator size="large" color="#007AFF" />
                      ) : profileImageUrl ? (
                        <>
                          {console.log('🚀 EXECUTING NEW PROXY CODE v2.0 🚀')}
                          {console.log('Displaying profile image via proxy for user:', userName)}
                          {(() => {
                            // Replace this with your actual Supabase URL
                            const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
                            
                                           // Extract the full path after '/profile-images/' from the storage URL
               const pathMatch = profileImageUrl.match(/\/profile-images\/(.+)$/);
               const profileImagePath = pathMatch ? pathMatch[1] : '';

               // Choose URL based on fallback state
               const imageUrl = useDirectUrl ? profileImageUrl : `${SUPABASE_URL}/functions/v1/image-proxy?path=${encodeURIComponent(profileImagePath)}&bucket=profile-images`;
                            
                                           console.log('Extracted storage path:', profileImagePath);
               console.log('Using', useDirectUrl ? 'DIRECT' : 'PROXY', 'URL:', imageUrl);
               console.log('Original storage URL:', profileImageUrl);
                            
                                           return (
                 <Image
                   source={{ 
                     uri: imageUrl,
                     headers: useDirectUrl ? undefined : {
                       'Cache-Control': 'no-cache'
                     }
                   }}
                   style={styles.profileImagePicture}
                   contentFit="cover"
                   transition={200}
                   cachePolicy="none"
                   onLoad={() => {
                     console.log('✅ Profile image loaded successfully via', useDirectUrl ? 'DIRECT URL' : 'PROXY');
                   }}
                   onError={(e) => {
                     console.log('❌ Image loading error:', e);
                     console.log('Failed URL was:', imageUrl);
                     if (!useDirectUrl) {
                       console.log('🔄 Switching to direct URL fallback...');
                       setUseDirectUrl(true);
                     }
                   }}
                 />
               );
                          })()}
                        </>
                      ) : (
                        <>
                          {console.log('No profile image URL, showing initials for:', userName)}
                          <Text style={styles.profileImageText}>{userName.charAt(0).toUpperCase()}</Text>
                        </>
                      )}
                    </View>
                    <Text style={styles.changePhotoText}>
                      {uploadingImage ? 'Uploading...' : 'Change Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Name */}
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Name</Text>
                  {editingName ? (
                    <View style={styles.nameEditContainer}>
                      <TextInput
                        style={styles.nameInput}
                        value={tempName}
                        onChangeText={setTempName}
                        placeholder="Enter your name"
                        autoFocus
                      />
                    </View>
                  ) : (
                    <View style={styles.nameDisplayContainer}>
                      <Text style={styles.profileValue}>{userName}</Text>
                      <TouchableOpacity onPress={handleNameEdit} style={styles.editButton}>
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {editingName && (
                  <View style={styles.nameEditButtons}>
                    <TouchableOpacity 
                      style={[styles.nameButton, styles.cancelButton]} 
                      onPress={handleNameCancel}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.nameButton, styles.saveButton]} 
                      onPress={handleNameSave}
                      disabled={savingName}
                    >
                      <Text style={styles.saveButtonText}>
                        {savingName ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.profileDivider} />

                {/* Email */}
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Email</Text>
                  <Text style={styles.profileValue}>{userEmail}</Text>
                </View>

                <View style={styles.profileDivider} />

                {/* Member Since */}
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Member Since</Text>
                  <Text style={styles.profileValue}>{joinedDate}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Partner</Text>
              <PartnerSection />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/preferences')}>
                <Text style={styles.linkText}>Edit Preferences</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Legal</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handlePrivacyPolicy}>
                <Text style={styles.linkText}>Privacy Policy</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={handleTermsOfService}>
                <Text style={styles.linkText}>Terms of Service</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={handleEULA}>
                <Text style={styles.linkText}>End User License Agreement</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Actions</Text>
              <TouchableOpacity style={styles.button} onPress={handleSignOut}>
                <Text style={styles.buttonText}>Sign Out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteAccount}>
                <Text style={styles.buttonText}>Delete Account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>DishDecide v1.0.0</Text>
              <Text style={styles.footerSubtext}>Your meal planning companion</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 50, // Same width as back button to center the title
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  profileCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  profileImagePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileImageText: {
    fontSize: 40,
    color: '#333',
    fontWeight: 'bold',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 12,
  },
  nameEditContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
  },
  nameInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
    minHeight: 20,
  },
  nameEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  nameButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  editButton: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  button: { 
    backgroundColor: '#000', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 12, 
    marginBottom: 12, 
    width: '100%',
    alignItems: 'center',
  },
  deleteButton: { 
    backgroundColor: '#ff4444',
    marginBottom: 0,
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  // Partner Section Styles
  partnerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  partnerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  unlinkButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  unlinkText: {
    fontSize: 14,
    color: '#ff4444',
    fontWeight: '500',
  },
  requestsSection: {
    marginTop: 16,
  },
  requestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rejectButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  sendModalButton: {
    backgroundColor: '#007AFF',
  },
  sendModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Debug styles
  debugInfo: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  refreshButton: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  refreshText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
