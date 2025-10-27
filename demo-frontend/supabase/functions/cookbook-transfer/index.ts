// supabase/functions/cookbook-transfer/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransferRequest {
  recipeId: string;
  userId: string;
}

interface TransferResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Category mapping from demo to cookbook (based on demo's enforced categories)
const CATEGORY_MAPPING: Record<string, string> = {
  // Direct mappings for demo's exact categories
  'appetizers': 'appetizers',
  'main-courses': 'main-courses', 
  'side-dishes': 'side-dishes',
  'soups': 'soups-stews',        // Map soups to cookbook's combined category
  'stews': 'soups-stews',        // Map stews to cookbook's combined category
  'salads': 'salads',
  'desserts': 'desserts',
  'breakfast&brunch': 'breakfast-brunch',  // Handle demo's & character
  'snacks': 'snacks',
  'beverages': 'beverages'
};

// Difficulty mapping from English to Hebrew for cookbook
const DIFFICULTY_MAPPING: Record<string, string> = {
  'easy': 'קלה',
  'medium': 'בינונית',
  'hard': 'קשה'
};

// Helper function to get MIME type from file extension
function getMimeTypeFromFilename(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop();
  
  const mimeTypeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'svg': 'image/svg+xml'
  };
  
  return mimeTypeMap[extension || ''] || 'image/jpeg'; // Default fallback
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request data
    const { recipeId, userId }: TransferRequest = await req.json()

    // Validate input
    if (!recipeId || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing recipeId or userId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }


    // Fetch recipe with all related data
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('*')
      .eq('id', recipeId)
      .single()

    if (recipeError || !recipe) {
      console.error('Recipe fetch error:', recipeError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Recipe not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate user access (user must own recipe or recipe must be public)
    if (recipe.user_id !== userId && !recipe.is_public) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized access to recipe' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch actual user data from Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !userData?.user) {
      console.error('User fetch error:', userError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to retrieve user information' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userEmail = userData.user.email || 'unknown@recipe-reader.com'

    // Generate signed URLs for images (24-hour expiry)
    const imageUrls: string[] = []
    const imageFilenames: string[] = []
    
    // Extract images from processed_recipe.images array
    const recipeData = recipe.processed_recipe || {};
    const images = recipeData.images || [];
    
    if (images && images.length > 0) {
      for (const filename of images) {
        if (filename) {
          // Demo storage path pattern: {user_id}/{recipe_id}/{filename}
          const storagePath = `${recipe.user_id}/${recipeId}/${filename}`
          
          const { data: signedUrl, error: urlError } = await supabase.storage
            .from('recipe-images')
            .createSignedUrl(storagePath, 24 * 60 * 60) // 24 hours

          if (urlError) {
            console.error(`Failed to create signed URL for ${storagePath}:`, urlError)
            continue
          }

          if (signedUrl?.signedUrl) {
            imageUrls.push(signedUrl.signedUrl)
            imageFilenames.push(filename)
          }
        }
      }
    }

    // Transform recipe data for cookbook schema
    const transformedRecipe = transformRecipeData(recipe, imageUrls, imageFilenames)

    // Publish to Google Cloud Pub/Sub
    const pubsubResult = await publishToPubSub(transformedRecipe, recipe, userEmail)

    if (!pubsubResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: pubsubResult.error 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }


    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Recipe successfully sent to cookbook' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Cookbook transfer error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function transformRecipeData(recipe: any, imageUrls: string[], imageFilenames: string[]) {
  // Extract the actual recipe data from demo's processed_recipe field
  const recipeData = recipe.processed_recipe || {};
  
  // Map category from demo to cookbook's expected categories
  const recipeCategory = recipeData.category?.toLowerCase() || recipeData.cuisine?.toLowerCase() || '';
  const mappedCategory = CATEGORY_MAPPING[recipeCategory] || 'main-courses';

  // Map difficulty from English to Hebrew
  const recipeDifficulty = recipeData.difficulty?.toLowerCase() || 'medium';
  const mappedDifficulty = DIFFICULTY_MAPPING[recipeDifficulty] || 'בינונית';

  // Build transformed recipe object
  const transformed = {
    // Basic recipe info
    name: recipeData.name || recipe.title || 'Untitled Recipe',
    prepTime: recipeData.prepTime || recipeData.prep_time || 0,
    waitTime: recipeData.cookTime || recipeData.cook_time || 0, // cookTime maps to waitTime in cookbook
    category: mappedCategory,
    
    // Pass through instructions/stages as-is (demo and cookbook have same structure)
    ...(recipeData.instructions && Array.isArray(recipeData.instructions) && recipeData.instructions.length > 0 
        ? { instructions: recipeData.instructions } 
        : {}),
    ...(recipeData.stages && Array.isArray(recipeData.stages) && recipeData.stages.length > 0 
        ? { stages: recipeData.stages } 
        : {}),
    
    // Handle ingredient_stages (structured sections) or ingredients (flat list)
    ...(recipeData.ingredient_stages && Array.isArray(recipeData.ingredient_stages) && recipeData.ingredient_stages.length > 0
        ? {
            // Transform ingredient_stages to Cookbook's ingredientSections format
            ingredientSections: recipeData.ingredient_stages.map((stage: any) => ({
              title: stage.title,
              items: stage.ingredients || []  // Map 'ingredients' field to 'items'
            }))
          }
        : recipeData.ingredients && Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0
        ? { ingredients: recipeData.ingredients }  // Pass flat ingredients as-is
        : {}),  // No ingredients at all

    // Additional fields
    description: recipeData.description || '',
    servings: recipeData.servings || 1,
    difficulty: mappedDifficulty,
    
    // Source metadata
    sourceApp: 'recipe-reader-demo',
    sourceRecipeId: recipe.id,
    sourceUserId: recipe.user_id,
    transferDate: new Date().toISOString(),
    
    // Images with 24-hour signed URLs
    imageUrls: imageUrls,
    images: imageUrls.map((url, index) => {
      const filename = imageFilenames[index] || `image-${index + 1}.jpg`;
      return {
        filename: filename,
        downloadUrl: url,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        contentType: getMimeTypeFromFilename(filename)
      };
    }),
    
    // Original recipe data for reference
    originalData: {
      source_url: recipe.source_url,
      source_type: recipe.source_type,
      source_data: recipe.source_data,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
      confidence_score: recipe.confidence_score
    }
  }

  return transformed
}

async function publishToPubSub(transformedRecipe: any, recipe: any, userEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const projectId = Deno.env.get('COOKBOOK_PROJECT_ID')!
    const topicName = Deno.env.get('COOKBOOK_PUBSUB_TOPIC')!
    const serviceAccountKey = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY')!

    // Parse service account key
    const credentials = JSON.parse(serviceAccountKey)

    // Create JWT token for Google Cloud authentication
    const jwt = await createJWT(credentials)

    // Prepare message for Pub/Sub - must match cookbook's expected format
    const pubsubMessage = {
      type: 'recipe-transfer-requested',
      recipeData: transformedRecipe,
      images: transformedRecipe.images,
      metadata: {
        userId: recipe.user_id,
        userEmail: userEmail,
        timestamp: new Date().toISOString(),
        confidenceScore: recipe.confidence_score || 0.95
      }
    }

    const message = {
      data: btoa(unescape(encodeURIComponent(JSON.stringify(pubsubMessage)))),
      attributes: {
        source: 'recipe-reader-demo',
        type: 'recipe-transfer-requested',
        timestamp: new Date().toISOString()
      }
    }

    // Publish to Pub/Sub via REST API
    const pubsubUrl = `https://pubsub.googleapis.com/v1/projects/${projectId}/topics/${topicName}:publish`
    
    const response = await fetch(pubsubUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [message]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pub/Sub publish failed:', response.status, errorText)
      return { 
        success: false, 
        error: `Pub/Sub publish failed: ${response.status}` 
      }
    }
    return { success: true }

  } catch (error) {
    console.error('Pub/Sub publish error:', error)
    return { 
      success: false, 
      error: `Failed to publish message: ${error.message}` 
    }
  }
}

async function createJWT(credentials: any): Promise<string> {
  // Create JWT for Google Cloud authentication
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/pubsub',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now
  }

  // Import private key for signing
  // Convert PEM to DER format - handle escaped newlines
  let pemKey = credentials.private_key
  
  // Handle escaped newlines from JSON
  if (pemKey.includes('\\n')) {
    pemKey = pemKey.replace(/\\n/g, '\n')
  }
  
  // Remove PEM headers and whitespace
  pemKey = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  
  const keyBuffer = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0))
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  )

  // Create and sign JWT
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  )

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  // Get access token from Google
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${encodedSignature}`
    })
  })

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${tokenResponse.status}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}