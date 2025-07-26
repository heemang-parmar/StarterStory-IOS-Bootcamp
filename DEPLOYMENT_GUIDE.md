# Edge Function Deployment Guide

## Prerequisites
1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Have your Supabase project credentials ready

## Steps to Deploy

### 1. Login to Supabase CLI
```bash
supabase login
```

### 2. Link your project
```bash
supabase link --project-ref ihbpcgpixmioqnfbjoqz
```

### 3. Set the OpenAI API Key
```bash
supabase secrets set OPENAI_API_KEY=your-openai-api-key-here
```

### 4. Deploy the edge function
```bash
supabase functions deploy openai-completion
```

### 5. Verify deployment
```bash
supabase functions list
```

## Testing the Complete Flow

1. **Open the app** on your device/simulator
2. **Tap the camera button** (📷) in the chat input area
3. **Take a photo** of your ingredients or refrigerator
4. **Add an optional message** like "healthy dinner ideas" or leave blank
5. **Send the message** and wait for recipe suggestions
6. **Check the results** - you should see:
   - Your uploaded photo
   - Detected ingredients
   - Personalized recipe suggestions based on the ingredients

## Troubleshooting

### If image upload fails:
- Check that the `ingredient-images` bucket exists in Supabase Storage
- Verify storage policies are set correctly

### If edge function fails:
- Check logs: `supabase functions logs openai-completion`
- Verify OPENAI_API_KEY is set correctly
- Ensure you have GPT-4 Vision API access in your OpenAI account

### If no recipes are generated:
- Check that the image is clear and ingredients are visible
- Try adding a text prompt along with the image
- Check edge function logs for any errors