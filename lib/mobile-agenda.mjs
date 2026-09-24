import { addDays, daySegments } from "./planning.mjs";

export function mobileWeek(date) {
  const first = addDays(date, -new Date(date + "T12:00:00Z").getUTCDay());
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}
export function minuteLabel(minute) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}
export function unavailablePeriods(hours, blocks, person, date, timezone) {
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  const minutes = (value) =>
    Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const work = hours
    .filter((h) => h.professional_id === person && h.weekday === weekday)
    .map((h) => ({ start: minutes(h.start_time), end: minutes(h.end_time) }))
    .sort((a, b) => a.start - b.start);
  const gaps = [];
  let cursor = 0;
  for (const interval of work) {
    if (interval.start > cursor)
      gaps.push({
        start: cursor,
        end: interval.start,
        label: cursor === 0 ? "Fora da jornada" : "Intervalo / almoço",
      });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < 1440)
    gaps.push({
      start: cursor,
      end: 1440,
      label: work.length ? "Fora da jornada" : "Folga / sem jornada",
    });
  const temporary = daySegments(
    blocks.filter((b) => b.professional_id === person),
    date,
    timezone,
  ).map((s) => ({
    start: s.start,
    end: s.end,
    label: s.booking.reason || "Bloqueio de horário",
  }));
  return { work, gaps, temporary };
}
