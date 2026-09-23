import { toast } from "sonner";
export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Link copiado");
  } catch {
    toast.error(
      "Não foi possível copiar. Selecione o link e copie manualmente.",
    );
  }
}
