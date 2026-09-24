export const weekdays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function weekFromHours(hours) {
  return weekdays.map((_, weekday) => {
    const intervals = hours
      .filter((h) => h.weekday === weekday)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((h) => ({
        start: h.start_time.slice(0, 5),
        end: h.end_time.slice(0, 5),
      }));
    return {
      off: !intervals.length,
      intervals: intervals.length
        ? intervals
        : [{ start: "09:00", end: "18:00" }],
    };
  });
}

export function intervalsFromWeek(week) {
  if (week.length !== 7) throw new Error("A semana precisa ter sete dias.");
  return week.flatMap((day, weekday) => {
    if (day.off) return [];
    const times = [...day.intervals].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    if (!times.length)
      throw new Error(`${weekdays[weekday]}: informe a jornada.`);
    for (let i = 0; i < times.length; i++) {
      const { start, end } = times[i];
      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) ||
        start >= end
      )
        throw new Error(
          `${weekdays[weekday]}: o fim deve ser depois do início.`,
        );
      if (i && times[i - 1].end >= start)
        throw new Error(
          `${weekdays[weekday]}: confira o intervalo de almoço e as sobreposições.`,
        );
    }
    return times.map((t) => ({
      weekday,
      start_time: t.start,
      end_time: t.end,
    }));
  });
}
