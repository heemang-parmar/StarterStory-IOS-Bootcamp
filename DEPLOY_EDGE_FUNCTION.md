# Deploy Image Proxy Edge Function

## Prerequisites

1. **Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase@latest
```

2. **Login to Supabase**:
```bash
supabase login
```

3. **Link your project**:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
> You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

## Deploy the Edge Function

1. **Deploy the image-proxy function**:
```bash
supabase functions deploy image-proxy
```

2. **Verify deployment**:
The function should now be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/image-proxy
```

## Test the Function

You can test the function with a sample image:
```bash
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/image-proxy?path=54ad1545-7a46-4033-90b3-258a27677ce2-1753392919154.jpg&bucket=profile-images"
```

## How It Works

The Edge Function:
1. **Receives requests** with `path` and `bucket` parameters
2. **Downloads images** from Supabase Storage using service role
3. **Serves images** with proper CORS headers for mobile apps
4. **Caches images** for 24 hours for better performance

## Your App Integration

The app is already configured to use the proxy! It automatically:
- ✅ **Extracts filename** from Supabase storage URLs
- ✅ **Constructs proxy URLs** like: `/functions/v1/image-proxy?path=FILENAME&bucket=profile-images`
- ✅ **Loads images** through the proxy with proper caching

## Troubleshooting

If images still don't load:
1. **Check function logs**:
```bash
supabase functions logs image-proxy
```

2. **Verify environment variables** in Supabase dashboard:
   - `SUPABASE_URL` should be set automatically
   - `SUPABASE_SERVICE_ROLE_KEY` should be set automatically

3. **Test function directly** in browser:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/image-proxy?path=YOUR_IMAGE_FILENAME&bucket=profile-images
```

## Benefits

✅ **Solves CORS issues** - Mobile apps can now load images  
✅ **Better security** - Service role handles storage access  
✅ **Image caching** - 24-hour cache improves performance  
✅ **Error handling** - Proper HTTP status codes and CORS headers  
✅ **Future extensibility** - Can add image resizing, optimization, etc. 