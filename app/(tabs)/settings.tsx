import { sessionsAtom } from '@/lib/atoms';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSetAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { decode } from 'base64-arraybuffer';

export default function Settings() {
  console.log('🔥 SETTINGS COMPONENT LOADED - v1.0 MVP 🔥');
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
      } else {
        // No profile found, try to create one
        console.log('No profile found, creating default profile');
        await createDefaultProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          display_name: 'User',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default profile:', error);
      } else {
        console.log('Default profile created:', data);
        setUserName(data.display_name || 'User');
      }
    } catch (error) {
      console.error('Error in createDefaultProfile:', error);
    }
  };

  const handleNameEdit = () => {
    setTempName(userName);
    setEditingName(true);
  };

  const handleNameCancel = () => {
    setTempName('');
    setEditingName(false);
  };

  const handleNameSave = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setSavingName(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({ display_name: tempName.trim() })
        .eq('user_id', session.user.id);

      if (error) throw error;

      setUserName(tempName.trim());
      setEditingName(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear stored sessions
              setSessions([]);
              
              // Clear onboarding flag
              await AsyncStorage.removeItem('hasSeenOnboarding');
              
              // Sign out from Supabase
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              
              // Navigate to login
              router.replace('/login');
            } catch (error) {
              console.log('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfileImage = async (imageAsset: any) => {
    try {
      setUploadingImage(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log('Starting image upload process...');
      console.log('Image asset:', {
        uri: imageAsset.uri,
        type: imageAsset.type,
        base64Length: imageAsset.base64?.length
      });

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

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      // Update user profile with image URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_image_url: publicUrl })
        .eq('user_id', session.user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      console.log('Profile updated with new image URL');
      setProfileImageUrl(publicUrl);
      setUseDirectUrl(true);
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', 'Failed to upload profile image');
    } finally {
      setUploadingImage(false);
    }
  };

  const getImageSource = () => {
    if (!profileImageUrl) return null;
    
    if (profileImageUrl.includes('supabase')) {
      return profileImageUrl;
    }
    
    return profileImageUrl;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.profileImageSection}>
                <TouchableOpacity onPress={pickImage} disabled={uploadingImage}>
                  {profileImageUrl ? (
                    <Image
                      source={{ uri: getImageSource() }}
                      style={styles.profileImage}
                      contentFit="cover"
                      onError={(e) => {
                        console.error('Image load error:', e);
                        setProfileImageUrl('');
                      }}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Text style={styles.profileImagePlaceholderText}>
                        {userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.editImageOverlay}>
                    <Text style={styles.editImageText}>
                      {uploadingImage ? 'Uploading...' : 'Edit'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.profileCard}>
                {/* Name */}
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Name</Text>
                  {editingName ? (
                    <TextInput
                      style={styles.profileInput}
                      value={tempName}
                      onChangeText={setTempName}
                      autoFocus
                      placeholder="Enter your name"
                    />
                  ) : (
                    <TouchableOpacity onPress={handleNameEdit} style={styles.profileValueContainer}>
                      <Text style={styles.profileValue}>{userName}</Text>
                      <Text style={styles.editIcon}>✏️</Text>
                    </TouchableOpacity>
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
              <Text style={styles.sectionTitle}>Preferences</Text>
              <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/preferences')}>
                <Text style={styles.linkText}>Edit Preferences</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
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
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#666',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  profileRow: {
    paddingVertical: 12,
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  profileValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editIcon: {
    fontSize: 16,
  },
  profileInput: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 4,
  },
  nameEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  nameButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#000',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 20,
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
});