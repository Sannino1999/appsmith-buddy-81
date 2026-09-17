/*
# Revoke public grants on admin tables

The `menu_edit_log` and `telegram_admins` tables contain sensitive admin/audit data
and should only be accessible via the service role key (which bypasses RLS).
Previously they had default grants to `anon` and `authenticated` roles.
This migration revokes those grants so only `service_role` can access them.

1. Security Changes
   - Revoke ALL privileges from `anon` and `authenticated` on `menu_edit_log`
   - Revoke ALL privileges from `anon` and `authenticated` on `telegram_admins`
   - RLS remains enabled (deny-by-default with no policies = no access for anon/authenticated)
*/

REVOKE ALL ON public.menu_edit_log FROM anon, authenticated;
REVOKE ALL ON public.telegram_admins FROM anon, authenticated;
