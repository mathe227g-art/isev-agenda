import assert from "node:assert/strict";
import {
  mobileWeek,
  minuteLabel,
  unavailablePeriods,
} from "../lib/mobile-agenda.mjs";
assert.deepEqual(mobileWeek("2026-10-01"), [
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
]);
assert.equal(mobileWeek("2026-09-27")[3], "2026-09-27");
assert.equal(minuteLabel(855), "14:15");
assert.equal(minuteLabel(1440), "24:00");
const hours = [
  { professional_id: "p", weekday: 3, start_time: "09:00", end_time: "12:00" },
  { professional_id: "p", weekday: 3, start_time: "13:00", end_time: "18:00" },
];
const blocks = [
  {
    id: "b",
    professional_id: "p",
    starts_at: "2026-09-23T02:00:00Z",
    ends_at: "2026-09-23T04:00:00Z",
    reason: "Temporário",
  },
];
const result = unavailablePeriods(
  hours,
  blocks,
  "p",
  "2026-09-23",
  "America/Sao_Paulo",
);
assert.deepEqual(
  result.gaps.map((g) => [g.start, g.end]),
  [
    [0, 540],
    [720, 780],
    [1080, 1440],
  ],
);
assert.deepEqual(result.temporary, [
  { start: 0, end: 60, label: "Temporário" },
]);
assert.equal(
  unavailablePeriods(hours, blocks, "other", "2026-09-23", "America/Sao_Paulo")
    .temporary.length,
  0,
);
assert.deepEqual(
  unavailablePeriods(hours, blocks, "p", "2026-09-27", "America/Sao_Paulo")
    .gaps,
  [{ start: 0, end: 1440, label: "Folga / sem jornada" }],
);
const overlapping = [
  ...hours,
  { professional_id: "p", weekday: 3, start_time: "11:00", end_time: "14:00" },
];
assert.equal(
  unavailablePeriods(overlapping, [], "p", "2026-09-23", "America/Sao_Paulo")
    .gaps.length,
  2,
);
console.log(
  "Agenda mobile: semana, almoço, folgas, sobreposição e bloqueio atravessando meia-noite validados.",
);
