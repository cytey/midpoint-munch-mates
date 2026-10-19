/*
# Restrict auto-finish function to the scheduler

1. Plain-English summary
   The scheduled "finish expired votes" job is internal plumbing — no app
   user should call it directly. This removes the public's ability to run
   it; only the privileged scheduler (which bypasses grants) keeps access.

2. Security changes
   - REVOKE EXECUTE on finish_expired_votes from anon, authenticated, PUBLIC.
*/

REVOKE EXECUTE ON FUNCTION public.finish_expired_votes() FROM anon, authenticated, PUBLIC;
