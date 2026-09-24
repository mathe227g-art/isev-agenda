"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BookingChallenge } from "@/components/booking-challenge";
import { db } from "@/lib/supabase";
import { CompanyIdentity } from "@/components/company-identity";
import { defaultAppearance, type Appearance } from "@/lib/models";
import { useCompanyTheme } from "@/hooks/use-appearance";
import { Brand } from "@/components/brand";
import { copyText } from "@/lib/clipboard";
import { Toaster } from "sonner";
import {
  CalendarDays,
  Check,
  Copy,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
};
type Person = { id: string; name: string };
type Slot = { starts_at: string; ends_at: string };
type Catalog = {
  company: { name: string; slug: string; timezone: string };
  services: Service[];
  professionals: Person[];
};
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const time = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
export default function BookingPage() {
  const params = useParams(),
    search = useSearchParams(),
    slug = String(params.slug ?? "");
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [servicesSelected, setServicesSelected] = useState<string[]>([]),
    [person, setPerson] = useState(""),
    [date, setDate] = useState(today()),
    [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState(""),
    [fetching, setFetching] = useState(false),
    [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; token: string } | null>(null),
    [cancelled, setCancelled] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [challengeVersion, setChallengeVersion] = useState(0);
  const [serviceQuery, setServiceQuery] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  useCompanyTheme(appearance);
  useEffect(() => {
    let live = true;
    db.rpc("booking_branding", { p_slug: slug }).then(({ data }) => {
      if (live) setAppearance({ ...defaultAppearance, ...data });
    });
    return () => {
      live = false;
    };
  }, [slug]);
  const cancelToken = search.get("cancel");
  const [maxDate] = useState(() => {
    const d = new Date(today() + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  function resetSlots(ready: boolean) {
    setSlot("");
    setSlots([]);
    setError("");
    setFetching(ready);
  }
  useEffect(() => {
    db.rpc("booking_catalog", { p_slug: slug }).then(({ data, error: e }) => {
      setLoading(false);
      if (e) setError("Não foi possível carregar esta página de agendamento.");
      else if (!data) setError("Esta empresa não foi encontrada.");
      else setCatalog(data as Catalog);
    });
  }, [slug]);
  useEffect(() => {
    if (!servicesSelected.length || !person || !date) return;
    let live = true;
    db.rpc("booking_slots_multi", {
      p_slug: slug,
      p_services: servicesSelected,
      p_professional: person,
      p_date: date,
    }).then(({ data, error: e }) => {
      if (!live) return;
      setFetching(false);
      if (e) setError("Não foi possível buscar os horários disponíveis.");
      else setSlots((data || []) as Slot[]);
    });
    return () => {
      live = false;
    };
  }, [slug, servicesSelected, person, date]);
  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot || fetching || busy || !servicesSelected.length || !person)
      return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_slug: slug,
          p_services: servicesSelected,
          p_professional: person,
          p_starts_at: slot,
          p_name: String(f.get("name")),
          p_phone: String(f.get("phone")),
          p_email: String(f.get("email")) || null,
          token: challenge,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível reservar.");
        return;
      }
      setDone({ id: data.booking_id, token: data.cancel_token });
    } catch {
      setError(
        "Conexão interrompida. Confira com a empresa se a reserva foi registrada antes de tentar novamente.",
      );
    } finally {
      setBusy(false);
      setChallenge("");
      setChallengeVersion((v) => v + 1);
    }
  }

  async function cancel(token: string) {
    setBusy(true);
    const { data, error: e } = await db.rpc("cancel_public", {
      p_token: token,
    });
    setBusy(false);
    if (e) setError(e.message);
    else if (!data)
      setError(
        "Este link de cancelamento expirou ou o atendimento já foi cancelado.",
      );
    else setCancelled(true);
  }
  if (loading)
    return (
      <div className="booking-page">
        <div className="public-card">Carregando agenda...</div>
      </div>
    );
  return (
    <div className="booking-page">
      <div className="booking-shell">
        <header className="public-header">
          <div className="public-company-brand">
            <Brand />
            {catalog && (
              <CompanyIdentity
                name={catalog.company.name}
                logo={appearance.logo_data_url}
                large
              />
            )}
          </div>
          <span>Agendamento online</span>
        </header>
        <main className="public-card">
          {error && !catalog ? (
            <div className="public-empty">
              <h1>Agenda indisponível</h1>
              <p>{error}</p>
            </div>
          ) : cancelToken ? (
            <div className="public-result">
              <CalendarDays size={36} />
              <h1>
                {cancelled ? "Agendamento cancelado" : "Cancelar agendamento"}
              </h1>
              <p>
                {cancelled
                  ? "O horário foi liberado."
                  : "Confirme o cancelamento do seu atendimento."}
              </p>
              {!cancelled && (
                <Button disabled={busy} onClick={() => cancel(cancelToken)}>
                  {busy ? "Aguarde..." : "Confirmar cancelamento"}
                </Button>
              )}
              {error && (
                <p role="alert" className="form-message">
                  {error}
                </p>
              )}
            </div>
          ) : done ? (
            <div className="public-result">
              <div className="result-icon">
                <Check />
              </div>
              <h1>Agendamento confirmado!</h1>
              <p>
                {catalog?.company.name} ·{" "}
                {servicesSelected
                  .map((id) => catalog?.services.find((s) => s.id === id)?.name)
                  .filter(Boolean)
                  .join(" + ")}
              </p>
              <p>
                {new Date(slot).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  dateStyle: "full",
                })}{" "}
                às {time(slot)}
              </p>
              <div className="cancel-copy">
                <span>Guarde seu link caso precise cancelar:</span>
                <code>{`${location.origin}/agendar/${slug}?cancel=${done.token}`}</code>
                <Button
                  variant="outline"
                  onClick={() =>
                    copyText(
                      `${location.origin}/agendar/${slug}?cancel=${done.token}`,
                    )
                  }
                >
                  <Copy size={16} /> Copiar link
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setDone(null);
                  setSlot("");
                }}
              >
                Fazer outro agendamento
              </Button>
            </div>
          ) : (
            <>
              <div className="public-heading">
                <span className="eyebrow">AGENDAMENTO ONLINE</span>
                <h1>{catalog?.company.name}</h1>
                <p>
                  Escolha o atendimento e encontre o melhor horário para você.
                </p>
              </div>
              <section className="public-service-catalog">
                <div className="catalog-heading">
                  <div>
                    <span className="eyebrow">1. ESCOLHA OS SERVIÇOS</span>
                    <h2>O que você deseja fazer?</h2>
                  </div>
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Pesquisar serviços"
                      value={serviceQuery}
                      onChange={(event) => setServiceQuery(event.target.value)}
                      placeholder="Pesquisar serviço..."
                    />
                  </label>
                </div>
                <div className="service-cards">
                  {catalog?.services
                    .filter((item) =>
                      item.name
                        .toLocaleLowerCase("pt-BR")
                        .includes(
                          serviceQuery.trim().toLocaleLowerCase("pt-BR"),
                        ),
                    )
                    .map((item) => {
                      const selected = servicesSelected.includes(item.id);
                      return (
                        <article
                          key={item.id}
                          className={selected ? "selected" : ""}
                        >
                          <div>
                            <h3>{item.name}</h3>
                            <p>{item.duration_minutes} minutos</p>
                            <strong>
                              {item.price === null
                                ? "Consulte o valor"
                                : Number(item.price).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                            </strong>
                          </div>
                          <button
                            type="button"
                            aria-label={
                              selected
                                ? `Remover ${item.name}`
                                : `Adicionar ${item.name}`
                            }
                            onClick={() => {
                              setServicesSelected((current) =>
                                selected
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id],
                              );
                              resetSlots(false);
                            }}
                          >
                            {selected ? (
                              <Trash2 size={18} />
                            ) : (
                              <Plus size={20} />
                            )}
                          </button>
                        </article>
                      );
                    })}
                </div>
              </section>
              {servicesSelected.length > 0 && (
                <div className="booking-form-grid">
                  <section className="booking-choices">
                    <div className="selected-services">
                      <strong>Serviços selecionados</strong>
                      {servicesSelected.map((id) => {
                        const item = catalog?.services.find(
                          (entry) => entry.id === id,
                        );
                        return (
                          item && (
                            <span key={id}>
                              {item.name}
                              <small>{item.duration_minutes} min</small>
                            </span>
                          )
                        );
                      })}
                    </div>
                    <div className="professional-picker">
                      <strong className="choice-label">
                        2. Escolha o profissional
                      </strong>
                      <label className="search-field">
                        <Search size={16} />
                        <input
                          aria-label="Pesquisar profissionais"
                          value={personQuery}
                          onChange={(event) =>
                            setPersonQuery(event.target.value)
                          }
                          placeholder="Pesquisar profissional..."
                        />
                      </label>
                      <div className="professional-options">
                        {catalog?.professionals
                          .filter((item) =>
                            item.name
                              .toLocaleLowerCase("pt-BR")
                              .includes(
                                personQuery.trim().toLocaleLowerCase("pt-BR"),
                              ),
                          )
                          .map((item) => (
                            <button
                              type="button"
                              aria-pressed={person === item.id}
                              key={item.id}
                              onClick={() => {
                                setPerson(item.id);
                                resetSlots(!!date);
                              }}
                            >
                              <UserRound size={17} />
                              {item.name}
                            </button>
                          ))}
                      </div>
                    </div>
                    <label>
                      3. Data
                      <Input
                        type="date"
                        value={date}
                        min={today()}
                        max={maxDate}
                        onChange={(e) => {
                          setDate(e.target.value);
                          resetSlots(
                            servicesSelected.length > 0 &&
                              !!person &&
                              !!e.target.value,
                          );
                        }}
                      />
                    </label>
                    <div>
                      <strong className="choice-label">
                        Horários disponíveis
                      </strong>
                      {fetching ? (
                        <p className="public-hint">Buscando horários...</p>
                      ) : !person ? (
                        <p className="public-hint">Selecione o profissional.</p>
                      ) : slots.length ? (
                        <div className="slots">
                          {slots.map((s) => (
                            <button
                              type="button"
                              aria-pressed={slot === s.starts_at}
                              className={slot === s.starts_at ? "selected" : ""}
                              key={s.starts_at}
                              onClick={() => setSlot(s.starts_at)}
                            >
                              {time(s.starts_at)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="public-hint">
                          Nenhum horário livre nesta data.
                        </p>
                      )}
                    </div>
                  </section>
                  <section className="booking-contact">
                    <div className="contact-title">
                      <UserRound size={20} />
                      <h2>Seus dados</h2>
                    </div>
                    <form className="dialog-form" onSubmit={book}>
                      <label>
                        Nome completo
                        <Input
                          name="name"
                          minLength={2}
                          required
                          placeholder="Seu nome"
                        />
                      </label>
                      <label>
                        WhatsApp ou telefone
                        <Input
                          name="phone"
                          type="tel"
                          minLength={7}
                          required
                          placeholder="(00) 00000-0000"
                        />
                      </label>
                      <label>
                        E-mail <small>(opcional)</small>
                        <Input
                          name="email"
                          type="email"
                          placeholder="voce@email.com"
                        />
                      </label>
                      {error && (
                        <p className="form-message" role="alert">
                          {error}
                        </p>
                      )}
                      <BookingChallenge
                        key={challengeVersion}
                        onToken={setChallenge}
                      />
                      <Button
                        disabled={!slot || busy || fetching || !challenge}
                        size="lg"
                      >
                        {busy ? "Confirmando..." : "Confirmar agendamento"}
                      </Button>
                      <small>
                        Você receberá a confirmação nesta página. Guarde o link
                        de cancelamento.
                      </small>
                    </form>
                  </section>
                </div>
              )}
            </>
          )}
        </main>
        <Toaster richColors />
        <footer className="public-footer">
          Agendamento feito com iSev Agenda
        </footer>
      </div>
    </div>
  );
}
