import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:3000').split(',').filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  const isAllowed = ALLOWED_ORIGINS.includes(origin || '');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
}

interface RateLimitRecord {
  user_id: string
  requests_used: number
  requests_limit: number
  created_at: string
  updated_at: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...getCorsHeaders(req), ...securityHeaders } })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const recipeApiUrl = Deno.env.get('RECIPE_API_URL')!
    const recipeApiKey = Deno.env.get('RECIPE_API_KEY')!

    if (!supabaseUrl || !supabaseServiceKey || !recipeApiUrl || !recipeApiKey) {
      throw new Error('Missing required environment variables')
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...getCorsHeaders(req), ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...getCorsHeaders(req), ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check admin status from JWT app_metadata
    const isAdmin = user.app_metadata?.is_admin === true

    // Check rate limiting for non-admin users
    if (!isAdmin) {
      const { data: rateLimit, error: rateLimitError } = await supabase
        .from('demo_rate_limits')
        .select('*')
        .eq('user_id', user.id)
        .single() as { data: RateLimitRecord | null; error: any }

      if (rateLimitError && rateLimitError.code !== 'PGRST116') {
        throw rateLimitError
      }

      // Create rate limit record if it doesn't exist
      if (!rateLimit) {
        const { error: createError } = await supabase
          .from('demo_rate_limits')
          .insert({
            user_id: user.id,
            requests_used: 0,
            requests_limit: 5
          })

        if (createError) {
          throw createError
        }
      } else if (rateLimit.requests_used >= rateLimit.requests_limit) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded', 
            requests_used: rateLimit.requests_used,
            requests_limit: rateLimit.requests_limit
          }),
          { 
            status: 429, 
            headers: { ...getCorsHeaders(req), ...securityHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Extract endpoint from URL path
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const endpoint = pathSegments[pathSegments.length - 1]

    // Validate endpoint
    const validEndpoints = ['text', 'url', 'image']
    if (!validEndpoints.includes(endpoint)) {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint. Use: text, url, or image' }),
        { 
          status: 400, 
          headers: { ...getCorsHeaders(req), ...securityHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get request body
    const requestBody = await req.text()
    
    // Forward request to Recipe API
    const recipeApiEndpoint = `${recipeApiUrl}/api/v1/recipe/${endpoint}`
    const response = await fetch(recipeApiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        'X-API-Key': recipeApiKey,
      },
      body: requestBody,
    })

    // If request was successful, increment rate limit for non-admin users
    if (response.ok && !isAdmin) {
      const { error: incrementError } = await supabase
        .rpc('increment_rate_limit', { target_user_id: user.id })
      
      if (incrementError) {
        console.error('Error incrementing rate limit:', incrementError)
      }
    }

    // Get response data
    const responseData = await response.text()
    
    // Return response with CORS and security headers
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...getCorsHeaders(req),
        ...securityHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })

  } catch (error) {
    console.error('Recipe proxy error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), ...securityHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* 
Usage:
POST /functions/v1/recipe-proxy/text
POST /functions/v1/recipe-proxy/url  
POST /functions/v1/recipe-proxy/image

Headers:
Authorization: Bearer <jwt_token>
Content-Type: application/json (or multipart/form-data for images)

Body: Same as original Recipe API endpoints
*/