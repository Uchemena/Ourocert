// Shared CORS headers for Supabase Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin':
    Deno.env.get('SITE_URL') ?? 'https://ourocert.com',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
}
