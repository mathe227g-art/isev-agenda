import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync, existsSync } from "node:fs";
const root = new URL("../public/", import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL("manifest.webmanifest", root), "utf8"),
);
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
for (const icon of manifest.icons) {
  const file = new URL(icon.src.slice(1), root);
  assert(existsSync(file));
  const png = readFileSync(file);
  assert.equal(png.readUInt32BE(16), Number(icon.sizes.split("x")[0]));
  assert.equal(png.readUInt32BE(20), Number(icon.sizes.split("x")[1]));
}
const handlers = {},
  cached = [],
  removed = [];
const offline = new Response("GENERIC OFFLINE");
const context = {
  URL,
  Response,
  self: {
    location: { origin: "https://isev.example" },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (name, handler) => (handlers[name] = handler),
  },
  caches: {
    open: async () => ({ addAll: async (urls) => cached.push(...urls) }),
    keys: async () => ["isev-public-v0", "another-app"],
    delete: async (key) => removed.push(key),
    match: async (key) => (key === "/offline.html" ? offline : undefined),
  },
  fetch: async () => {
    throw new Error("offline");
  },
};
vm.runInNewContext(readFileSync(new URL("sw.js", root), "utf8"), context);
let wait;
handlers.install({ waitUntil: (promise) => (wait = promise) });
await wait;
assert(cached.includes("/offline.html"));
assert(!cached.includes("/"));
assert(!cached.some((url) => url.includes("supabase") || url.includes("auth")));
handlers.activate({ waitUntil: (promise) => (wait = promise) });
await wait;
assert.deepEqual(removed, ["isev-public-v0"]);
let response;
handlers.fetch({
  request: { url: "https://isev.example/", method: "GET", mode: "navigate" },
  respondWith: (promise) => (response = promise),
});
assert.equal(await (await response).text(), "GENERIC OFFLINE");
for (const request of [
  { url: "https://example.supabase.co/rest/v1/bookings", method: "GET" },
  { url: "https://isev.example/api/private", method: "GET" },
  { url: "https://isev.example/", method: "POST" },
])
  handlers.fetch({
    request,
    respondWith: () =>
      assert.fail("Private requests must not be intercepted or cached"),
  });
console.log(
  "PWA: manifesto, tamanhos dos ícones, fallback offline e exclusão de dados privados do cache validados.",
);
