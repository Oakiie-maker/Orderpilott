/*
# Fix: Revoke explicit anon grant on generate_slug

Migration 0008 explicitly granted EXECUTE to anon on generate_slug.
The REVOKE FROM PUBLIC in migration 0010 removed the PUBLIC grant
but left the explicit anon grant in place.
*/

REVOKE EXECUTE ON FUNCTION public.generate_slug(text) FROM anon;
