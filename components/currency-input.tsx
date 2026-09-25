"use client";

import { useState } from "react";
import { digitsToBRL, brlToNumber } from "@/lib/money.mjs";

export function CurrencyInput({
  name,
  defaultValue,
  required = false,
  autoFocus = false,
}: {
  name: string;
  defaultValue?: number | string | null;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const initialDigits =
    defaultValue === null || defaultValue === undefined || defaultValue === ""
      ? ""
      : String(Math.round(Number(defaultValue) * 100));
  const [display, setDisplay] = useState(
    initialDigits ? digitsToBRL(initialDigits) : "",
  );
  const numeric = display ? brlToNumber(display).toFixed(2) : "";
  return (
    <div className="currency-field">
      <input type="hidden" name={name} value={numeric} />
      <input
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        required={required}
        value={display}
        placeholder="R$ 0,00"
        aria-label="Valor em reais"
        onChange={(event) => setDisplay(digitsToBRL(event.target.value))}
        onFocus={(event) => event.currentTarget.select()}
      />
    </div>
  );
}
