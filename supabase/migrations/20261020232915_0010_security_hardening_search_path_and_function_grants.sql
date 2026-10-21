/*
# Security Hardening: Address remaining advisor warnings

Three defense-in-depth improvements identified during the advisor review.
None are blocking vulnerabilities, but each reduces attack surface.

1. update_updated_at: Add SET search_path — the function body references no
   database objects so it's not exploitable, but setting search_path is the
   recommended pattern for all functions and silences the linter warning.

2. generate_slug: Revoke EXECUTE from anon. The function is only called from
   the onboarding page, which is behind authentication. Anon could previously
   probe slug existence (revealing which restaurant names are taken). Slugs
   are public URLs so this is low severity, but there's no reason for anon
   to call it.

3. get_next_order_number: Revoke EXECUTE from authenticated. Only create_order
   (which runs as SECURITY DEFINER) calls this function. Any signed-in user
   could previously learn a restaurant's order count by calling it. Revoking
   from authenticated means only the function owner (postgres) can call it
   directly, while create_order still works because it runs as DEFINER.
*/

-- 1. Harden update_updated_at with explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  new.updated_at := now();
  RETURN new;
END;
$function$;

-- 2. Revoke generate_slug from anon (only called from authenticated onboarding)
REVOKE EXECUTE ON FUNCTION public.generate_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_slug(text) TO authenticated;

-- 3. Revoke get_next_order_number from authenticated (only called by create_order as DEFINER)
REVOKE EXECUTE ON FUNCTION public.get_next_order_number(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_order_number(uuid) FROM authenticated;
