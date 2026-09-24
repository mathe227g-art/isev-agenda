import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
  grant usage on schema public,auth to authenticated,anon,service_role;
  insert into auth.users values ('00000000-0000-0000-0000-000000000011'),('00000000-0000-0000-0000-000000000012'),('00000000-0000-0000-0000-000000000013');`);
const dir = new URL("../supabase/migrations/", import.meta.url);
for (const name of readdirSync(dir)
  .filter((n) => n.endsWith(".sql"))
  .sort())
  await db.exec(readFileSync(new URL(name, dir), "utf8"));
await db.exec(readFileSync(new URL("202609230005_security.sql", dir), "utf8"));
const ownerA = "00000000-0000-0000-0000-000000000011",
  ownerB = "00000000-0000-0000-0000-000000000012",
  staff = "00000000-0000-0000-0000-000000000013";
async function actor(user) {
  await db.exec(`reset role;set test.actor='${user}';set role authenticated;`);
}
await actor(ownerA);
const a = (await db.query("select create_company('Alpha','alpha') id")).rows[0]
  .id;
await actor(ownerB);
await db.query("select create_company('Beta','beta') id");
await db.exec(
  `reset role;insert into company_members values('${a}','${staff}','staff');`,
);
await actor(ownerA);
const service = (
  await db.query(
    `insert into services(company_id,name,duration_minutes,price) values('${a}','Corte',30,50) returning id`,
  )
).rows[0].id;
const prof = (
  await db.query(
    `insert into professionals(company_id,name) values('${a}','Ana') returning id`,
  )
).rows[0].id;
await db.exec(`insert into working_hours(company_id,professional_id,weekday,start_time,end_time) select '${a}','${prof}',n,'08:00','18:00' from generate_series(0,6) n;
insert into company_appearance(company_id) values('${a}');`);
await actor(ownerB);
for (const table of [
  "customers",
  "bookings",
  "professionals",
  "services",
  "working_hours",
  "company_appearance",
]) {
  assert.equal(
    (await db.query(`select * from ${table} where company_id='${a}'`)).rows
      .length,
    0,
  );
}
await assert.rejects(
  db.exec(`insert into customers(company_id,name) values('${a}','Intruso')`),
  /row-level security/,
);
assert.equal(
  (
    await db.query(
      `update services set price=1 where company_id='${a}' returning id`,
    )
  ).rows.length,
  0,
);
await actor(staff);
assert.equal((await db.query("select * from services")).rows.length, 1);
await assert.rejects(
  db.exec(
    `insert into services(company_id,name,duration_minutes) values('${a}','Proibido',30)`,
  ),
  /row-level security/,
);
assert.equal(
  (
    await db.query(
      `update company_appearance set theme='dark' where company_id='${a}' returning company_id`,
    )
  ).rows.length,
  0,
);
await assert.rejects(
  db.exec(`update company_members set role='owner' where user_id='${staff}'`),
  /permission denied/,
);
await db.exec(
  `insert into customers(company_id,name) values('${a}','Cliente da equipe')`,
);
await db.exec("reset role;set role anon;");
for (const table of [
  "customers",
  "bookings",
  "company_members",
  "company_appearance",
])
  await assert.rejects(db.query(`select * from ${table}`), /permission denied/);
const date = (
  await db.query(
    "select ((now() at time zone 'America/Sao_Paulo')::date+1)::text as date_value",
  )
).rows[0].date_value;
const slots = (
  await db.query(
    `select * from booking_slots('alpha','${service}','${prof}','${date}')`,
  )
).rows;
assert(slots.length > 6);
const call = (slot, phone = "11999999999") =>
  `select book_public('alpha','${service}','${prof}','${new Date(slot.starts_at).toISOString()}','Teste','${phone}',null) data`;
await assert.rejects(db.query(call(slots[0])), /permission denied/);
await actor(ownerA);
await assert.rejects(db.query(call(slots[0])), /permission denied/);
await db.exec("reset role;set role service_role");
let first;
for (let i = 0; i < 5; i++) {
  const result = await db.query(call(slots[i]));
  if (!i) first = result.rows[0].data;
}
await assert.rejects(db.query(call(slots[5])), /Limite de reservas/);
await assert.rejects(
  db.query(call(slots[0], "11888888888")),
  /Horário indisponível/,
);
await db.exec("reset role;set role anon");
assert.equal(
  (await db.query(`select cancel_public('${first.cancel_token}') ok`)).rows[0]
    .ok,
  true,
);
assert.equal(
  (await db.query(`select cancel_public('${first.cancel_token}') ok`)).rows[0]
    .ok,
  false,
);
await actor(ownerB);
assert.equal((await db.query("select * from bookings")).rows.length, 0);
await actor(ownerA);
assert.equal((await db.query("select * from bookings")).rows.length, 5);
// New management operations preserve tenants and historical bookings.
const oldHours = (
  await db.query(
    `select * from working_hours where professional_id='${prof}' order by id`,
  )
).rows;
const saveWeek = (intervals) =>
  db.query("select save_working_week($1,$2,$3::jsonb)", [
    a,
    prof,
    JSON.stringify(intervals),
  ]);
await actor(staff);
await assert.rejects(saveWeek([]), /proprietário/);
assert.equal(
  (await db.query(`delete from services where id='${service}' returning id`))
    .rows.length,
  0,
);
await actor(ownerB);
await assert.rejects(saveWeek([]), /proprietário/);
assert.equal(
  (await db.query(`delete from professionals where id='${prof}' returning id`))
    .rows.length,
  0,
);
await db.exec("reset role;set role anon");
await assert.rejects(saveWeek([]), /permission denied/);
await actor(ownerA);
await assert.rejects(
  db.query(`delete from professionals where id='${prof}'`),
  /foreign key/,
);
await assert.rejects(
  db.query(`delete from services where id='${service}'`),
  /foreign key/,
);
const bookedCustomer = (
  await db.query("select customer_id from bookings limit 1")
).rows[0].customer_id;
await assert.rejects(
  db.query(`delete from customers where id='${bookedCustomer}'`),
  /foreign key/,
);
for (const [table, columns, values] of [
  ["customers", "name", "'Removível'"],
  ["professionals", "name", "'Removível'"],
  ["services", "name,duration_minutes", "'Removível',30"],
]) {
  const id = (
    await db.query(
      `insert into ${table}(company_id,${columns}) values('${a}',${values}) returning id`,
    )
  ).rows[0].id;
  assert.equal(
    (await db.query(`delete from ${table} where id='${id}' returning id`)).rows
      .length,
    1,
  );
}
await assert.rejects(
  saveWeek([{ weekday: 1, start_time: "14:00", end_time: "09:00" }]),
  /Confira/,
);
await assert.rejects(
  saveWeek([
    { weekday: 1, start_time: "09:00", end_time: "13:00" },
    { weekday: 1, start_time: "12:00", end_time: "18:00" },
  ]),
  /sobrepor/,
);
assert.deepEqual(
  (
    await db.query(
      `select * from working_hours where professional_id='${prof}' order by id`,
    )
  ).rows,
  oldHours,
);
const weekday = (
  await db.query(`select extract(dow from '${date}'::date)::int n`)
).rows[0].n;
await saveWeek([
  { weekday, start_time: "09:00", end_time: "12:00" },
  { weekday, start_time: "13:00", end_time: "18:00" },
]);
assert.equal(
  (
    await db.query(
      `select * from working_hours where professional_id='${prof}'`,
    )
  ).rows.length,
  2,
);
const lunchSlots = (
  await db.query(
    `select (starts_at at time zone 'America/Sao_Paulo')::time start,(ends_at at time zone 'America/Sao_Paulo')::time finish from booking_slots('alpha','${service}','${prof}','${date}')`,
  )
).rows;
assert(lunchSlots.length > 0);
assert(
  lunchSlots.every((s) => s.finish <= "12:00:00" || s.start >= "13:00:00"),
);
await saveWeek([]);
assert.equal(
  (
    await db.query(
      `select * from booking_slots('alpha','${service}','${prof}','${date}')`,
    )
  ).rows.length,
  0,
);
assert.equal((await db.query("select * from bookings")).rows.length, 5);
await db.close();
console.log(
  "Gestão: exclusão protegida, autorização da jornada, rollback, almoço e folgas validados.",
);
console.log(
  "SQL 001–005: isolamento entre empresas, staff/proprietário, escalada negada, reserva direta negada, limite, colisão e cancelamento único validados.",
);
