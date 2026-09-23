import { handlePublicBooking } from '@/lib/public-booking.mjs';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  return handlePublicBooking(request, process.env);
}
