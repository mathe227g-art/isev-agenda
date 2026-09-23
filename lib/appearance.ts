import { db } from "./supabase";
import type { Appearance } from "./models";
export type BrandSettings = Pick<
  Appearance,
  "primary_color" | "theme" | "logo_data_url"
>;
export async function saveBrandSettings(
  companyId: string,
  settings: BrandSettings,
) {
  const { error } = await db
    .from("company_appearance")
    .upsert(
      { company_id: companyId, ...settings },
      { onConflict: "company_id" },
    );
  if (error) throw error;
}
