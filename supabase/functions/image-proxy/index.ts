// image-proxy.ts
// This Edge Function serves as a proxy for Supabase Storage images
// to bypass CORS restrictions in mobile apps

import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

// Disable JWT verification for this function to make it publicly accessible
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Get the image path from the URL
    const url = new URL(req.url);
    const imagePath = url.searchParams.get('path');
    const bucket = url.searchParams.get('bucket') || 'profile-images';
    
    if (!imagePath) {
      return new Response('Image path is required', { 
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('Fetching image:', { bucket, imagePath });

    // Initialize Supabase client with service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the image from storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(imagePath);

    if (error || !data) {
      console.error('Error fetching image:', error);
      return new Response('Image not found', { 
        status: 404,
        headers: corsHeaders
      });
    }

    // Determine content type based on file extension
    let contentType = 'image/jpeg'; // Default
    if (imagePath.endsWith('.png')) contentType = 'image/png';
    else if (imagePath.endsWith('.gif')) contentType = 'image/gif';
    else if (imagePath.endsWith('.webp')) contentType = 'image/webp';
    else if (imagePath.endsWith('.svg')) contentType = 'image/svg+xml';

    console.log('Serving image with content type:', contentType);

    // Convert to ArrayBuffer for better mobile compatibility
    const arrayBuffer = await data.arrayBuffer();
    
    // Return the image with appropriate headers
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Content-Length': arrayBuffer.byteLength.toString(),
      }
    });
  } catch (err) {
    console.error('Proxy error:', err);
    return new Response('Server error', { 
      status: 500,
      headers: corsHeaders
    });
  }
}); 