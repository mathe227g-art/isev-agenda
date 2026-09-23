"use client";
import { useState } from "react";
import { db } from "@/lib/supabase";
import { entityColor } from "@/lib/planning.mjs";
import type { Appearance } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function EntityColors({
  items,
  kind,
  companyId,
  appearance,
  onSaved,
  available,
}: {
  items: { id: string; name: string }[];
  kind: "professional" | "service";
  companyId: string;
  appearance: Appearance;
  onSaved: (a: Appearance) => void;
  available: boolean;
}) {
  const field =
    kind === "professional" ? "professional_colors" : "service_colors";
  const [draft, setDraft] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    let updated = { ...appearance[field] };
    const remaining = { ...draft };
    try {
      for (const [id, color] of Object.entries(draft)) {
        const { error } = await db.rpc("set_agenda_color", {
          p_company: companyId,
          p_kind: kind,
          p_entity: id,
          p_color: color,
        });
        if (error) throw error;
        updated = { ...updated, [id]: color };
        delete remaining[id];
      }
      toast.success("Cores atualizadas");
    } catch {
      toast.error("Não foi possível salvar todas as cores. Tente novamente.");
    } finally {
      onSaved({ ...appearance, [field]: updated });
      setDraft(remaining);
      setBusy(false);
    }
  }
  return (
    <section className="panel color-directory">
      <div className="panel-heading">
        <div>
          <h2>
            Cores{" "}
            {kind === "professional" ? "dos profissionais" : "dos serviços"}
          </h2>
          <p>
            {kind === "service"
              ? "As mesmas cores aparecem na agenda e no financeiro."
              : "Identifique cada profissional na agenda."}
          </p>
        </div>
        <Button
          onClick={save}
          disabled={!available || busy || !Object.keys(draft).length}
        >
          {busy ? "Salvando..." : "Salvar cores"}
        </Button>
      </div>
      <div className="color-entities">
        {items.length ? (
          items.map((item) => (
            <label key={item.id}>
              <input
                type="color"
                disabled={!available || busy}
                aria-label={`Cor de ${item.name}`}
                value={
                  draft[item.id] ?? entityColor(item.id, appearance[field])
                }
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [item.id]: e.target.value }))
                }
              />
              <span>{item.name}</span>
            </label>
          ))
        ) : (
          <p className="muted">
            Cadastre{" "}
            {kind === "professional" ? "um profissional" : "um serviço"} para
            escolher sua cor.
          </p>
        )}
      </div>
    </section>
  );
}
