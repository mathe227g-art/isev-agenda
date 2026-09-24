// INITIAL_SESSION restores Supabase's persisted session. Refresh/focus events for
// the same account must not clear company data or unmount an open form.
/**
 * @param {import('@supabase/supabase-js').SupabaseClient['auth']} auth
 * @param {(user: import('@supabase/supabase-js').User|null) => void} onIdentity
 * @param {(user: import('@supabase/supabase-js').User) => void} onUserUpdated
 */
export function observeIdentity(auth, onIdentity, onUserUpdated = () => {}) {
  let currentId;
  const {
    data: { subscription },
  } = auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    const nextId = user?.id ?? null;
    if (nextId === currentId) {
      if (event === "USER_UPDATED" && user) onUserUpdated(user);
      return;
    }
    currentId = nextId;
    onIdentity(user);
  });
  return () => subscription.unsubscribe();
}
