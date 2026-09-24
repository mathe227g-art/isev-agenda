"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import type { Booking } from "@/lib/models";
import { dateKey, clockTime, formatDay } from "@/lib/planning.mjs";
import { historyGroups } from "@/lib/history.mjs";

const statusLabel: Record<string, string> = {
  confirmed: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

export function History({
  bookings,
  timezone,
}: {
  bookings: Booking[];
  timezone: string;
}) {
  const [date, setDate] = useState(() => dateKey(new Date(), timezone));
  const [query, setQuery] = useState("");
  const groups = useMemo(
    () => historyGroups(bookings, date, timezone, query) as Booking[][],
    [bookings, date, query, timezone],
  );
  return (
    <section className="panel history-panel">
      <div className="history-filters">
        <label>
          Dia do histórico
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Pesquisar no histórico"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cliente, serviço ou profissional"
          />
        </label>
      </div>
      <div className="panel-heading history-heading">
        <div>
          <h2>
            {formatDay(date, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
          <p>
            {groups.length} atendimento{groups.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      {groups.length ? (
        <div className="history-list">
          {groups.map((items) => {
            const first = items[0],
              last = items.at(-1)!;
            return (
              <article key={first.booking_group_id || first.id}>
                <div className="history-time">
                  <strong>{clockTime(first.starts_at, timezone)}</strong>
                  <span>{clockTime(last.ends_at, timezone)}</span>
                </div>
                <div className="history-main">
                  <h3>{first.customers?.name || "Cliente"}</h3>
                  <p>{first.professionals?.name || "Profissional"}</p>
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>{item.services?.name || "Serviço"}</li>
                    ))}
                  </ul>
                </div>
                <span className={`status status-${first.status}`}>
                  {statusLabel[first.status] || first.status}
                </span>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <CalendarDays size={30} />
          <strong>Nenhum atendimento neste dia</strong>
          <span>Escolha outra data ou limpe a pesquisa.</span>
        </div>
      )}
    </section>
  );
}
