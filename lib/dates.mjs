export function shiftDate(date, view, direction) {
  const next = new Date(date);
  if (view === "Mês") {
    const original = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + direction);
    next.setDate(
      Math.min(
        original,
        new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
      ),
    );
  } else next.setDate(next.getDate() + (view === "Semana" ? 7 : 1) * direction);
  return next;
}

// Convert a datetime-local value in the company's zone, not the browser's zone.
export function zonedInstant(value, timeZone = "America/Sao_Paulo") {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Data ou hora inválida.");
  const target = Date.parse(value + ":00Z");
  if (!Number.isFinite(target)) throw new Error("Data ou hora inválida.");
  const format = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      format.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
    );
    const rendered = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
    );
    const offset = target - rendered;
    if (!offset) return new Date(instant);
    instant += offset;
  }
  throw new Error("Este horário não existe no fuso da empresa.");
}
