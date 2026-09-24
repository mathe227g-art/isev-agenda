"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

export type SearchOption = { value: string; label: string; detail?: string };

export function SearchableSelect({
  name,
  label,
  options,
  required = false,
  defaultValue = "",
}: {
  name: string;
  label: string;
  options: SearchOption[];
  required?: boolean;
  defaultValue?: string;
}) {
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(defaultValue);
  const selected = options.find((option) => option.value === value);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return options;
    return options.filter((option) =>
      `${option.label} ${option.detail ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalized),
    );
  }, [options, query]);
  return (
    <fieldset className="searchable-select">
      <legend>{label}</legend>
      <input type="hidden" name={name} value={value} required={required} />
      {selected ? (
        <div className="search-selection">
          <span>
            <strong>{selected.label}</strong>
            {selected.detail && <small>{selected.detail}</small>}
          </span>
          <button
            type="button"
            aria-label={`Trocar ${label}`}
            onClick={() => setValue("")}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label={`Pesquisar ${label.toLocaleLowerCase("pt-BR")}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Pesquisar ${label.toLocaleLowerCase("pt-BR")}...`}
            />
          </label>
          <div className="search-options" role="listbox" aria-label={label}>
            {visible.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={false}
                key={option.value}
                onClick={() => {
                  setValue(option.value);
                  setQuery("");
                }}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.detail && <small>{option.detail}</small>}
                </span>
                <Check size={15} />
              </button>
            ))}
            {!visible.length && <p>Nenhum resultado encontrado.</p>}
          </div>
        </>
      )}
    </fieldset>
  );
}
