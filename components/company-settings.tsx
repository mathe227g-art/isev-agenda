"use client";
import { useState } from "react";
import { InstallApp } from "./install-app";
import { Moon, Sun, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyIdentity } from "./company-identity";
import { saveBrandSettings, type BrandSettings } from "@/lib/appearance";
import { foreground } from "@/lib/planning.mjs";
import { type Appearance, type Company } from "@/lib/models";
import { toast } from "sonner";
export function CompanySettings({
  company,
  appearance,
  onSaved,
  available,
  persist = saveBrandSettings,
}: {
  company: Company;
  appearance: Appearance;
  onSaved: (a: Appearance) => void;
  available: boolean;
  persist?: (companyId: string, settings: BrandSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(appearance),
    [busy, setBusy] = useState(false),
    [reading, setReading] = useState(false),
    [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Escolha uma imagem PNG, JPG ou WebP de até 2 MB.");
      return;
    }
    setReading(true);
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 4096 || bitmap.height > 4096) {
        bitmap.close();
        throw new Error(
          "Use uma imagem com até 4096 pixels de largura e altura.",
        );
      }
      bitmap.close();
      const result = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("Não foi possível ler a imagem."));
        reader.readAsDataURL(file);
      });
      setDraft((d) => ({ ...d, logo_data_url: result }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Imagem inválida.");
    } finally {
      setReading(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || reading || !available) return;
    setBusy(true);
    setError("");
    try {
      await persist(company.id, {
        primary_color: draft.primary_color,
        theme: draft.theme,
        logo_data_url: draft.logo_data_url,
      });
      onSaved({
        ...appearance,
        primary_color: draft.primary_color,
        theme: draft.theme,
        logo_data_url: draft.logo_data_url,
      });
      toast.success("Identidade da empresa atualizada");
    } catch {
      setError(
        "Não foi possível salvar a personalização. Confira sua conexão e se o SQL adicional 004 foi instalado.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-grid">
      <form className="panel settings-form" onSubmit={save}>
        <h2>Deixe a agenda com a sua identidade</h2>
        <p className="muted">
          Sua logo, suas cores, seu jeito. As escolhas também aparecem na página
          pública.
        </p>
        <fieldset disabled={busy || reading || !available}>
          <legend>Logo da empresa</legend>
          <CompanyIdentity name={company.name} logo={draft.logo_data_url} />
          <label className="upload-label">
            <Upload size={17} />{" "}
            {reading ? "Lendo imagem..." : "Escolher imagem"}
            <input
              aria-label="Logo da empresa"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <small>
            PNG, JPG ou WebP · até 2 MB. Prefira uma imagem quadrada.
          </small>
          {draft.logo_data_url && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft((d) => ({ ...d, logo_data_url: null }))}
            >
              Remover logo
            </Button>
          )}
        </fieldset>
        <fieldset disabled={busy || !available}>
          <legend>Cor principal</legend>
          <div className="color-field">
            <input
              type="color"
              aria-label="Cor principal do layout"
              value={draft.primary_color}
              onChange={(e) =>
                setDraft((d) => ({ ...d, primary_color: e.target.value }))
              }
            />
            <Input
              aria-label="Código hexadecimal da cor"
              value={draft.primary_color}
              pattern="#[0-9a-fA-F]{6}"
              maxLength={7}
              required
              onChange={(e) =>
                setDraft((d) => ({ ...d, primary_color: e.target.value }))
              }
            />
          </div>
          <small>
            Escolha qualquer cor. O contraste dos botões é ajustado
            automaticamente.
          </small>
        </fieldset>
        <fieldset disabled={busy || !available}>
          <legend>Aparência</legend>
          <div className="theme-options">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={draft.theme === mode}
                className={draft.theme === mode ? "active" : ""}
                onClick={() => setDraft((d) => ({ ...d, theme: mode }))}
              >
                {mode === "light" ? <Sun size={20} /> : <Moon size={20} />}{" "}
                {mode === "light" ? "Modo claro" : "Modo escuro"}
                {draft.theme === mode && <Check size={15} />}
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="form-message">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || reading || !available}>
          {busy ? "Salvando..." : "Salvar personalização"}
        </Button>
      </form>
      <aside>
        <div className="panel install-settings">
          <h2>Sua agenda no celular</h2>
          <p>Adicione à tela inicial e acesse pelo ícone, com o login salvo.</p>
          <InstallApp />
        </div>
        <div className={`appearance-preview preview-${draft.theme}`}>
          <span className="eyebrow">PRÉVIA DA SUA EMPRESA</span>
          <CompanyIdentity
            name={company.name}
            logo={draft.logo_data_url}
            large
          />
          <div className="preview-appointment">
            <span style={{ background: draft.primary_color }} />
            <div>
              <strong>Seu próximo atendimento</strong>
              <p>Sua marca em cada detalhe.</p>
            </div>
          </div>
          <button
            type="button"
            tabIndex={-1}
            style={{
              background: draft.primary_color,
              color: /^#[0-9a-f]{6}$/i.test(draft.primary_color)
                ? foreground(draft.primary_color)
                : "#fff",
            }}
          >
            Agendar horário
          </button>
        </div>
        <div className="panel settings-details">
          <h2>Dados da empresa</h2>
          <dl>
            <dt>Nome</dt>
            <dd>{company.name}</dd>
            <dt>Link público</dt>
            <dd>/agendar/{company.slug}</dd>
            <dt>Fuso horário</dt>
            <dd>{company.timezone}</dd>
          </dl>
        </div>
      </aside>
    </div>
  );
}
