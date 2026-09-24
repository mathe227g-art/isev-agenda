import { createClient } from "@supabase/supabase-js";
// Publishable key: access is enforced by the existing Supabase RLS policies.
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://qfvaqgibefwpeyaowwxe.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_z8YrZmi6oQK9OBSB2dkUVQ_TOQAJVI5",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
