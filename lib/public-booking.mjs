import { z } from "zod";

const schema = z
  .object({
    p_slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    p_services: z.array(z.string().uuid()).min(1).max(10),
    p_professional: z.string().uuid(),
    p_starts_at: z.string().datetime({ offset: true }),
    p_name: z.string().trim().min(2).max(120),
    p_phone: z
      .string()
      .transform((s) => s.replace(/\D/g, ""))
      .pipe(z.string().min(7).max(15)),
    p_email: z.union([z.string().trim().email().max(200), z.null()]),
    token: z.string().min(1).max(2048),
  })
  .strict();

const reply = (status, body) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Dependencies are injected for isolated tests; only the server route imports this module.
export async function handlePublicBooking(request, env, fetcher = fetch) {
  try {
    if (
      !env.APP_ORIGIN ||
      !env.TURNSTILE_SECRET_KEY ||
      !env.SUPABASE_SECRET_KEY ||
      !env.NEXT_PUBLIC_SUPABASE_URL
    )
      return reply(503, {
        error:
          "Agendamento online temporariamente indisponível. Entre em contato com a empresa.",
      });
    const origin = new URL(env.APP_ORIGIN);
    if (request.headers.get("origin") !== origin.origin)
      return reply(403, { error: "Origem não permitida." });
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply(415, { error: "Formato inválido." });
    // Enforce actual streamed size; Content-Length can be absent or forged.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: "Dados inválidos." });
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return reply(413, { error: "Dados muito extensos." });
      }
      chunks.push(value);
    }
    let input;
    try {
      input = schema.safeParse(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
    } catch {
      return reply(400, { error: "Dados inválidos." });
    }
    if (!input.success)
      return reply(400, {
        error: "Confira seus dados e a verificação de segurança.",
      });
    const { token, ...args } = input.data;
    const verification = await fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      },
    );
    const check = await verification.json();
    if (
      !verification.ok ||
      check.success !== true ||
      check.hostname !== origin.hostname ||
      check.action !== "booking"
    )
      return reply(403, {
        error: "Refaça a verificação de segurança e tente novamente.",
      });
    const result = await fetcher(
      new URL("/rest/v1/rpc/book_public_multi", env.NEXT_PUBLIC_SUPABASE_URL),
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SECRET_KEY,
          "Content-Type": "application/json",
          ...(env.SUPABASE_SECRET_KEY.startsWith("eyJ")
            ? { Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` }
            : {}),
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (!result.ok) {
      const failure = await result.json();
      return reply(failure.code === "P0429" ? 429 : 409, {
        error:
          failure.code === "P0429"
            ? "Limite de reservas online atingido. Entre em contato com a empresa."
            : "Não foi possível reservar. Atualize os horários e tente novamente.",
      });
    }
    const data = await result.json();
    return reply(200, {
      booking_id: data.booking_id,
      booking_ids: data.booking_ids,
      cancel_token: data.cancel_token,
    });
  } catch {
    return reply(503, {
      error:
        "Não foi possível confirmar a reserva. Confira com a empresa antes de tentar novamente.",
    });
  }
}
