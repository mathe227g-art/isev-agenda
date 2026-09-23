import assert from 'node:assert/strict';
import { shiftDate, zonedInstant } from '../lib/dates.mjs';
assert.equal(shiftDate(new Date(2026,0,31,12),'Mês',1).getDate(),28);
assert.equal(shiftDate(new Date(2024,0,31,12),'Mês',1).getDate(),29);
assert.equal(shiftDate(new Date(2026,2,31,12),'Mês',-1).getMonth(),1);
assert.equal(zonedInstant('2026-09-23T09:30','America/Sao_Paulo').toISOString(),'2026-09-23T12:30:00.000Z');
assert.equal(zonedInstant('2026-09-23T09:30','Europe/Lisbon').toISOString(),'2026-09-23T08:30:00.000Z');
assert.throws(()=>zonedInstant('not-a-date'));
console.log('6 verificações de datas passaram.');
