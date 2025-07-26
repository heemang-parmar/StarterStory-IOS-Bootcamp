# OpenAI Completion Edge Function

This edge function handles recipe generation with support for image analysis using GPT-4 Vision.

## Features

- Accepts text prompts for recipe suggestions
- Supports image analysis via URLs (downloads and processes images)
- Integrates with user preferences from the database
- Returns personalized recipe suggestions

## Setup

1. Deploy this function to Supabase:
   ```bash
   supabase functions deploy openai-completion
   ```

2. Set the required environment variable:
   ```bash
   supabase secrets set OPENAI_API_KEY=your-openai-api-key
   ```

## Request Format

```json
{
  "prompt": "Optional text prompt",
  "imageUrl": "Optional URL to an image in Supabase storage"
}
```

## Response Format

```json
{
  "detectedIngredients": "List of ingredients detected",
  "validation": "Brief validation of ingredients",
  "personalizedRecipes": [
    {
      "name": "Recipe Name",
      "cookingTime": 30,
      "difficulty": "Easy/Medium/Hard",
      "servings": 2,
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "Step-by-step instructions",
      "matchReason": "Why this recipe matches the user's preferences",
      "nutritionHighlight": "Key nutritional benefit"
    }
  ],
  "encouragement": "Motivational message",
  "shoppingTip": "Shopping or ingredient tip"
}
```

## How it works

1. When an image URL is provided, the function downloads the image from Supabase storage
2. Converts the image to base64 format
3. Sends to OpenAI's GPT-4 Vision API for ingredient analysis
4. Returns personalized recipes based on detected ingredients and user preferences