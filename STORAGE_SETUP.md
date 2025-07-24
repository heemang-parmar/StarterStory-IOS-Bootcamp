# Supabase Storage Setup for Profile Images

If you're getting 403 errors when uploading profile images, you need to set up the storage bucket manually in your Supabase dashboard.

## Method 1: Run the SQL (Recommended)

Run the updated `database-schema.sql` file in your Supabase SQL Editor. This will create the bucket and policies automatically.

## Method 2: Manual Setup via Dashboard

### Step 1: Create Storage Bucket
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Set bucket name: `profile-images`
5. Make sure **"Public bucket"** is checked ✅
6. Click **"Save"**

### Step 2: Set Storage Policies
1. In the Storage section, click on the `profile-images` bucket
2. Go to the **"Policies"** tab
3. Click **"New policy"**
4. Choose **"For full customization"**

**Policy 1 - Upload:**
```sql
Policy name: Anyone can upload profile images
Allowed operation: INSERT
Target roles: public
WITH CHECK expression: bucket_id = 'profile-images'
```

**Policy 2 - View:**
```sql
Policy name: Anyone can view profile images  
Allowed operation: SELECT
Target roles: public
USING expression: bucket_id = 'profile-images'
```

**Policy 3 - Update:**
```sql
Policy name: Anyone can update profile images
Allowed operation: UPDATE  
Target roles: public
USING expression: bucket_id = 'profile-images'
```

**Policy 4 - Delete:**
```sql
Policy name: Anyone can delete profile images
Allowed operation: DELETE
Target roles: public  
USING expression: bucket_id = 'profile-images'
```

### Step 3: Verify Setup
1. The bucket should appear in your Storage section
2. You should see 4 policies listed under the bucket
3. The bucket should be marked as "Public"

## Troubleshooting

### Common Issues:
- **403 Unauthorized**: Storage bucket doesn't exist or policies not configured
- **Bucket not found**: The `profile-images` bucket hasn't been created
- **Permission denied**: RLS policies are too restrictive

### Quick Test:
Try uploading a small test image through the Supabase dashboard Storage interface to verify the bucket is working.

## Alternative: Disable RLS (Not Recommended for Production)
If you're still having issues, you can temporarily disable RLS on storage.objects:
```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**Note**: This removes all security, so only use for testing! 