"use client";
import { useEffect, useState } from "react";
import { Clock3, Coffee, CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TimePicker } from "./time-picker";
import { db } from "@/lib/supabase";
import type { Company, Person } from "@/lib/models";
import { dateKey, clockTime, formatDay } from "@/lib/planning.mjs";
import { zonedInstant } from "@/lib/dates.mjs";
import {
  weekdays,
  weekFromHours,
  intervalsFromWeek,
} from "@/lib/availability.mjs";
import { toast } from "sonner";

type Day = { off: boolean; intervals: { start: string; end: string }[] };
type Block = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export function Availability({
  company,
  people,
  onSaved,
}: {
  company: Company;
  people: Person[];
  onSaved?: () => void;
}) {
  const [person, setPerson] = useState("");
  return (
    <div className="availability-page">
      <section className="panel simple-panel availability-intro">
        <div>
          <h2>Uma semana bem organizada</h2>
          <p>
            Defina a rotina de cada profissional. Almoço, folgas e bloqueios
            ficam fora dos horários disponíveis para os clientes.
          </p>
        </div>
        <label>
          Profissional
          <select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Selecione um profissional</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.active ? " (inativo)" : ""}
              </option>
            ))}
          </select>
        </label>
      </section>
      {person ? (
        <WorkingWeek
          key={`${company.id}-${person}`}
          company={company}
          person={person}
          onSaved={onSaved}
        />
      ) : (
        <div className="panel empty">
          <Clock3 size={32} />
          <strong>Escolha quem vai atender</strong>
          <span>
            A rotina e os bloqueios desse profissional aparecerão aqui.
          </span>
        </div>
      )}
    </div>
  );
}

