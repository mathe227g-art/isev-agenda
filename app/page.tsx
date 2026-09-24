"use client";

import { useEffect, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import type { WorkingHour, TimeBlock } from "@/components/mobile-agenda";
import { Menu } from "lucide-react";
import { Availability } from "@/components/availability";
import { TimePicker, quarterHours } from "@/components/time-picker";
import { dateKey } from "@/lib/planning.mjs";
import { InstallApp } from "@/components/install-app";
import { observeIdentity } from "@/lib/session.mjs";
import type { Company, Person, Service, Booking } from "@/lib/models";
import { AgendaCalendar } from "@/components/agenda-calendar";
import { Finance } from "@/components/finance";
import { CompanySettings } from "@/components/company-settings";
import { CompanyIdentity } from "@/components/company-identity";
import { EntityColors } from "@/components/entity-colors";
import { useAppearance, useCompanyTheme } from "@/hooks/use-appearance";
import { zonedInstant } from "@/lib/dates.mjs";
import { fetchBookings } from "@/lib/bookings";
import { db } from "@/lib/supabase";
import { Brand } from "@/components/brand";
import { copyText } from "@/lib/clipboard";
import { type User } from "@supabase/supabase-js";
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Scissors,
  UserRound,
  Clock3,
  Link2,
  Settings2,
  LogOut,
  Plus,
  Wallet,
  ChevronRight,
  Copy,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};
const nav = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Agenda", icon: CalendarDays },
  { label: "Financeiro", icon: Wallet },
  { label: "Clientes", icon: Users },
  { label: "Serviços", icon: Scissors },
  { label: "Profissionais", icon: UserRound },
  { label: "Disponibilidade", icon: Clock3 },
  { label: "Página de agendamento", icon: Link2 },
  { label: "Configurações", icon: Settings2 },
];
const descriptions: Record<string, string> = {
  "Visão geral": "Acompanhe os atendimentos do seu negócio.",
  Agenda: "Seu calendário, seus horários, tudo à vista.",
  Financeiro: "Acompanhe a receita dos serviços concluídos.",
  Clientes: "As pessoas que você atende em um só lugar.",
  Serviços: "Defina a duração e o valor dos atendimentos.",
  Profissionais: "Organize sua equipe.",
  Disponibilidade: "Defina os dias, horários e folgas.",
  "Página de agendamento": "Compartilhe sua agenda com seus clientes.",
  Configurações: "Sua marca e seu estilo em cada detalhe.",
};
const statuses: Record<string, string> = {
  confirmed: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};
const day = (date: Date) =>
  date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
const timeLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));

