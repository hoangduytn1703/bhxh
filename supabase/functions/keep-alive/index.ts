/**
 * Optional: deploy with Supabase CLI and schedule in Dashboard (Cron) twice daily.
 * Set secrets: CRON_SECRET (optional), uses SUPABASE_SERVICE_ROLE_KEY from platform.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const auth = req.headers.get('Authorization') ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(url, serviceKey);

  const { data: rpcData, error: rpcError } = await supabase.rpc('health_ping');
  if (!rpcError) {
    return new Response(
      JSON.stringify({ ok: true, mode: 'rpc', at: rpcData ?? new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error: fallbackError } = await supabase.from('profiles').select('id').limit(1);
  if (fallbackError) {
    return new Response(JSON.stringify({ ok: false, error: fallbackError.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, mode: 'profiles_fallback', at: new Date().toISOString() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
