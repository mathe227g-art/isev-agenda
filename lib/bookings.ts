import { db } from "./supabase";

export async function fetchBookings(companyId: string) {
  const pageSize = 500;
  const query = (offset: number) =>
    db
      .from("bookings")
      .select(
        "*,customers(name),professionals(name),services(name)",
      )
      .eq("company_id", companyId)
      .order("starts_at", { ascending: false })
      .order("id")
      .range(offset, offset + pageSize - 1);
  const first = await query(0);
  if (first.error || !first.data) return first;
  const data = [...first.data];
  let count = first.data.length;
  while (count === pageSize) {
    const next = await query(data.length);
    if (next.error || !next.data) return next;
    data.push(...next.data);
    count = next.data.length;
  }
  return { ...first, data };
}
