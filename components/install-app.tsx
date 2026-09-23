"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type InstallState = {
  installed: boolean;
  prompt: InstallPrompt | null;
  consume: () => void;
};
const InstallContext = createContext<InstallState>({
  installed: false,
  prompt: null,
  consume: () => {},
});
function standalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  );
}
function watchStandalone(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installedNow, setInstalledNow] = useState(false);
  const installed =
    useSyncExternalStore(watchStandalone, standalone, () => false) ||
    installedNow;
  useEffect(() => {
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const complete = () => {
      setPrompt(null);
      setInstalledNow(true);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    // Development stays outside SW control to avoid interference with hot reload.
    if (
      process.env.NODE_ENV === "production" &&
      window.isSecureContext &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          console.warn(
            "Instalação: não foi possível preparar o modo sem conexão.",
          );
        });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  return (
    <InstallContext.Provider
      value={{ installed, prompt, consume: () => setPrompt(null) }}
    >
      {children}
    </InstallContext.Provider>
  );
}
export function InstallApp({ compact = false }: { compact?: boolean }) {
  const { installed, prompt, consume } = useContext(InstallContext);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  if (installed) return null;
  async function install() {
    if (!prompt) {
      setOpen(true);
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setOpen(true);
    } finally {
      consume();
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        className={compact ? "install-button compact" : "install-button"}
        variant="outline"
        disabled={busy}
        onClick={install}
      >
        <Download size={16} />
        {busy ? "Abrindo..." : "Instalar aplicativo"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Smartphone className="inline-icon" size={21} /> Leve sua agenda
              com você
            </DialogTitle>
            <DialogDescription>
              O mesmo sistema, com um ícone na tela inicial do seu celular.
            </DialogDescription>
          </DialogHeader>
          <div className="install-instructions">
            <section>
              <h3>No Android</h3>
              <p>
                Abra o site no Chrome. No menu <strong>⋮</strong>, escolha{" "}
                <strong>Instalar aplicativo</strong> ou{" "}
                <strong>Adicionar à tela inicial</strong> e confirme.
              </p>
            </section>
            <section>
              <h3>No iPhone</h3>
              <p>
                Abra o site no Safari. Toque em <strong>Compartilhar</strong> e
                depois em <strong>Adicionar à Tela de Início</strong>. Se
                aparecer a opção, mantenha <strong>Abrir como App</strong>{" "}
                ativada.
              </p>
            </section>
            <p>
              Ao abrir pelo ícone, entre na sua conta se for solicitado. Depois,
              o login permanece salvo neste aplicativo enquanto a sessão for
              válida.
            </p>
            <small>
              A instalação depende do navegador e de um endereço publicado com
              HTTPS. A agenda precisa de internet para consultar e salvar
              atendimentos.
            </small>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
