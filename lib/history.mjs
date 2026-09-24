import { dateKey } from "./planning.mjs";

export function historyGroups(bookings, date, timezone, query = "") {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const map = new Map();
  for (const booking of bookings) {
    if (dateKey(booking.starts_at, timezone) !== date) continue;
    const key = booking.booking_group_id || booking.id;
    map.set(key, [...(map.get(key) || []), booking]);
  }
  return [...map.values()]
    .map((items) =>
      items.sort((a, b) => (a.service_order ?? 1) - (b.service_order ?? 1)),
    )
    .filter(
      (items) =>
        !normalized ||
        `${items[0].customers?.name} ${items[0].professionals?.name} ${items.map((item) => item.services?.name).join(" ")}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalized),
    )
    .sort((a, b) => a[0].starts_at.localeCompare(b[0].starts_at));
}
