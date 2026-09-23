"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import type { Appearance, Booking, Person, Service } from "@/lib/models";
import {
  addDays,
  calendarLanes,
  clockTime,
  dateKey,
  daySegments,
  entityColor,
  foreground,
  formatDay,
  movePeriod,
  periodBounds,
} from "@/lib/planning.mjs";
const statuses: Record<string, string> = {
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};
export function AgendaCalendar({
  bookings,
  people,
  services,
  appearance,
  timezone,
  onStatus,
  onCreate,
}: {
  bookings: Booking[];
  people: Person[];
  services: Service[];
  appearance: Appearance;
  timezone: string;
  onStatus: (id: string, status: string) => Promise<void>;
  onCreate: (value: string) => void;
}) {
  const [date, setDate] = useState(() => dateKey(new Date(), timezone)),
    [view, setView] = useState("Semana"),
    [colorBy, setColorBy] = useState("professional"),
    [person, setPerson] = useState(""),
    [includeCancelled, setIncludeCancelled] = useState(false),
    [detail, setDetail] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [start] = periodBounds(date, view),
    monthStart = periodBounds(date, "Mês")[0],
    gridStart = periodBounds(monthStart, "Semana")[0];
  const dates = Array.from(
    { length: view === "Mês" ? 42 : view === "Semana" ? 7 : 1 },
    (_, i) => addDays(view === "Mês" ? gridStart : start, i),
  );
  const items = bookings.filter(
    (b) =>
      (!person || b.professional_id === person) &&
      (includeCancelled || b.status !== "cancelled"),
  );
  const segments = dates.map((d) =>
    calendarLanes(daySegments(items, d, timezone)),
  );
  const all = segments.flat(),
    firstHour = Math.max(
      0,
      Math.min(8, ...all.map((s) => Math.floor(s.start / 60))),
    ),
    lastHour = Math.min(
      24,
      Math.max(19, ...all.map((s) => Math.ceil(s.end / 60))),
    );
  const hourHeight = 76,
    gridHeight = (lastHour - firstHour) * hourHeight;
  const current = bookings.find((b) => b.id === detail);
  function color(b: Booking) {
    return colorBy === "professional"
      ? entityColor(b.professional_id, appearance.professional_colors)
      : entityColor(b.service_id, appearance.service_colors);
  }
  async function status(value: string) {
    if (!current || busy) return;
    setBusy(true);
    try {
      await onStatus(current.id, value);
    } finally {
      setBusy(false);
    }
  }
  const heading =
    view === "Mês"
      ? formatDay(date, { month: "long", year: "numeric" })
      : view === "Semana"
        ? `${formatDay(dates[0])} — ${formatDay(dates[6])}`
        : formatDay(date, { day: "numeric", month: "long", year: "numeric" });
  return (
    <section className="panel calendar-panel">
      <div className="calendar-toolbar">
        <div className="date-controls">
          <Button
            variant="outline"
            size="icon"
            aria-label="Período anterior"
            onClick={() => setDate(movePeriod(date, view, -1))}
          >
            <ChevronLeft size={17} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo período"
            onClick={() => setDate(movePeriod(date, view, 1))}
          >
            <ChevronRight size={17} />
          </Button>
          <h2>{heading}</h2>
          <Button
            variant="ghost"
            onClick={() => setDate(dateKey(new Date(), timezone))}
          >
            Hoje
          </Button>
        </div>
        <div className="segmented" aria-label="Visualização da agenda">
          {["Dia", "Semana", "Mês"].map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="calendar-filters">
        <label>
          Profissional
          <select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Todos os profissionais</option>
            {people.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cores por
          <select value={colorBy} onChange={(e) => setColorBy(e.target.value)}>
            <option value="professional">Profissional</option>
            <option value="service">Serviço</option>
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={includeCancelled}
            onChange={(e) => setIncludeCancelled(e.target.checked)}
          />{" "}
          Mostrar cancelados
        </label>
        <span className="calendar-zone">{timezone}</span>
      </div>
      <div className="calendar-legend">
        {(colorBy === "professional" ? people : services).map((item) => (
          <span key={item.id}>
            <i
              style={{
                background: entityColor(
                  item.id,
                  colorBy === "professional"
                    ? appearance.professional_colors
                    : appearance.service_colors,
                ),
              }}
            />
            {item.name}
          </span>
        ))}
      </div>
      {view === "Mês" ? (
        <div className="month-scroll">
          <div className="month-grid">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div key={d} className="month-weekday">
                {d}
              </div>
            ))}
            {dates.map((d, index) => (
              <div
                key={d}
                className={`month-day ${d.slice(0, 7) !== date.slice(0, 7) ? "outside-month" : ""}`}
              >
                <button
                  className={`day-number ${d === dateKey(new Date(), timezone) ? "is-today" : ""}`}
                  aria-label={`Abrir dia ${formatDay(d)}`}
                  onClick={() => {
                    setDate(d);
                    setView("Dia");
                  }}
                >
                  {Number(d.slice(-2))}
                </button>
                {segments[index].slice(0, 3).map(({ booking: b }) => (
                  <button
                    key={b.id}
                    className={`month-booking calendar-status-${b.status}`}
                    style={{ borderLeftColor: color(b) }}
                    onClick={() => setDetail(b.id)}
                    title={`${clockTime(b.starts_at, timezone)} · ${b.customers?.name} · ${b.services?.name} · ${b.professionals?.name}`}
                  >
                    <span>{clockTime(b.starts_at, timezone)}</span>
                    <strong>{b.customers?.name || "Cliente"}</strong>
                  </button>
                ))}
                {segments[index].length > 3 && (
                  <button
                    className="more-bookings"
                    onClick={() => {
                      setDate(d);
                      setView("Dia");
                    }}
                  >
                    +{segments[index].length - 3} atendimentos
                  </button>
                )}
                <button
                  className="month-add"
                  aria-label={`Agendar em ${formatDay(d)}`}
                  onClick={() => onCreate(d + "T09:00")}
                >
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="time-calendar-scroll">
          <div
            className={`time-calendar calendar-${view === "Semana" ? "week" : "day"}`}
            style={{
              gridTemplateColumns: `58px repeat(${dates.length}, minmax(110px,1fr))`,
            }}
          >
            <div className="time-corner">
              <CalendarDays size={17} />
            </div>
            {dates.map((d) => (
              <div
                key={d}
                className={`time-day-header ${d === dateKey(new Date(), timezone) ? "today-header" : ""}`}
              >
                <span>{formatDay(d, { weekday: "short" })}</span>
                <strong>{Number(d.slice(-2))}</strong>
              </div>
            ))}
            <div className="time-axis" style={{ height: gridHeight }}>
              {Array.from({ length: lastHour - firstHour }, (_, i) => (
                <span key={i} style={{ top: i * hourHeight }}>
                  {String(firstHour + i).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {dates.map((d, index) => (
              <div key={d} className="time-day" style={{ height: gridHeight }}>
                {Array.from({ length: (lastHour - firstHour) * 2 }, (_, i) => {
                  const mins = firstHour * 60 + i * 30,
                    value = `${d}T${String(Math.floor(mins / 60)).padStart(2, "0")}:${mins % 60 ? "30" : "00"}`;
                  return (
                    <button
                      key={i}
                      className="time-slot"
                      style={{
                        top: (i * hourHeight) / 2,
                        height: hourHeight / 2,
                      }}
                      aria-label={`Novo agendamento ${formatDay(d)} às ${value.slice(-5)}`}
                      onClick={() => onCreate(value)}
                    />
                  );
                })}
                {segments[index].map(
                  ({ booking: b, start, end, lane, lanes }) => (
                    <button
                      key={b.id}
                      className={`calendar-event calendar-status-${b.status}`}
                      onClick={() => setDetail(b.id)}
                      style={{
                        top: ((start - firstHour * 60) / 60) * hourHeight,
                        height: Math.max(
                          10,
                          ((end - start) / 60) * hourHeight - 2,
                        ),
                        left: `calc(${(lane / lanes) * 100}% + 3px)`,
                        width: `calc(${100 / lanes}% - 6px)`,
                        background: color(b),
                        color: foreground(color(b)),
                      }}
                      aria-label={`${clockTime(b.starts_at, timezone)} ${b.customers?.name}, ${b.services?.name}, ${b.professionals?.name}, ${statuses[b.status]}`}
                      title={`${clockTime(b.starts_at, timezone)}–${clockTime(b.ends_at, timezone)} · ${b.customers?.name} · ${b.services?.name} · ${b.professionals?.name} · ${statuses[b.status]}`}
                    >
                      <span>
                        {clockTime(b.starts_at, timezone)}–
                        {clockTime(b.ends_at, timezone)}{" "}
                        {b.status === "completed" ? "✓" : ""}
                      </span>
                      <strong>{b.customers?.name || "Cliente"}</strong>
                      {end - start >= 45 && (
                        <small>
                          {b.services?.name} · {b.professionals?.name}
                        </small>
                      )}
                    </button>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="calendar-foot">
        Clique em um horário livre para agendar ou em um atendimento para ver os
        detalhes.
      </div>
      <Dialog
        open={!!current}
        onOpenChange={(open) => {
          if (!open && !busy) setDetail(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do atendimento</DialogTitle>
          </DialogHeader>
          {current && (
            <div className="appointment-details">
              <h3>{current.customers?.name}</h3>
              <dl>
                <dt>Serviço</dt>
                <dd>
                  <i
                    style={{
                      background: entityColor(
                        current.service_id,
                        appearance.service_colors,
                      ),
                    }}
                  />
                  {current.services?.name}
                </dd>
                <dt>Profissional</dt>
                <dd>
                  <i
                    style={{
                      background: entityColor(
                        current.professional_id,
                        appearance.professional_colors,
                      ),
                    }}
                  />
                  {current.professionals?.name}
                </dd>
                <dt>Data</dt>
                <dd>
                  {formatDay(dateKey(current.starts_at, timezone), {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
                <dt>Horário</dt>
                <dd>
                  {clockTime(current.starts_at, timezone)} —{" "}
                  {clockTime(current.ends_at, timezone)}
                </dd>
              </dl>
              <label>
                Situação
                <select
                  value={current.status}
                  disabled={busy}
                  onChange={(e) => void status(e.target.value)}
                >
                  {Object.entries(statuses).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <small>
                Ao concluir, o valor do serviço entra automaticamente no
                Financeiro.
              </small>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
