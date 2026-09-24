import assert from "node:assert/strict";
import { historyGroups } from "../lib/history.mjs";
const base = {
  status: "completed",
  customers: { name: "Maria" },
  professionals: { name: "Ana" },
};
const bookings = [
  {
    ...base,
    id: "2",
    booking_group_id: "g",
    service_order: 2,
    starts_at: "2026-09-23T14:30:00Z",
    ends_at: "2026-09-23T15:00:00Z",
    services: { name: "Barba" },
  },
  {
    ...base,
    id: "1",
    booking_group_id: "g",
    service_order: 1,
    starts_at: "2026-09-23T14:00:00Z",
    ends_at: "2026-09-23T14:30:00Z",
    services: { name: "Corte" },
  },
  {
    ...base,
    id: "3",
    booking_group_id: "h",
    service_order: 1,
    starts_at: "2026-09-24T14:00:00Z",
    ends_at: "2026-09-24T14:30:00Z",
    services: { name: "Cor" },
  },
];
const groups = historyGroups(bookings, "2026-09-23", "UTC");
assert.equal(groups.length, 1);
assert.deepEqual(
  groups[0].map((item) => item.id),
  ["1", "2"],
);
assert.equal(historyGroups(bookings, "2026-09-23", "UTC", "barba").length, 1);
assert.equal(historyGroups(bookings, "2026-09-23", "UTC", "carla").length, 0);
console.log(
  "Histórico: filtro por dia, pesquisa e agrupamento de vários serviços validados.",
);
