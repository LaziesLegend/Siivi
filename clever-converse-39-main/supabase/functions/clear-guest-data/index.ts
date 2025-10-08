import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guestSessionId } = await req.json();

    if (!guestSessionId) {
      return new Response(JSON.stringify({ error: "Guest session ID required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log(`Clearing guest data for session: ${guestSessionId}`);

    // Delete messages first (due to foreign key constraints)
    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('guest_session_id', guestSessionId);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
    }

    // Delete conversations
    const { error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('guest_session_id', guestSessionId);

    if (conversationsError) {
      console.error('Error deleting conversations:', conversationsError);
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('guest_session_id', guestSessionId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
    }

    console.log(`Successfully cleared guest data for session: ${guestSessionId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in clear-guest-data function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});