export default function Home() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null),
    [error, setError] = useState("");
  const [people, setPeople] = useState<Person[]>([]),
    [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]),
    [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState("Visão geral"),
    [dialog, setDialog] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<
    (Customer & Partial<Service & Person>) | null
  >(null);
  const [deleting, setDeleting] = useState<{
    table: string;
    id: string;
    name: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [calendarHours, setCalendarHours] = useState<WorkingHour[]>([]);
  const [calendarBlocks, setCalendarBlocks] = useState<TimeBlock[]>([]);
  const [availabilityReady, setAvailabilityReady] = useState(false);
  const [bookingStart, setBookingStart] = useState("");
  const [bookingProfessional, setBookingProfessional] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const {
    appearance,
    setAppearance,
    appearanceError,
    appearanceReady,
    appearanceAvailable,
  } = useAppearance(company?.id);
  useCompanyTheme(appearance);
  function openBooking(value = "", professional = "") {
    setBookingProfessional(professional);
    setEditing(null);
    setBookingStart(value);
    setDialog("booking");
  }
  const reload = () => {
    if (!company) setCompanyLoading(true);
    setDataLoading(true);
    setRefresh((x) => x + 1);
  };
  useEffect(
    () =>
      observeIdentity(
        db.auth,
        (nextUser: User | null) => {
          setUser(nextUser);
          setCompanyLoading(true);
          setCompany(null);
          setIsOwner(false);
          setPage(
            window.matchMedia("(max-width: 767px)").matches
              ? "Agenda"
              : "Visão geral",
          );
          setCalendarHours([]);
          setCalendarBlocks([]);
          setAvailabilityReady(false);
          setDataLoading(true);
          setPeople([]);
          setServices([]);
          setCustomers([]);
          setBookings([]);
          setError("");
          setLoading(false);
        },
        setUser,
      ),
    [],
  );
  async function logout() {
    const { error } = await db.auth.signOut({ scope: "local" });
    if (error) {
      setError("Não foi possível sair. Confira sua conexão e tente novamente.");
      toast.error("Não foi possível sair da conta.");
    }
  }
  useEffect(() => {
    if (!user) return;
    let live = true;
    db.from("company_members")
      .select("company_id,role,companies(id,name,slug,timezone)")
      .eq("user_id", user.id)
      .limit(1)
      .then(({ data, error: e }) => {
        if (!live) return;
        setCompanyLoading(false);
        if (e) {
          setError(`Não foi possível carregar sua empresa: ${e.message}`);
          return;
        }
        setIsOwner(data?.[0]?.role === "owner");
        setCompany(
          (data?.[0] as unknown as { companies: Company } | undefined)
            ?.companies ?? null,
        );
        setError("");
      });
    return () => {
      live = false;
    };
  }, [user, refresh]);
  useEffect(() => {
    if (!company) return;
    let live = true;
    Promise.all([
      db
        .from("professionals")
        .select("id,name,active")
        .eq("company_id", company.id)
        .order("name"),
      db
        .from("services")
        .select("id,name,duration_minutes,price,active")
        .eq("company_id", company.id)
        .order("name"),
      db
        .from("customers")
        .select("id,name,phone,email")
        .eq("company_id", company.id)
        .order("name"),
      fetchBookings(company.id),
      db
        .from("working_hours")
        .select("professional_id,weekday,start_time,end_time")
        .eq("company_id", company.id),
      db
        .from("time_blocks")
        .select("id,professional_id,starts_at,ends_at,reason")
        .eq("company_id", company.id),
    ]).then(([p, s, c, b, h, t]) => {
      if (!live) return;
      setDataLoading(false);
      if ([p, s, c, b].some((r) => r.error)) {
        setError(
          "Não foi possível carregar os dados. Confira as permissões do banco.",
        );
        return;
      }
      setCalendarHours(h.data ?? []);
      setCalendarBlocks(t.data ?? []);
      setAvailabilityReady(!h.error && !t.error);
      setPeople(p.data ?? []);
      setServices(s.data ?? []);
      setCustomers(c.data ?? []);
      setBookings((b.data ?? []) as unknown as Booking[]);
      setError("");
    });
    return () => {
      live = false;
    };
  }, [company, refresh]);
  if (loading)
    return (
      <div className="centered">
        <div className="loading-state">
          <Brand />
          <span className="loading-bar" />
          <p>Carregando sua agenda...</p>
        </div>
      </div>
    );
  if (!user) return <Auth />;
  if (error && !company)
    return (
      <div className="centered">
        <div className="panel auth-panel">
          <h1>iSev Agenda</h1>
          <p>{error}</p>
          <Button onClick={reload}>Tentar novamente</Button>
          <Button variant="ghost" onClick={logout}>
            Sair
          </Button>
        </div>
      </div>
    );
  if (companyLoading)
    return (
      <div className="centered">
        <div className="loading-state">
          <Brand />
          <span className="loading-bar" />
          <p>Preparando sua agenda...</p>
        </div>
      </div>
    );
  if (!company) return <Onboarding user={user} onReady={reload} />;
  const todayItems = bookings
    .filter(
      (b) =>
        day(new Date(b.starts_at)) === day(new Date()) &&
        b.status !== "cancelled",
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const link =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/agendar/${company.slug}`;
  async function changeStatus(id: string, status: string) {
    const { error: e } = await db
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .eq("company_id", company!.id);
    if (e) toast.error(e.message);
    else {
      toast.success("Atendimento atualizado");
      reload();
    }
  }
  return (
    <SidebarProvider>
      <Sidebar className="app-sidebar">
        <SidebarHeader className="brand">
          <Brand />
          <CompanyIdentity
            name={company.name}
            logo={appearance.logo_data_url}
            large
          />
        </SidebarHeader>
        <SidebarContent>
          <p className="nav-caption">PRINCIPAL</p>
          <AppNavigation page={page} isOwner={isOwner} onNavigate={setPage} />
        </SidebarContent>
        <SidebarFooter className="side-foot">
          <CompanyIdentity
            name={company.name}
            logo={appearance.logo_data_url}
            compact
          />
          <button className="signout" onClick={logout}>
            <LogOut size={16} /> Sair
          </button>
          <InstallApp compact />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="workspace">
        <header className="topbar">
          <SidebarTrigger />
          <span className="crumb">
            {company.name} <span>/</span> {page}
          </span>
          <span className="account-email">
            <span className="online-dot" /> {user.email}
          </span>
        </header>
        <div
          className={`main-area ${page === "Agenda" ? "agenda-main-area" : ""}`}
        >
          <div className="heading">
            <div>
              <span className="eyebrow">
                iSEV AGENDA · {company.name.toUpperCase()}
              </span>
              <h1>{page}</h1>
              <p>{descriptions[page]}</p>
            </div>
            {["Visão geral", "Agenda"].includes(page) && (
              <Button onClick={() => openBooking()}>
                <Plus size={16} /> Novo agendamento
              </Button>
            )}
          </div>
          {error && (
            <div className="error-box" role="alert">
              {error}{" "}
              <Button variant="ghost" onClick={reload}>
                Tentar novamente
              </Button>
            </div>
          )}
          {appearanceError && (
            <div className="setup-notice" role="status">
              {appearanceError}
            </div>
          )}
          {dataLoading && (
            <p role="status" className="muted">
              Atualizando os dados da empresa...
            </p>
          )}
          {page === "Visão geral" && (
            <>
              <section className="welcome-banner">
                <div>
                  <span className="banner-tag">
                    <span className="online-dot" /> SEU DIA, SOB CONTROLE
                  </span>
                  <h2>Mais tempo para o que importa.</h2>
                  <p>Uma rotina organizada começa com uma boa agenda.</p>
                  <Button variant="secondary" onClick={() => setPage("Agenda")}>
                    Explorar minha agenda <ChevronRight size={16} />
                  </Button>
                </div>
                <div className="banner-calendar">
                  <CalendarDays size={100} strokeWidth={1} />
                  <span>
                    {new Date().toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              </section>
              <div className="stats">
                <Stat
                  label="Atendimentos hoje"
                  value={todayItems.length}
                  icon={<CalendarDays />}
                />
                <Stat
                  label="Próximos"
                  value={
                    bookings.filter(
                      (b) =>
                        b.status === "confirmed" &&
                        new Date(b.starts_at) > new Date(),
                    ).length
                  }
                  icon={<Clock3 />}
                />
                <Stat
                  label="Clientes"
                  value={customers.length}
                  icon={<Users />}
                />
                <Stat
                  label="Profissionais"
                  value={people.filter((p) => p.active).length}
                  icon={<UserRound />}
                />
              </div>
              <div className="content-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Agenda de hoje</h2>
                      <p>{dateLabel(new Date())}</p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setPage("Agenda")}
                    >
                      Ver agenda →
                    </button>
                  </div>
                  <BookingRows items={todayItems} onStatus={changeStatus} />
                </div>
                <div className="panel link-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Link de agendamento</h2>
                      <p>Compartilhe com seus clientes</p>
                    </div>
                    <Link2 size={19} />
                  </div>
                  <p className="link-preview">{link}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void copyText(link);
                    }}
                  >
                    <Copy size={15} /> Copiar link
                  </Button>
                  <div className="divider" />
                  <h3>Para começar</h3>
                  <p>
                    Cadastre serviços e profissionais, configure a
                    disponibilidade e compartilhe seu link.
                  </p>
                </div>
              </div>
            </>
          )}
          {page === "Agenda" && (
            <AgendaCalendar
              bookings={bookings}
              people={people}
              services={services}
              appearance={appearance}
              timezone={company.timezone}
              onDelete={async (id) => {
                const { data, error } = await db
                  .from("bookings")
                  .delete()
                  .eq("company_id", company.id)
                  .eq("id", id)
                  .select("id");
                if (error || !data?.length)
                  throw new Error(
                    "Não foi possível excluir. Confira sua conexão e permissões.",
                  );
                setBookings((bs) => bs.filter((b) => b.id !== id));
                toast.success("Agendamento excluído");
              }}
              hours={calendarHours}
              blocks={calendarBlocks}
              availabilityReady={availabilityReady}
              onStatus={changeStatus}
              onCreate={openBooking}
            />
          )}
          {page === "Financeiro" && !dataLoading && !error && (
            <Finance
              bookings={bookings}
              services={services}
              timezone={company.timezone}
              appearance={appearance}
            />
          )}
          {page === "Clientes" && (
            <Directory
              title="Clientes"
              columns={["Nome", "Telefone", "E-mail"]}
              rows={customers.map((c) => [
                c.name,
                c.phone || "—",
                c.email || "—",
              ])}
              add={() => {
                setEditing(null);
                setDialog("customer");
              }}
              edit={(i) => {
                setEditing(customers[i]);
                setDialog("customer");
              }}
              remove={(i) => {
                setDeleteError("");
                setDeleting({
                  table: "customers",
                  id: customers[i].id,
                  name: customers[i].name,
                });
              }}
            />
          )}
          {isOwner && page === "Serviços" && (
            <>
              <Directory
                title="Serviços"
                columns={["Serviço", "Duração", "Preço", "Situação"]}
                rows={services.map((s) => [
                  s.name,
                  `${s.duration_minutes} min`,
                  s.price === null
                    ? "—"
                    : Number(s.price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }),
                  s.active ? "Ativo" : "Inativo",
                ])}
                add={() => {
                  setEditing(null);
                  setDialog("service");
                }}
                edit={(i) => {
                  setEditing({ phone: null, email: null, ...services[i] });
                  setDialog("service");
                }}
                remove={(i) => {
                  setDeleteError("");
                  setDeleting({
                    table: "services",
                    id: services[i].id,
                    name: services[i].name,
                  });
                }}
              />
              <EntityColors
                items={services}
                kind="service"
                companyId={company.id}
                appearance={appearance}
                onSaved={setAppearance}
                available={appearanceAvailable}
              />
            </>
          )}
          {isOwner && page === "Profissionais" && (
            <>
              <Directory
                title="Profissionais"
                columns={["Nome", "Situação"]}
                rows={people.map((p) => [
                  p.name,
                  p.active ? "Ativo" : "Inativo",
                ])}
                add={() => {
                  setEditing(null);
                  setDialog("professional");
                }}
                edit={(i) => {
                  setEditing({ phone: null, email: null, ...people[i] });
                  setDialog("professional");
                }}
                remove={(i) => {
                  setDeleteError("");
                  setDeleting({
                    table: "professionals",
                    id: people[i].id,
                    name: people[i].name,
                  });
                }}
              />
              <EntityColors
                items={people}
                kind="professional"
                companyId={company.id}
                appearance={appearance}
                onSaved={setAppearance}
                available={appearanceAvailable}
              />
            </>
          )}
          {isOwner && page === "Disponibilidade" && (
            <Availability company={company} people={people} onSaved={reload} />
          )}
          {page === "Página de agendamento" && (
            <div className="panel simple-panel">
              <h2>Seu link público</h2>
              <p>
                O cliente escolhe o serviço, o profissional e um horário
                disponível.
              </p>
              <div className="copy-row">
                <code>{link}</code>
                <Button
                  onClick={() => {
                    void copyText(link);
                  }}
                >
                  <Copy size={15} /> Copiar
                </Button>
              </div>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Abrir página de agendamento ↗
              </a>
            </div>
          )}
          {isOwner && page === "Configurações" && appearanceReady && (
            <CompanySettings
              key={company.id}
              company={company}
              appearance={appearance}
              available={appearanceAvailable}
              onSaved={setAppearance}
            />
          )}
        </div>
      </SidebarInset>
      <MobileNavigation page={page} onNavigate={setPage} />
      <CreateDialog
        key={`${dialog}-${editing?.id ?? "new"}`}
        editing={editing}
        initialDate={bookingStart}
        initialProfessional={bookingProfessional}
        kind={dialog}
        setKind={setDialog}
        company={company}
        people={people}
        services={services}
        customers={customers}
        onSaved={reload}
      />
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cadastro?</DialogTitle>
          </DialogHeader>
          <p>
            Excluir <strong>{deleting?.name}</strong>? Esta ação não pode ser
            desfeita. Cadastros com agendamentos vinculados são preservados.
          </p>
          {deleteError && (
            <p className="form-message" role="alert">
              {deleteError}
            </p>
          )}
          <div className="directory-actions">
            <Button
              variant="outline"
              disabled={deleteBusy}
              onClick={() => setDeleting(null)}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteBusy}
              onClick={async () => {
                if (!deleting || deleteBusy) return;
                setDeleteBusy(true);
                setDeleteError("");
                try {
                  const { data, error } = await db
                    .from(deleting.table)
                    .delete()
                    .eq("company_id", company.id)
                    .eq("id", deleting.id)
                    .select("id");
                  if (error)
                    setDeleteError(
                      error.code === "23503"
                        ? "Este cadastro possui agendamentos e não pode ser excluído. Serviços e profissionais podem ser desativados em Editar."
                        : "Não foi possível excluir. Confira as permissões e tente novamente.",
                    );
                  else if (!data?.length)
                    setDeleteError(
                      "Cadastro não encontrado ou sem permissão para excluir.",
                    );
                  else {
                    setDeleting(null);
                    toast.success("Cadastro excluído");
                    reload();
                  }
                } catch {
                  setDeleteError("Falha de conexão. Tente novamente.");
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? "Excluindo..." : "Excluir cadastro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster richColors />
    </SidebarProvider>
  );
}
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function BookingRows({
  items,
  onStatus,
  showDate = false,
}: {
  items: Booking[];
  onStatus: (id: string, status: string) => void;
  showDate?: boolean;
}) {
  return items.length ? (
    <div className="booking-list">
      {items.map((b) => (
        <div className="booking-row" key={b.id}>
          <div className="booking-time">
            {showDate && <small>{shortDate(b.starts_at)}</small>}
            <strong>{timeLabel(b.starts_at)}</strong>
            <span>{timeLabel(b.ends_at)}</span>
          </div>
          <div className="booking-info">
            <strong>{b.customers?.name || "Cliente"}</strong>
            <span>
              {b.services?.name || "Serviço"} ·{" "}
              {b.professionals?.name || "Profissional"}
            </span>
          </div>
          <span className={`status status-${b.status}`}>
            {statuses[b.status] || b.status}
          </span>
          <select
            aria-label="Alterar status"
            value={b.status}
            onChange={(e) => onStatus(b.id, e.target.value)}
          >
            {Object.entries(statuses).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  ) : (
    <div className="empty">
      <CalendarDays size={30} />
      <strong>Nenhum atendimento por aqui</strong>
      <span>Os agendamentos aparecerão neste espaço.</span>
    </div>
  );
}
function Directory({
  title,
  columns,
  rows,
  add,
  edit,
  remove,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  add: () => void;
  edit: (index: number) => void;
  remove: (index: number) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title} cadastrados</h2>
          <p>
            {rows.length} registro{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={add}>
          <Plus size={16} /> Adicionar
        </Button>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                  <td>
                    <div className="directory-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => edit(i)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(i)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Users size={30} />
          <strong>Nenhum registro ainda</strong>
          <span>Use o botão Adicionar para começar.</span>
        </div>
      )}
    </div>
  );
}
function Auth() {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = register
        ? await db.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: location.origin },
          })
        : await db.auth.signInWithPassword({ email: email.trim(), password });
      setMessage(
        result.error
          ? result.error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos. Tente novamente."
            : result.error.message
          : register
            ? "Confira seu e-mail para confirmar a conta."
            : "",
      );
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin },
      });
      if (error) {
        setMessage(
          "Não foi possível iniciar o login com Google. Tente novamente.",
        );
        setBusy(false);
      }
    } catch {
      setMessage(
        "Não foi possível conectar ao Google. Confira sua conexão e tente novamente.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <Brand />
        <div className="auth-story">
          <span className="banner-tag">
            SIMPLES DE USAR. FÁCIL DE ORGANIZAR.
          </span>
          <h1>
            Seu tempo.
            <br />
            <span>Mais resultados.</span>
          </h1>
          <p>
            Uma agenda inteligente para cuidar do seu negócio e de quem confia
            em você.
          </p>
          <div className="auth-features">
            <span>
              <CalendarDays size={18} /> Sua agenda em um só lugar
            </span>
            <span>
              <Users size={18} /> Clientes e equipe conectados
            </span>
            <span>
              <Link2 size={18} /> Agendamentos a qualquer hora
            </span>
          </div>
        </div>
        <div className="auth-bottom">
          <span className="online-dot" /> Menos tarefas. Mais tempo para você.
        </div>
      </section>
      <div className="auth-main">
        <div className="auth-top-note">BEM-VINDO AO SEU NOVO DIA</div>
        <form className="panel auth-panel" onSubmit={submit}>
          <div className="login-icon">
            <CalendarDays size={25} />
          </div>
          <span className="eyebrow">VAMOS COMEÇAR</span>
          <h2>{register ? "Crie sua conta" : "Que bom ter você aqui."}</h2>
          <p>
            {register
              ? "Dê o próximo passo para uma rotina mais leve."
              : "Entre para acompanhar sua agenda e seus clientes."}
          </p>
          <label>
            E-mail profissional
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
            />
          </label>
          <label>
            Senha
            <Input
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
            />
          </label>
          {message && (
            <div className="form-message" role="status">
              {message}
            </div>
          )}
          <Button type="submit" disabled={busy}>
            {busy
              ? "Aguarde..."
              : register
                ? "Criar minha conta"
                : "Entrar na minha agenda"}
            <ChevronRight size={17} />
          </Button>
          <div className="auth-separator">
            <span>ou continue com</span>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={google}
          >
            <span className="google-letter">G</span> Google
          </Button>
          <button
            type="button"
            className="text-link auth-toggle"
            onClick={() => {
              setRegister(!register);
              setMessage("");
            }}
          >
            {register
              ? "Já tenho uma conta. Entrar"
              : "Novo por aqui? Crie sua conta"}
          </button>
        </form>
        <InstallApp />
        <p className="auth-legal">
          iSev Agenda · Feita para simplificar sua rotina.
        </p>
      </div>
    </div>
  );
}
function Onboarding({ user, onReady }: { user: User; onReady: () => void }) {
  const [name, setName] = useState(""),
    [slug, setSlug] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await db.rpc("create_company", {
      p_name: name,
      p_slug: slug,
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else onReady();
  }
  return (
    <div className="centered">
      <form className="panel auth-panel" onSubmit={submit}>
        <span className="eyebrow">PRIMEIRO PASSO</span>
        <h1>Configure sua empresa</h1>
        <p>Depois você cadastra serviços, profissionais e horários.</p>
        <label>
          Nome da empresa
          <Input
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(
                e.target.value
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, ""),
              );
            }}
            placeholder="Ex.: Barbearia Central"
          />
        </label>
        <label>
          Endereço do agendamento
          <Input
            required
            value={slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
          />
        </label>
        {message && <div className="form-message">{message}</div>}
        <Button disabled={busy}>{busy ? "Criando..." : "Criar empresa"}</Button>
        <small>Conta: {user.email}</small>
      </form>
    </div>
  );
}
function CreateDialog({
  editing,
  initialDate,
  initialProfessional,
  kind,
  setKind,
  company,
  people,
  services,
  customers,
  onSaved,
}: {
  editing: (Customer & Partial<Service & Person>) | null;
  initialDate: string;
  initialProfessional: string;
  kind: string | null;
  setKind: (v: string | null) => void;
  company: Company;
  people: Person[];
  services: Service[];
  customers: Customer[];
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const f = new FormData(e.currentTarget);
      let result: { error: { message: string } | null };
      if (kind !== "booking") {
        const table =
          kind === "professional"
            ? "professionals"
            : kind === "service"
              ? "services"
              : "customers";
        const values = {
          name: String(f.get("name")).trim(),
          ...(kind === "customer"
            ? {
                phone: String(f.get("phone")).trim() || null,
                email: String(f.get("email")).trim() || null,
              }
            : { active: f.get("active") !== "false" }),
          ...(kind === "service"
            ? {
                duration_minutes: Number(f.get("duration")),
                price: f.get("price") ? Number(f.get("price")) : null,
              }
            : {}),
        };
        const response = editing
          ? await db
              .from(table)
              .update(values)
              .eq("company_id", company.id)
              .eq("id", editing.id)
              .select("id")
          : await db
              .from(table)
              .insert({ company_id: company.id, ...values })
              .select("id");
        result = {
          error:
            response.error ||
            (!response.data?.length
              ? { message: "Não foi possível salvar este cadastro." }
              : null),
        };
      } else {
        if (!quarterHours.includes(String(f.get("time"))))
          throw new Error("Escolha um horário de 15 em 15 minutos.");
        const start = zonedInstant(
          `${f.get("date")}T${f.get("time")}`,
          company.timezone,
        );
        const duration =
          services.find((s) => s.id === f.get("service_id"))
            ?.duration_minutes || 30;
        result = await db.from("bookings").insert({
          company_id: company.id,
          customer_id: String(f.get("customer_id")),
          professional_id: String(f.get("professional_id")),
          service_id: String(f.get("service_id")),
          starts_at: start.toISOString(),
          ends_at: new Date(start.getTime() + duration * 60000).toISOString(),
        });
      }
      setBusy(false);
      if (result.error) setMessage(result.error.message);
      else {
        toast.success("Salvo com sucesso");
        setKind(null);
        onSaved();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar. Confira os dados e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={!!kind}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setKind(null);
          setMessage("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Editar ${kind === "customer" ? "cliente" : kind === "service" ? "serviço" : "profissional"}`
              : kind === "booking"
                ? "Novo agendamento"
                : kind === "customer"
                  ? "Adicionar cliente"
                  : kind === "service"
                    ? "Adicionar serviço"
                    : "Adicionar profissional"}
          </DialogTitle>
        </DialogHeader>
        <form className="dialog-form" onSubmit={save}>
          {kind !== "booking" && (
            <label>
              Nome
              <Input
                name="name"
                required
                minLength={2}
                maxLength={120}
                autoFocus
                defaultValue={editing?.name}
              />
            </label>
          )}
          {kind === "customer" && (
            <>
              <label>
                Telefone
                <Input
                  name="phone"
                  type="tel"
                  defaultValue={editing?.phone ?? ""}
                />
              </label>
              <label>
                E-mail
                <Input
                  name="email"
                  type="email"
                  defaultValue={editing?.email ?? ""}
                />
              </label>
            </>
          )}
          {kind === "service" && (
            <>
              <label>
                Duração em minutos
                <Input
                  name="duration"
                  type="number"
                  min="5"
                  max="1440"
                  defaultValue={editing?.duration_minutes ?? 30}
                  required
                />
              </label>
              <label>
                Preço (R$)
                <Input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editing?.price ?? ""}
                />
              </label>
            </>
          )}
          {(kind === "service" || kind === "professional") && (
            <label>
              Situação
              <select
                name="active"
                defaultValue={String(editing?.active ?? true)}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          )}
          {kind === "booking" && (
            <>
              <label>
                Cliente
                <select name="customer_id" required>
                  <option value="">Selecione</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Serviço
                <select name="service_id" required>
                  <option value="">Selecione</option>
                  {services
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.duration_minutes} min
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Profissional
                <select
                  name="professional_id"
                  required
                  defaultValue={initialProfessional || undefined}
                >
                  <option value="">Selecione</option>
                  {people
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="two-fields">
                <label>
                  Data
                  <Input
                    name="date"
                    type="date"
                    required
                    defaultValue={
                      initialDate.slice(0, 10) ||
                      dateKey(new Date(), company.timezone)
                    }
                  />
                </label>
                <label>
                  Horário
                  <TimePicker
                    name="time"
                    defaultValue={initialDate.slice(11, 16) || "09:00"}
                  />
                </label>
              </div>
              <small>Horários de 15 em 15 minutos · {company.timezone}</small>
              <p className="muted">
                Cadastre cliente, serviço e profissional antes de agendar.
              </p>
            </>
          )}
          {message && (
            <div className="form-message" role="alert">
              {message}
            </div>
          )}
          <Button disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AppNavigation({
  page,
  isOwner,
  onNavigate,
}: {
  page: string;
  isOwner: boolean;
  onNavigate: (page: string) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu className="nav-list">
      {nav
        .filter(
          (item) =>
            isOwner ||
            ![
              "Serviços",
              "Profissionais",
              "Disponibilidade",
              "Configurações",
            ].includes(item.label),
        )
        .map((item) => (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              isActive={page === item.label}
              onClick={() => {
                onNavigate(item.label);
                setOpenMobile(false);
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );
}
function MobileNavigation({
  page,
  onNavigate,
}: {
  page: string;
  onNavigate: (page: string) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação principal">
      {[
        { name: "Agenda", Icon: CalendarDays },
        { name: "Clientes", Icon: Users },
        { name: "Financeiro", Icon: Wallet },
      ].map(({ name, Icon }) => (
        <button
          key={name}
          aria-current={page === name ? "page" : undefined}
          onClick={() => {
            onNavigate(name);
            setOpenMobile(false);
          }}
        >
          <Icon size={22} />
          <span>{name}</span>
        </button>
      ))}
      <button onClick={() => setOpenMobile(true)}>
        <Menu size={22} />
        <span>Mais</span>
      </button>
    </nav>
  );
}
