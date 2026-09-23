export const palette = [
  "#0077cc",
  "#a23dcc",
  "#008673",
  "#df680e",
  "#cf3d76",
  "#657a20",
  "#5b5bde",
  "#936243",
];
export function entityColor(id, overrides = {}) {
  if (/^#[0-9a-f]{6}$/i.test(overrides[id] || "")) return overrides[id];
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
export function foreground(hex) {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? "#081b30"
    : "#ffffff";
}
export function dateKey(instant, timezone = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}
export function addDays(key, amount) {
  const date = new Date(key + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function periodBounds(key, period) {
  if (period === "Dia") return [key, addDays(key, 1)];
  if (period === "Semana") {
    const weekday = new Date(key + "T12:00:00Z").getUTCDay();
    const start = addDays(key, -((weekday + 6) % 7));
    return [start, addDays(start, 7)];
  }
  const start = key.slice(0, 7) + "-01",
    end = new Date(start + "T12:00:00Z");
  end.setUTCMonth(end.getUTCMonth() + 1);
  return [start, end.toISOString().slice(0, 10)];
}
export function movePeriod(key, period, direction) {
  if (period !== "Mês")
    return addDays(key, direction * (period === "Semana" ? 7 : 1));
  const date = new Date(key + "T12:00:00Z"),
    day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + direction);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  date.setUTCDate(Math.min(day, end.getUTCDate()));
  return date.toISOString().slice(0, 10);
}
/** @param {string} key @param {Intl.DateTimeFormatOptions} options */
export function formatDay(key, options = { day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("pt-BR", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(key + "T12:00:00Z"));
}
export function clockTime(instant, timezone) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instant));
}
export function minuteOfDay(instant, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  return (
    Number(parts.find((p) => p.type === "hour").value) * 60 +
    Number(parts.find((p) => p.type === "minute").value)
  );
}
export function daySegments(bookings, key, timezone) {
  return bookings
    .filter(
      (b) =>
        dateKey(b.starts_at, timezone) <= key &&
        dateKey(b.ends_at, timezone) >= key,
    )
    .map((b) => ({
      booking: b,
      start:
        dateKey(b.starts_at, timezone) < key
          ? 0
          : minuteOfDay(b.starts_at, timezone),
      end:
        dateKey(b.ends_at, timezone) > key
          ? 1440
          : minuteOfDay(b.ends_at, timezone),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}
// Partition simultaneous appointments into independent collision groups and lanes.
export function calendarLanes(segments) {
  const result = [];
  let group = [],
    until = -1;
  function flush() {
    const ends = [];
    const placed = group.map((s) => {
      let lane = ends.findIndex((e) => e <= s.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = s.end;
      return { ...s, lane };
    });
    result.push(...placed.map((s) => ({ ...s, lanes: ends.length })));
    group = [];
  }
  for (const s of segments) {
    if (group.length && s.start >= until) {
      flush();
      until = -1;
    }
    group.push(s);
    until = Math.max(until, s.end);
  }
  if (group.length) flush();
  return result;
}
export function summarizeRevenue(
  bookings,
  services,
  key,
  period,
  timezone = "America/Sao_Paulo",
) {
  const [start, end] = periodBounds(key, period),
    groups = new Map();
  let count = 0,
    missing = 0,
    estimated = 0,
    totalCents = 0;
  for (const b of bookings) {
    const day = dateKey(b.starts_at, timezone);
    if (b.status !== "completed" || day < start || day >= end) continue;
    count++;
    const service = services.find((s) => s.id === b.service_id);
    const hasSnapshot = b.price_source != null;
    const price = hasSnapshot ? b.charged_price : service?.price;
    if (price == null || !Number.isFinite(Number(price))) {
      missing++;
      continue;
    }
    if (!hasSnapshot || b.price_source === "historical_estimate") estimated++;
    const cents = Math.round(Number(price) * 100);
    totalCents += cents;
    const group = groups.get(b.service_id) || {
      id: b.service_id,
      name: b.services?.name || service?.name || "Serviço",
      cents: 0,
      count: 0,
    };
    group.cents += cents;
    group.count++;
    groups.set(b.service_id, group);
  }
  return {
    totalCents,
    count,
    missing,
    estimated,
    groups: [...groups.values()].sort((a, b) => b.cents - a.cents),
    start,
    end,
  };
}
