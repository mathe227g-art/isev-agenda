import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { observeIdentity } from "../lib/session.mjs";
let callback,
  closed = false;
const calls = [],
  updates = [];
const stop = observeIdentity(
  {
    onAuthStateChange(cb) {
      callback = cb;
      return {
        data: {
          subscription: {
            unsubscribe() {
              closed = true;
            },
          },
        },
      };
    },
  },
  (user) => calls.push(user?.id ?? null),
  (user) => updates.push(user.email),
);
callback("INITIAL_SESSION", { user: { id: "a" } });
callback("TOKEN_REFRESHED", { user: { id: "a" } });
callback("SIGNED_IN", { user: { id: "a" } });
callback("USER_UPDATED", { user: { id: "a", email: "new@example.invalid" } });
assert.deepEqual(calls, ["a"]);
assert.deepEqual(updates, ["new@example.invalid"]);
callback("SIGNED_OUT", null);
callback("SIGNED_IN", { user: { id: "b" } });
assert.deepEqual(calls, ["a", null, "b"]);
stop();
assert.equal(closed, true);

// Exercise the actual SDK with in-memory persistent storage and an isolated fake
// auth endpoint. No credentials or requests reach the real Supabase project.
const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
let refreshes = 0;
const fakeUser = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "fixture@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
function token() {
  return [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: fakeUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "isolated-test-signature",
  ].join(".");
}
const fetcher = async (input) => {
  const url = String(input);
  if (url.includes("/logout")) return new Response(null, { status: 204 });
  if (url.includes("grant_type=refresh_token")) refreshes++;
  if (url.includes("/token"))
    return Response.json({
      access_token: token(),
      refresh_token: "fixture-refresh-" + refreshes,
      expires_in: 3600,
      token_type: "bearer",
      user: fakeUser,
    });
  throw new Error("Unexpected test request: " + url);
};
const makeClient = () =>
  createClient("https://auth.example.invalid", "isolated-test-key", {
    auth: {
      storage,
      storageKey: "isev-test-session",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: { fetch: fetcher },
  });
const first = makeClient();
assert.equal(
  (
    await first.auth.signInWithPassword({
      email: fakeUser.email,
      password: "not-a-real-password",
    })
  ).error,
  null,
);
await first.auth.stopAutoRefresh();
assert(values.has("isev-test-session"));
const stored = JSON.parse(values.get("isev-test-session"));
stored.expires_at = 1;
values.set("isev-test-session", JSON.stringify(stored));
const reopened = makeClient();
const { data, error } = await reopened.auth.getSession();
assert.equal(error, null);
assert.equal(data.session.user.id, fakeUser.id);
assert.equal(refreshes, 1);
await reopened.auth.signOut({ scope: "local" });
assert(!values.has("isev-test-session"));
assert.equal((await reopened.auth.getSession()).data.session, null);
await reopened.auth.stopAutoRefresh();
console.log(
  "Sessão: restauração após reabertura, renovação de token, estabilidade do painel e saída local validadas com o SDK real e servidor simulado.",
);
