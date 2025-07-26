// OpenAI Completion Edge Function
// This function handles recipe generation with support for image analysis

import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageUrl } = await req.json();
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Prepare the message for OpenAI
    let systemMessage = `You are a helpful cooking assistant that suggests personalized recipes based on available ingredients.
    
User preferences:
- Cooking skill: ${preferences?.cooking_skill || 'intermediate'}
- Dietary restrictions: ${preferences?.dietary_restrictions?.join(', ') || 'none'}
- Dietary preference: ${preferences?.dietary_preference || 'none'}
- Favorite cuisines: ${preferences?.favorite_cuisines?.join(', ') || 'any'}

Please provide recipe suggestions in the following JSON format:
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
}`;

    let userMessage = prompt || '';
    let imageBase64 = null;
    
    // If an image URL is provided, download and convert to base64
    if (imageUrl) {
      console.log('Fetching image from URL:', imageUrl);
      
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageArray = new Uint8Array(imageBuffer);
        
        // Convert to base64
        let binaryString = '';
        for (let i = 0; i < imageArray.length; i++) {
          binaryString += String.fromCharCode(imageArray[i]);
        }
        imageBase64 = btoa(binaryString);
        
        console.log('Image downloaded and converted to base64, length:', imageBase64.length);
        userMessage = `I've uploaded a photo of my ingredients/refrigerator. ${prompt || 'What recipes can I make with these ingredients?'}`;
      } catch (error) {
        console.error('Error fetching image:', error);
        throw new Error('Failed to process image from URL');
      }
    }

    // Call OpenAI API (you'll need to implement this with your OpenAI API key)
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageBase64 ? 'gpt-4-vision-preview' : 'gpt-4',
        messages: [
          { role: 'system', content: systemMessage },
          { 
            role: 'user', 
            content: imageBase64 ? [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ] : userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    const aiData = await openAIResponse.json();
    const aiResponse = aiData.choices[0].message.content;

    // Parse the AI response
    let recipeData;
    try {
      recipeData = JSON.parse(aiResponse);
    } catch (e) {
      // If parsing fails, return a structured error response
      recipeData = {
        detectedIngredients: imageUrl ? "Unable to analyze image" : prompt,
        validation: "I'll help you create recipes with your ingredients.",
        personalizedRecipes: [
          {
            name: "Simple Stir Fry",
            cookingTime: 20,
            difficulty: "Easy",
            servings: 2,
            ingredients: ["Available ingredients", "Basic seasonings"],
            instructions: "1. Prepare ingredients\n2. Heat pan\n3. Stir fry ingredients\n4. Season and serve",
            matchReason: "Quick and adaptable recipe",
            nutritionHighlight: "Balanced meal with vegetables"
          }
        ],
        encouragement: "Let's cook something delicious!",
        shoppingTip: "Check your pantry for basic seasonings"
      };
    }

    return new Response(
      JSON.stringify(recipeData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});