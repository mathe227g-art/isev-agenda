import assert from 'node:assert/strict';
import {weekFromHours, intervalsFromWeek} from '../lib/availability.mjs';

const hours = [
  {weekday:1,start_time:'13:00:00',end_time:'18:00:00'},
  {weekday:1,start_time:'08:10:00',end_time:'12:00:00'},
  {weekday:2,start_time:'09:00:00',end_time:'17:00:00'},
];
const week = weekFromHours(hours);
assert.equal(week.length,7);
assert.equal(week[0].off,true);
assert.equal(week[1].off,false);
assert.deepEqual(intervalsFromWeek(week),[
  {weekday:1,start_time:'08:10',end_time:'12:00'},
  {weekday:1,start_time:'13:00',end_time:'18:00'},
  {weekday:2,start_time:'09:00',end_time:'17:00'},
]);
week[1].off=true;
assert.equal(intervalsFromWeek(week).length,1);
week[1].off=false;
assert.equal(intervalsFromWeek(week).length,3);
week[1].intervals[1].start='11:45';
assert.throws(()=>intervalsFromWeek(week),/almoço/);
week[1].intervals=[{start:'18:00',end:'09:00'}];
assert.throws(()=>intervalsFromWeek(week),/fim/);
week[1].intervals=[{start:'25:00',end:'26:00'}];
assert.throws(()=>intervalsFromWeek(week),/fim/);
assert.equal(intervalsFromWeek(weekFromHours([])).length,0);
console.log('Disponibilidade: preservação dos horários existentes, almoço, folgas e validação de intervalos passaram.');
