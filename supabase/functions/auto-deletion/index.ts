import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting auto-deletion process...')

    // Check and schedule auto-deletion
    const { error: checkError } = await supabase.rpc('check_auto_deletion')
    if (checkError) {
      console.error('Error checking auto-deletion:', checkError)
      throw checkError
    }

    // Perform auto-deletion of expired data
    const { error: deleteError } = await supabase.rpc('perform_auto_deletion')
    if (deleteError) {
      console.error('Error performing auto-deletion:', deleteError)
      throw deleteError
    }

    // Reset daily message counts
    const { error: resetError } = await supabase.rpc('reset_daily_message_counts')
    if (resetError) {
      console.error('Error resetting message counts:', resetError)
      throw resetError
    }

    console.log('Auto-deletion process completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Auto-deletion process completed',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Auto-deletion error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})