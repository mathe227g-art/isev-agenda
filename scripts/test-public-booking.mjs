import assert from "node:assert/strict";
import { handlePublicBooking } from "../lib/public-booking.mjs";
const env = {
  APP_ORIGIN: "https://agenda.example",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  NEXT_PUBLIC_SUPABASE_URL: "https://db.example",
};
const body = {
  p_slug: "alpha",
  p_services: [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000003",
  ],
  p_professional: "00000000-0000-4000-8000-000000000002",
  p_starts_at: "2026-10-01T15:00:00Z",
  p_name: "Cliente Teste",
  p_phone: "(11) 99999-9999",
  p_email: null,
};
const req = (data = body, origin = env.APP_ORIGIN) =>
  new Request(env.APP_ORIGIN + "/api/book", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
let writes = 0;
const mock = async (url, options) => {
  writes++;
  const args = JSON.parse(options.body);
  assert.equal(args.p_phone, "11999999999");
  assert.equal(args.token, undefined);
  assert.equal(args.p_services.length, 2);
  assert(String(url).endsWith("/rest/v1/rpc/book_public_multi"));
  assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY);
  return Response.json({
    booking_id: "booking",
    booking_ids: ["booking", "booking-2"],
    cancel_token: "opaque-token",
  });
};
assert.equal((await handlePublicBooking(req(), {}, mock)).status, 503);
assert.equal(
  (await handlePublicBooking(req(body, "https://evil.example"), env, mock))
    .status,
  403,
);
assert.equal(
  (await handlePublicBooking(req({ ...body, p_name: null }), env, mock)).status,
  400,
);
assert.equal(
  (
    await handlePublicBooking(
      req({ ...body, p_name: "a".repeat(9000) }),
      env,
      mock,
    )
  ).status,
  413,
);
assert.equal(
  (
    await handlePublicBooking(
      req({ ...body, arbitrary_rpc: "delete" }),
      env,
      mock,
    )
  ).status,
  400,
);
assert.equal(writes, 0);
const ok = await handlePublicBooking(req(), env, mock);
assert.equal(ok.status, 200);
assert.equal(writes, 1);
assert.equal(ok.headers.get("cache-control"), "no-store");
assert.deepEqual(await ok.json(), {
  booking_id: "booking",
  booking_ids: ["booking", "booking-2"],
  cancel_token: "opaque-token",
});
const limited = await handlePublicBooking(req(), env, async () =>
  Response.json(
    { code: "P0429", message: "private database details" },
    { status: 400 },
  ),
);
assert.equal(limited.status, 429);
assert(!(await limited.text()).includes("private"));
assert.equal(
  (
    await handlePublicBooking(req(), env, async () => {
      throw Error("network");
    })
  ).status,
  503,
);
console.log(
  "API: origem, limites de payload, validação, credencial privada, erros e sucesso validados; BotID protege a rota no servidor.",
);
