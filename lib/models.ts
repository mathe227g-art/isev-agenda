export type Company = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};
export type Person = { id: string; name: string; active: boolean };
export type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  active: boolean;
};
export type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_id: string;
  professional_id: string;
  service_id: string;
  customers: { name: string } | null;
  professionals: { name: string } | null;
  services: { name: string } | null;
  charged_price?: number | null;
  price_source?: "at_completion" | "historical_estimate" | "unpriced" | null;
};
export type Appearance = {
  primary_color: string;
  theme: "light" | "dark";
  logo_data_url: string | null;
  professional_colors: Record<string, string>;
  service_colors: Record<string, string>;
};
export const defaultAppearance: Appearance = {
  primary_color: "#0066ff",
  theme: "light",
  logo_data_url: null,
  professional_colors: {},
  service_colors: {},
};