function WorkingWeek({
  company,
  person,
  onSaved,
}: {
  company: Company;
  person: string;
  onSaved?: () => void;
}) {
  const [week, setWeek] = useState<Day[]>(weekFromHours([]));
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const [retry, setRetry] = useState(0);
  const [removeId, setRemoveId] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([
      db
        .from("working_hours")
        .select("weekday,start_time,end_time")
        .eq("company_id", company.id)
        .eq("professional_id", person),
      db
        .from("time_blocks")
        .select("id,starts_at,ends_at,reason")
        .eq("company_id", company.id)
        .eq("professional_id", person)
        .order("starts_at"),
    ])
      .then(([hours, blocked]) => {
        if (!live) return;
        if (hours.error || blocked.error)
          setError(
            "Não foi possível carregar a disponibilidade. Tente novamente.",
          );
        else {
          setWeek(weekFromHours(hours.data ?? []));
          setBlocks(blocked.data ?? []);
          setError("");
        }
        setLoading(false);
      })
      .catch(() => {
        if (live) {
          setError("Falha de conexão ao carregar a disponibilidade.");
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [company.id, person, retry]);
  function change(day: number, update: Partial<Day>) {
    setWeek((w) => w.map((d, i) => (i === day ? { ...d, ...update } : d)));
    setDirty(true);
  }
  function interval(
    day: number,
    index: number,
    field: "start" | "end",
    value: string,
  ) {
    change(day, {
      intervals: week[day].intervals.map((t, i) =>
        i === index ? { ...t, [field]: value } : t,
      ),
    });
  }
  async function saveWeek() {
    if (busy) return;
    setBusy(true);
    try {
      const intervals = intervalsFromWeek(week);
      const { error } = await db.rpc("save_working_week", {
        p_company: company.id,
        p_professional: person,
        p_intervals: intervals,
      });
      if (error)
        throw new Error(
          error.message.includes("save_working_week")
            ? "A atualização do banco para disponibilidade ainda precisa ser instalada."
            : error.message,
        );
      setDirty(false);
      toast.success("Jornada e folgas salvas");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function block(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget,
      data = new FormData(form);
    setBusy(true);
    try {
      const from = zonedInstant(
        `${data.get("date")}T${data.get("start")}`,
        company.timezone,
      );
      const to = zonedInstant(
        `${data.get("date")}T${data.get("end")}`,
        company.timezone,
      );
      if (to <= from)
        throw new Error("O fim do bloqueio deve ser depois do início.");
      const { data: rows, error } = await db
        .from("time_blocks")
        .insert({
          company_id: company.id,
          professional_id: person,
          starts_at: from.toISOString(),
          ends_at: to.toISOString(),
          reason: String(data.get("reason")).trim() || null,
        })
        .select("id,starts_at,ends_at,reason");
      if (error) throw error;
      setBlocks((b) =>
        [...b, ...(rows ?? [])].sort((a, b) =>
          a.starts_at.localeCompare(b.starts_at),
        ),
      );
      form.reset();
      toast.success("Período bloqueado");
      onSaved?.();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível criar o bloqueio.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeBlock(id: string) {
    setBusy(true);
    try {
      const { data, error } = await db
        .from("time_blocks")
        .delete()
        .eq("company_id", company.id)
        .eq("professional_id", person)
        .eq("id", id)
        .select("id");
      if (error || !data?.length)
        throw new Error("Não foi possível remover o bloqueio.");
      setBlocks((b) => b.filter((x) => x.id !== id));
      setRemoveId(null);
      toast.success("Bloqueio removido");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="panel simple-panel" role="status">
        Carregando disponibilidade...
      </div>
    );
  if (error)
    return (
      <div className="panel simple-panel" role="alert">
        <p>{error}</p>
        <Button
          onClick={() => {
            setLoading(true);
            setRetry((x) => x + 1);
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  return (
    <>
      <fieldset disabled={busy} className="availability-fieldset">
        <section className="panel simple-panel days-off-panel">
          <div className="availability-heading">
            <CalendarOff size={21} />
            <div>
              <h2>Folgas semanais</h2>
              <p>Marque os dias em que este profissional não atende.</p>
            </div>
          </div>
          <div className="days-off-options">
            {weekdays.map((name, i) => (
              <label
                key={name}
                className={week[i].off ? "day-off-selected" : ""}
              >
                <input
                  type="checkbox"
                  checked={week[i].off}
                  onChange={(e) => change(i, { off: e.target.checked })}
                />
                {name.replace("-feira", "")}
              </label>
            ))}
          </div>
        </section>
        <section className="panel simple-panel">
          <div className="availability-heading">
            <Clock3 size={21} />
            <div>
              <h2>Jornada e almoço</h2>
              <p>
                A pausa entre dois períodos fica reservada para o almoço. Ajuste
                cada dia conforme a rotina.
              </p>
            </div>
          </div>
          <div className="working-week">
            {[1, 2, 3, 4, 5, 6, 0].map((i) => {
              const d = week[i];
              return (
                <div
                  key={i}
                  className={`working-day ${d.off ? "working-day-off" : ""}`}
                >
                  <div className="working-day-title">
                    <strong>{weekdays[i]}</strong>
                    <span>
                      {d.off
                        ? "Folga semanal"
                        : d.intervals.length > 1
                          ? "Com intervalo"
                          : "Jornada contínua"}
                    </span>
                  </div>
                  {d.off ? (
                    <span className="off-day-note">Sem atendimento</span>
                  ) : (
                    <div className="working-day-times">
                      <div className="two-fields">
                        <label>
                          Entrada
                          <TimePicker
                            value={d.intervals[0].start}
                            onChange={(v) => interval(i, 0, "start", v)}
                          />
                        </label>
                        <label>
                          Saída
                          <TimePicker
                            value={d.intervals.at(-1)!.end}
                            onChange={(v) =>
                              interval(i, d.intervals.length - 1, "end", v)
                            }
                          />
                        </label>
                      </div>
                      {d.intervals.length === 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            change(i, {
                              intervals: [
                                { start: d.intervals[0].start, end: "12:00" },
                                { start: "13:00", end: d.intervals[0].end },
                              ],
                            })
                          }
                        >
                          <Coffee size={15} />
                          Adicionar almoço
                        </Button>
                      ) : (
                        <>
                          {d.intervals.slice(0, -1).map((t, j) => (
                            <div key={j} className="lunch-row">
                              <Coffee size={16} />
                              <div className="two-fields">
                                <label>
                                  {j === 0
                                    ? "Saída para almoço"
                                    : "Início da pausa"}
                                  <TimePicker
                                    value={t.end}
                                    onChange={(v) => interval(i, j, "end", v)}
                                  />
                                </label>
                                <label>
                                  Retorno
                                  <TimePicker
                                    value={d.intervals[j + 1].start}
                                    onChange={(v) =>
                                      interval(i, j + 1, "start", v)
                                    }
                                  />
                                </label>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              change(i, {
                                intervals: [
                                  {
                                    start: d.intervals[0].start,
                                    end: d.intervals.at(-1)!.end,
                                  },
                                ],
                              })
                            }
                          >
                            Remover intervalo
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="availability-save">
            <span>
              {dirty
                ? "Você tem alterações para salvar."
                : "As alterações de rotina não cancelam agendamentos existentes."}
            </span>
            <Button disabled={!dirty || busy} onClick={saveWeek}>
              {busy ? "Salvando..." : "Salvar jornada e folgas"}
            </Button>
          </div>
        </section>
        <section className="panel simple-panel">
          <div className="availability-heading">
            <CalendarOff size={21} />
            <div>
              <h2>Bloqueios temporários</h2>
              <p>
                Reserve um período de uma data específica para um compromisso ou
                imprevisto.
              </p>
            </div>
          </div>
          <form className="block-form" onSubmit={block}>
            <label>
              Data
              <Input
                name="date"
                type="date"
                defaultValue={dateKey(new Date(), company.timezone)}
                required
              />
            </label>
            <label>
              Início
              <TimePicker name="start" defaultValue="09:00" />
            </label>
            <label>
              Fim
              <TimePicker name="end" defaultValue="10:00" />
            </label>
            <label>
              Motivo
              <Input
                name="reason"
                maxLength={200}
                placeholder="Ex.: compromisso pessoal"
              />
            </label>
            <Button type="submit" variant="outline" disabled={busy}>
              <Plus size={16} />
              Bloquear período
            </Button>
          </form>
          <div className="temporary-blocks">
            {blocks.length ? (
              blocks.map((b) => (
                <div key={b.id} className="temporary-block">
                  <div>
                    <strong>
                      {formatDay(dateKey(b.starts_at, company.timezone))} ·{" "}
                      {clockTime(b.starts_at, company.timezone)} →{" "}
                      {dateKey(b.starts_at, company.timezone) !==
                      dateKey(b.ends_at, company.timezone)
                        ? formatDay(dateKey(b.ends_at, company.timezone)) +
                          " · "
                        : ""}
                      {clockTime(b.ends_at, company.timezone)}
                    </strong>
                    <span>{b.reason || "Indisponível"}</span>
                  </div>
                  {removeId === b.id ? (
                    <div className="directory-actions">
                      <span>Remover?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => removeBlock(b.id)}
                      >
                        Sim
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemoveId(null)}
                      >
                        Voltar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remover bloqueio ${b.reason || formatDay(dateKey(b.starts_at, company.timezone))}`}
                      onClick={() => setRemoveId(b.id)}
                    >
                      <Trash2 size={15} />
                      Remover
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="muted">Nenhum bloqueio temporário cadastrado.</p>
            )}
          </div>
        </section>
      </fieldset>
    </>
  );
}
