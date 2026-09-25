import assert from "node:assert/strict";
import {
  allocateCents,
  brlToNumber,
  digitsToBRL,
  formatBRL,
  whatsappUrl,
} from "../lib/money.mjs";

assert.equal(digitsToBRL("115050"), "R$ 1.150,50");
assert.equal(brlToNumber("R$ 1.150,50"), 1150.5);
assert.match(formatBRL(0), /R\$.*0,00/);
assert.deepEqual(
  allocateCents(10001, [
    { price: 50 },
    { price: 30 },
    { price: 20 },
  ]),
  [5000, 3000, 2001],
);
assert.deepEqual(allocateCents(100, [{ price: null }, { price: null }]), [50, 50]);
assert.equal(whatsappUrl("(11) 99999-9999"), "https://wa.me/5511999999999");
assert.equal(whatsappUrl("123"), null);
console.log("Moeda, rateio do valor avulso e link do WhatsApp validados.");
