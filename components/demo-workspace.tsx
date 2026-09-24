"use client";
import { useState } from "react";
import { AgendaCalendar } from "./agenda-calendar";
import { CompanySettings } from "./company-settings";
import { type Appearance } from "@/lib/models";
import { Finance } from "./finance";
import { Brand } from "./brand";
import { CompanyIdentity } from "./company-identity";
import { Button } from "./ui/button";
import {
  defaultAppearance,
  type Booking,
  type Person,
  type Service,
} from "@/lib/models";
import { dateKey, addDays } from "@/lib/planning.mjs";
import { zonedInstant } from "@/lib/dates.mjs";
import { useCompanyTheme } from "@/hooks/use-appearance";
import { toast, Toaster } from "sonner";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "./ui/sidebar";
import { CalendarDays, Wallet, Moon, Sun, Settings2 } from "lucide-react";
const zone = "America/Sao_Paulo";
const people: Person[] = [
  { id: "ana", name: "Ana Oliveira", active: true },
  { id: "bruno", name: "Bruno Santos", active: true },
  { id: "carla", name: "Carla Mendes", active: true },
];
const services: Service[] = [
  {
    id: "cut",
    name: "Corte de cabelo",
    price: 50,
    duration_minutes: 60,
    active: true,
  },
  { id: "beard", name: "Barba", price: 35, duration_minutes: 30, active: true },
  {
    id: "color",
    name: "Coloração",
    price: 150,
    duration_minutes: 90,
    active: true,
  },
];
function fixtures(): Booking[] {
  const day = dateKey(new Date(), zone);
  return Array.from({ length: 18 }, (_, i) => {
    const service = services[i % 3],
      person = people[i % 3],
      d = addDays(day, Math.floor(i / 3) - 2),
      hour = 9 + (i % 3) * 2;
    const start = zonedInstant(
      `${d}T${String(hour).padStart(2, "0")}:00`,
      zone,
    );
    return {
      id: String(i),
      starts_at: start.toISOString(),
      ends_at: new Date(
        +start + service.duration_minutes * 60000,
      ).toISOString(),
      status: i < 12 ? "completed" : "confirmed",
      service_id: service.id,
      professional_id: person.id,
      customer_id: String(i),
      customers: {
        name: [
          "Marina Costa",
          "Rafael Lima",
          "Juliana Alves",
          "Lucas Martins",
          "Beatriz Souza",
          "Pedro Rocha",
        ][i % 6],
      },
      services: { name: service.name },
      professionals: { name: person.name },
      charged_price: i < 12 ? service.price : null,
      price_source: i < 12 ? "at_completion" : null,
    };
  });
}
export function DemoWorkspace() {
  const [bookings, setBookings] = useState(fixtures),
    [page, setPage] = useState("Agenda"),
    [appearance, setAppearance] = useState<Appearance>({
      ...defaultAppearance,
      professional_colors: {
        ana: "#6e56cf",
        bruno: "#078678",
        carla: "#ce6642",
      },
      service_colors: { cut: "#6e56cf", beard: "#078678", color: "#ce6642" },
    });
  useCompanyTheme(appearance);
  return (
    <SidebarProvider>
      <Sidebar className="app-sidebar">
        <SidebarHeader className="brand">
          <Brand />
          <CompanyIdentity
            name="Studio Aurora"
            logo={appearance.logo_data_url}
            large
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="nav-list">
            {[
              { name: "Agenda", Icon: CalendarDays },
              { name: "Financeiro", Icon: Wallet },
              { name: "Configurações", Icon: Settings2 },
            ].map(({ name, Icon }) => (
              <SidebarMenuItem key={name}>
                <SidebarMenuButton
                  isActive={page === name}
                  onClick={() => setPage(name)}
                >
                  <Icon size={18} />
                  {name}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="workspace">
        <header className="topbar">
          <SidebarTrigger />
          <span className="crumb">Studio Aurora / {page}</span>
        </header>
        <div className="main-area">
          <div className="setup-notice">
            Demonstração local · dados fictícios · nenhuma alteração é salva no
            banco.
          </div>
          <div className="heading">
            <div>
              <span className="eyebrow">SUA ROTINA, MAIS LEVE</span>
              <h1>{page}</h1>
              <p>
                {page === "Agenda"
                  ? "Uma visão completa dos seus atendimentos."
                  : "Cada atendimento, um resultado para o seu negócio."}
              </p>
            </div>
            <div className="demo-tabs">
              <input
                type="color"
                aria-label="Cor da demonstração"
                value={appearance.primary_color}
                onChange={(e) =>
                  setAppearance((a) => ({
                    ...a,
                    primary_color: e.target.value,
                  }))
                }
              />
              <Button
                variant="outline"
                onClick={() =>
                  setAppearance((a) => ({
                    ...a,
                    theme: a.theme === "light" ? "dark" : "light",
                  }))
                }
              >
                {appearance.theme === "light" ? (
                  <Moon size={16} />
                ) : (
                  <Sun size={16} />
                )}{" "}
                {appearance.theme === "light" ? "Modo escuro" : "Modo claro"}
              </Button>
            </div>
          </div>
          {page === "Configurações" ? (
            <CompanySettings
              company={{
                id: "demo",
                name: "Studio Aurora",
                slug: "studio-aurora",
                timezone: zone,
              }}
              appearance={appearance}
              onSaved={setAppearance}
              available
              persist={async () => {}}
            />
          ) : page === "Agenda" ? (
            <AgendaCalendar
              bookings={bookings}
              people={people}
              services={services}
              appearance={appearance}
              timezone={zone}
              onCreate={(date) =>
                toast.info(
                  `Horário selecionado: ${date.replace("T", " às ")} (demonstração)`,
                )
              }
              availabilityReady
              hours={people.flatMap((p) =>
                Array.from({ length: 6 }, (_, i) => ({
                  professional_id: p.id,
                  weekday: i + 1,
                  start_time: "09:00",
                  end_time: "18:00",
                })),
              )}
              blocks={[
                {
                  id: "demo-block",
                  professional_id: "ana",
                  starts_at: zonedInstant(
                    dateKey(new Date(), zone) + "T12:00",
                    zone,
                  ).toISOString(),
                  ends_at: zonedInstant(
                    dateKey(new Date(), zone) + "T13:00",
                    zone,
                  ).toISOString(),
                  reason: "Almoço",
                },
              ]}
              onDelete={async (id) => {
                setBookings((bs) => bs.filter((b) => b.id !== id));
                toast.success("Excluído somente na demonstração");
              }}
              onStatus={async (id, status) => {
                setBookings((bs) =>
                  bs.map((b) =>
                    b.id === id
                      ? {
                          ...b,
                          status,
                          charged_price: services.find(
                            (s) => s.id === b.service_id,
                          )?.price,
                          price_source: "at_completion",
                        }
                      : b,
                  ),
                );
                toast.success("Situação alterada somente nesta demonstração");
              }}
            />
          ) : (
            <Finance
              bookings={bookings}
              services={services}
              timezone={zone}
              appearance={appearance}
            />
          )}
        </div>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
