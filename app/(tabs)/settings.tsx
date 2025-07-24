import { sessionsAtom } from '@/lib/atoms';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSetAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
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
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'No active session found. Please sign in again.');
        return;
      }

      console.log('Starting image upload for user:', session.user.id);

      // Create a unique filename with user ID in the path
      const fileExt = imageUri.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      console.log('Generated filename:', fileName);
      
      // Convert image to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      console.log('Image blob created, size:', blob.size, 'type:', blob.type);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, blob, {
          contentType: blob.type || `image/${fileExt}`,
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        
        // Check if it's a bucket not found error
        if (uploadError.message.includes('Bucket not found')) {
          Alert.alert(
            'Storage Setup Required', 
            'The storage bucket needs to be created. Please contact support or run the database setup first.'
          );
        } else if (uploadError.message.includes('403') || uploadError.message.includes('Unauthorized')) {
          Alert.alert(
            'Permission Error', 
            'Storage permissions need to be configured. Please run the database setup to create storage policies.'
          );
        } else {
          Alert.alert('Upload Error', `Failed to upload image: ${uploadError.message}`);
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
});
