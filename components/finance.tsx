"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  CheckCheck,
  ReceiptText,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  dateKey,
  entityColor,
  formatDay,
  movePeriod,
  summarizeRevenue,
} from "@/lib/planning.mjs";
import type { Appearance, Booking, Service } from "@/lib/models";
const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function Finance({
  bookings,
  services,
  timezone,
  appearance,
}: {
  bookings: Booking[];
  services: Service[];
  timezone: string;
  appearance: Appearance;
}) {
  const [date, setDate] = useState(() => dateKey(new Date(), timezone)),
    [period, setPeriod] = useState("Mês");
  const summary = summarizeRevenue(bookings, services, date, period, timezone);
  const slices = summary.groups
    .filter((g) => g.cents > 0)
    .map((g, index, groups) => {
      const portion = (g.cents / summary.totalCents) * 100;
      const offset =
        (groups.slice(0, index).reduce((sum, group) => sum + group.cents, 0) /
          summary.totalCents) *
        100;
      return { ...g, portion, offset };
    });
  return (
    <section className="finance-module">
      <div className="panel finance-toolbar">
        <div>
          <span className="eyebrow">RECEITA DE SERVIÇOS CONCLUÍDOS</span>
          <h2>
            {period === "Mês"
              ? formatDay(date, { month: "long", year: "numeric" })
              : period === "Dia"
                ? formatDay(date, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : `Semana de ${formatDay(summary.start)}`}
          </h2>
        </div>
        <div className="finance-controls">
          <div className="date-controls">
            <Button
              variant="outline"
              size="icon"
              aria-label="Período financeiro anterior"
              onClick={() => setDate(movePeriod(date, period, -1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <input
              aria-label="Data de referência financeira"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Próximo período financeiro"
              onClick={() => setDate(movePeriod(date, period, 1))}
            >
              <ChevronRight size={16} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDate(dateKey(new Date(), timezone))}
            >
              Hoje
            </Button>
          </div>
          <div className="segmented" aria-label="Período do financeiro">
            {["Dia", "Semana", "Mês"].map((p) => (
              <button
                key={p}
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="finance-stats">
        <div className="panel">
          <Wallet />
          <span>Receita no período</span>
          <strong>{money(summary.totalCents)}</strong>
          <small>Serviços concluídos</small>
        </div>
        <div className="panel">
          <CheckCheck />
          <span>Atendimentos concluídos</span>
          <strong>{summary.count}</strong>
          <small>{summary.groups.length} categorias de serviço</small>
        </div>
        <div className="panel">
          <ReceiptText />
          <span>Ticket médio</span>
          <strong>
            {money(
              summary.count - summary.missing
                ? Math.round(
                    summary.totalCents / (summary.count - summary.missing),
                  )
                : 0,
            )}
          </strong>
          <small>Por atendimento com valor registrado</small>
        </div>
      </div>
      {(summary.estimated > 0 || summary.missing > 0) && (
        <div className="finance-notice" role="status">
          {summary.estimated > 0 && (
            <p>
              {summary.estimated} atendimento(s) histórico(s) com valor estimado
              pelo preço do serviço. O sistema anterior não registrava o valor
              individual.
            </p>
          )}
          {summary.missing > 0 && (
            <p>
              {summary.missing} atendimento(s) sem preço registrado, fora do
              total e do ticket médio.
            </p>
          )}
        </div>
      )}
      <div className="panel finance-breakdown">
        <div className="panel-heading">
          <div>
            <h2>De onde vem sua receita</h2>
            <p>
              Cada serviço é uma categoria. As cores são as mesmas da agenda.
            </p>
          </div>
          <span className="finance-period-label">{period}</span>
        </div>
        <div className="finance-chart-layout">
          <div className="donut-container">
            <svg
              viewBox="0 0 240 240"
              role="img"
              aria-label={`Receita por serviço: ${money(summary.totalCents)}. Detalhamento na tabela ao lado.`}
            >
              <circle
                cx="120"
                cy="120"
                r="88"
                fill="none"
                stroke="var(--border)"
                strokeWidth="28"
              />
              {slices.map((g) => (
                <circle
                  key={g.id}
                  cx="120"
                  cy="120"
                  r="88"
                  pathLength="100"
                  fill="none"
                  stroke={entityColor(g.id, appearance.service_colors)}
                  strokeWidth="28"
                  strokeDasharray={`${g.portion} ${100 - g.portion}`}
                  strokeDashoffset={-g.offset}
                  transform="rotate(-90 120 120)"
                >
                  <title>
                    {g.name}: {money(g.cents)} ({g.portion.toFixed(1)}%)
                  </title>
                </circle>
              ))}
            </svg>
            <div className="donut-center">
              <small>
                TOTAL{" "}
                {period === "Dia"
                  ? "DO DIA"
                  : period === "Semana"
                    ? "DA SEMANA"
                    : "DO MÊS"}
              </small>
              <strong>{money(summary.totalCents)}</strong>
              <span>{summary.count} concluídos</span>
            </div>
          </div>
          <div className="finance-table">
            {summary.groups.length ? (
              <table>
                <caption className="sr-only">
                  Receita dos serviços concluídos no período
                </caption>
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Qtd.</th>
                    <th>Receita</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.groups.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <span className="service-label">
                          <i
                            style={{
                              background: entityColor(
                                g.id,
                                appearance.service_colors,
                              ),
                            }}
                          />
                          {g.name}
                        </span>
                      </td>
                      <td>{g.count}</td>
                      <td>
                        <strong>{money(g.cents)}</strong>
                      </td>
                      <td>
                        {summary.totalCents
                          ? ((g.cents / summary.totalCents) * 100).toFixed(1)
                          : "0"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <td>{summary.count - summary.missing}</td>
                    <td>{money(summary.totalCents)}</td>
                    <td>{summary.totalCents ? "100" : "0"}%</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="empty">
                <Wallet size={34} />
                <strong>Sem receita neste período</strong>
                <span>Conclua um atendimento com preço para vê-lo aqui.</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="finance-explanation">
        Valores agrupados pela data do atendimento, no fuso {timezone}. Somente
        concluídos entram no cálculo; cancelados e faltas ficam de fora. Este
        resumo não controla pagamentos, despesas ou lucro.
      </p>
    </section>
  );
}
