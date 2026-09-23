"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import { defaultAppearance, type Appearance } from "@/lib/models";
import { foreground } from "@/lib/planning.mjs";
export function useAppearance(companyId?: string) {
  const [record, setRecord] = useState<{
    companyId: string;
    value: Appearance;
    error: string;
    available: boolean;
  } | null>(null);
  useEffect(() => {
    if (!companyId) return;
    let live = true;
    db.from("company_appearance")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        const missing = error && ["42P01", "PGRST205"].includes(error.code);
        setRecord({
          companyId,
          value: { ...defaultAppearance, ...data },
          available: !error,
          error: error
            ? missing
              ? "A personalização será liberada após instalar o SQL adicional 004."
              : "Não foi possível carregar a personalização. Atualize a página para tentar novamente."
            : "",
        });
      });
    return () => {
      live = false;
    };
  }, [companyId]);
  const current = record?.companyId === companyId ? record : null;
  return {
    appearance: current?.value ?? defaultAppearance,
    appearanceError: current?.error ?? "",
    appearanceReady: !!current,
    appearanceAvailable: current?.available ?? false,
    setAppearance: (value: Appearance) => {
      if (companyId)
        setRecord({ companyId, value, error: "", available: true });
    },
  };
}
export function useCompanyTheme(appearance: Appearance) {
  useEffect(() => {
    const root = document.documentElement;
    const color = /^#[0-9a-f]{6}$/i.test(appearance.primary_color)
      ? appearance.primary_color
      : "#0066ff";
    root.dataset.companyTheme = appearance.theme;
    root.classList.toggle("dark", appearance.theme === "dark");
    root.style.setProperty("--brand-color", color);
    root.style.setProperty("--brand-ink", foreground(color));
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute("content") ?? "#0066ff";
    themeMeta?.setAttribute(
      "content",
      appearance.theme === "dark" ? "#101823" : color,
    );
    return () => {
      delete root.dataset.companyTheme;
      root.classList.remove("dark");
      root.style.removeProperty("--brand-color");
      root.style.removeProperty("--brand-ink");
      themeMeta?.setAttribute("content", previousTheme);
    };
  }, [appearance.primary_color, appearance.theme]);
}
