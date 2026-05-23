-- Lightweight DB ping for keep-alive cron (run once in Supabase SQL Editor).
-- Callable via PostgREST: POST /rest/v1/rpc/health_ping

CREATE OR REPLACE FUNCTION public.health_ping()
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT now();
$$;

REVOKE ALL ON FUNCTION public.health_ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.health_ping() TO anon, authenticated, service_role;
