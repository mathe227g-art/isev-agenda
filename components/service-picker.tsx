"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import type { Service } from "@/lib/models";
import { formatBRL } from "@/lib/money.mjs";

export function ServicePicker({
  services,
  selected,
  onChange,
}: {
  services: Service[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const available = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return services.filter(
      (service) =>
        service.active &&
        !selected.includes(service.id) &&
        (!normalized ||
          service.name.toLocaleLowerCase("pt-BR").includes(normalized)),
    );
  }, [query, selected, services]);
  const chosen = selected
    .map((id) => services.find((service) => service.id === id))
    .filter(Boolean) as Service[];
  return (
    <fieldset className="service-picker">
      <legend>Serviços</legend>
      {selected.map((id) => (
        <input key={id} type="hidden" name="service_ids" value={id} />
      ))}
      <div className="selected-services">
        {chosen.map((service, index) => (
          <div key={service.id}>
            <span className="service-order">{index + 1}</span>
            <span>
              <strong>{service.name}</strong>
              <small>
                {service.duration_minutes} min · {service.price == null ? "Sem preço" : formatBRL(service.price)}
              </small>
            </span>
            <button
              type="button"
              aria-label={`Remover ${service.name}`}
              onClick={() => onChange(selected.filter((id) => id !== service.id))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {!open ? (
        selected.length < 10 ? (
          <button type="button" className="add-service-button" onClick={() => setOpen(true)}>
            <Plus size={16} /> {chosen.length ? "Adicionar outro serviço" : "Escolher serviço"}
          </button>
        ) : (
          <small className="muted">Limite de 10 serviços por agendamento.</small>
        )
      ) : (
        <div className="service-search-panel">
          <label className="search-field">
            <Search size={16} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar serviço..."
            />
          </label>
          <div className="search-options" role="listbox" aria-label="Serviços">
            {available.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => {
                  onChange([...selected, service.id]);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{service.name}</strong>
                  <small>{service.duration_minutes} min · {service.price == null ? "Sem preço" : formatBRL(service.price)}</small>
                </span>
                <Check size={15} />
              </button>
            ))}
            {!available.length && <p>Nenhum outro serviço disponível.</p>}
          </div>
          <button type="button" className="text-link" onClick={() => setOpen(false)}>
            Fechar lista
          </button>
        </div>
      )}
    </fieldset>
  );
}
