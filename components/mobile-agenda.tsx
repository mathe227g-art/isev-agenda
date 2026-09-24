"use client";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import type { Appearance, Booking, Person } from "@/lib/models";
import {
  addDays,
  dateKey,
  formatDay,
  daySegments,
  calendarLanes,
  entityColor,
  clockTime,
} from "@/lib/planning.mjs";
import {
  mobileWeek,
  minuteLabel,
  unavailablePeriods,
} from "@/lib/mobile-agenda.mjs";
export type WorkingHour = {
  professional_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};
export type TimeBlock = {
  id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};
export function MobileAgenda({
  date,
  setDate,
  person,
  setPerson,
  people,
  bookings,
  appearance,
  timezone,
  hours,
  blocks,
  availabilityReady,
  onOpen,
  onCreate,
}: {
  date: string;
  setDate: (date: string) => void;
  person: string;
  setPerson: (person: string) => void;
  people: Person[];
  bookings: Booking[];
  appearance: Appearance;
  timezone: string;
  hours: WorkingHour[];
  blocks: TimeBlock[];
  availabilityReady: boolean;
  onOpen: (id: string) => void;
  onCreate: (date: string, professional?: string) => void;
}) {
  const chosen =
    people.find((p) => p.id === person) ||
    people.find((p) => p.active) ||
    people[0];
  const id = chosen?.id || "";
  const today = dateKey(new Date(), timezone);
  const segments = calendarLanes(
    daySegments(
      bookings.filter((b) => b.professional_id === id),
      date,
      timezone,
    ),
  );
  const { work, gaps, temporary } = unavailablePeriods(
    hours,
    blocks,
    id,
    date,
    timezone,
  );
  const extents = [...segments, ...temporary, ...work];
  const start =
    Math.max(0, Math.min(8, ...extents.map((x) => Math.floor(x.start / 60)))) *
    60;
  const end =
    Math.min(24, Math.max(20, ...extents.map((x) => Math.ceil(x.end / 60)))) *
    60;
  const scale = 3.2;
  const labels: Record<string, string> = {
    confirmed: "Pendente",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Não compareceu",
  };
  return (
    <div className="mobile-agenda">
      <div className="mobile-agenda-controls">
        <label className="mobile-date-picker">
          <strong>
            {date === today
              ? "Hoje"
              : formatDay(date, { day: "numeric", month: "short" })}
          </strong>
          <CalendarDays size={18} />
          <input
            type="date"
            aria-label="Escolher data da agenda"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
        <button onClick={() => setDate(today)} className="mobile-today">
          Hoje
        </button>
        <button
          aria-label="Semana anterior"
          onClick={() => setDate(addDays(date, -7))}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          aria-label="Próxima semana"
          onClick={() => setDate(addDays(date, 7))}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="mobile-week" aria-label="Dias da semana">
        {mobileWeek(date).map((d) => (
          <button
            key={d}
            aria-label={formatDay(d, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            aria-pressed={d === date}
            onClick={() => setDate(d)}
          >
            <span>{formatDay(d, { weekday: "short" })}</span>
            <strong className={d === today ? "today-date" : ""}>
              {Number(d.slice(-2))}
            </strong>
            <i
              className={
                bookings.some(
                  (b) =>
                    b.professional_id === id &&
                    dateKey(b.starts_at, timezone) === d,
                )
                  ? "has-bookings"
                  : ""
              }
            />
          </button>
        ))}
      </div>
      <div className="mobile-professional">
        <span
          className="professional-dot"
          style={{
            background: entityColor(id, appearance.professional_colors),
          }}
        />
        <label>
          <span>Profissional</span>
          <select
            aria-label="Profissional da agenda"
            value={id}
            onChange={(e) => setPerson(e.target.value)}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.active ? " (inativo)" : ""}
              </option>
            ))}
          </select>
        </label>
        <small>
          {availabilityReady
            ? work.length
              ? work
                  .map(
                    (w: { start: number; end: number }) =>
                      `${minuteLabel(w.start)}–${minuteLabel(w.end)}`,
                  )
                  .join(" / ")
              : "Sem jornada"
            : "Jornada indisponível"}
        </small>
      </div>
      {!chosen ? (
        <div className="empty">
          <strong>Cadastre um profissional para começar.</strong>
        </div>
      ) : (
        <>
          <div className="mobile-status-legend">
            {Object.entries(labels).map(([key, label]) => (
              <span key={key}>
                <i className={`legend-status-${key}`} />
                {label}
              </span>
            ))}
          </div>
          <p className="mobile-agenda-hint">
            {segments.length} atendimento{segments.length === 1 ? "" : "s"} ·
            Toque para ver detalhes
          </p>
          <div
            className="mobile-timeline"
            style={{ height: (end - start) * scale }}
          >
            {Array.from(
              { length: (end - start) / 15 + 1 },
              (_, i) => start + i * 15,
            ).map((min) => (
              <div
                key={min}
                className={`mobile-time-tick ${min % 60 === 0 ? "full-hour" : ""}`}
                style={{ top: (min - start) * scale }}
              >
                <span>
                  {min % 60 === 0 ? minuteLabel(min) : String(min % 60)}
                </span>
              </div>
            ))}
            <div className="mobile-timeline-track">
              {Array.from(
                { length: (end - start) / 15 },
                (_, i) => start + i * 15,
              ).map((min) => (
                <button
                  key={min}
                  className="mobile-free-slot"
                  style={{ top: (min - start) * scale, height: 15 * scale }}
                  aria-label={`Agendar ${formatDay(date)} às ${minuteLabel(min)}`}
                  onClick={() => onCreate(`${date}T${minuteLabel(min)}`, id)}
                />
              ))}
              {availabilityReady &&
                [...gaps, ...temporary]
                  .filter((g) => g.end > start && g.start < end)
                  .map((g, i) => (
                    <div
                      key={i}
                      className="mobile-time-block"
                      style={{
                        top: (Math.max(g.start, start) - start) * scale,
                        height:
                          (Math.min(g.end, end) - Math.max(g.start, start)) *
                          scale,
                      }}
                    >
                      <strong>
                        {minuteLabel(Math.max(g.start, start))}–
                        {minuteLabel(Math.min(g.end, end))}
                      </strong>
                      <span>{g.label}</span>
                    </div>
                  ))}
              {segments.map(({ booking: b, start: s, end: e, lane, lanes }) => (
                <button
                  key={b.id}
                  className={`mobile-booking calendar-status-${b.status}`}
                  style={{
                    top: (s - start) * scale,
                    height: Math.max(42, (e - s) * scale - 3),
                    left: `${(lane / lanes) * 100}%`,
                    width: `calc(${100 / lanes}% - 3px)`,
                  }}
                  onClick={() => onOpen(b.id)}
                  aria-label={`${clockTime(b.starts_at, timezone)}, ${b.customers?.name}, ${b.services?.name}, ${labels[b.status]}`}
                >
                  <strong>
                    {clockTime(b.starts_at, timezone)}–
                    {clockTime(b.ends_at, timezone)}
                  </strong>
                  <span className="mobile-service">
                    {b.customers?.name || "Cliente"} ·{" "}
                    <i
                      style={{
                        background: entityColor(
                          b.service_id,
                          appearance.service_colors,
                        ),
                      }}
                    />
                    {b.services?.name || "Serviço"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            className="mobile-add-booking"
            aria-label="Novo agendamento neste dia"
            onClick={() => onCreate(date + "T09:00", id)}
          >
            <Plus size={25} />
          </button>
        </>
      )}
    </div>
  );
}
