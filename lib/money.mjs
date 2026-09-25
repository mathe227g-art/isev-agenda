export function formatBRL(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";
}

export function digitsToBRL(digits) {
  const clean = String(digits ?? "").replace(/\D/g, "").slice(0, 14);
  return formatBRL((Number(clean || "0") / 100).toFixed(2));
}

export function brlToNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return Number(digits || "0") / 100;
}

export function allocateCents(totalCents, services) {
  if (!services.length) return [];
  const total = Math.max(0, Math.round(Number(totalCents) || 0));
  const weights = services.map((service) =>
    Math.max(0, Math.round(Number(service.price ?? 0) * 100)),
  );
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const source = weightTotal ? weights : services.map(() => 1);
  const sourceTotal = source.reduce((sum, value) => sum + value, 0);
  let assigned = 0;
  return source.map((weight, index) => {
    const cents =
      index === services.length - 1
        ? total - assigned
        : Math.floor((total * weight) / sourceTotal);
    assigned += cents;
    return cents;
  });
}

export function whatsappUrl(phone, countryCode = "55") {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = countryCode + digits;
  return digits.length >= 10 && digits.length <= 15
    ? `https://wa.me/${digits}`
    : null;
}
