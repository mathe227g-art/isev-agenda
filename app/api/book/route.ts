import { handlePublicBooking } from '@/lib/public-booking.mjs';
import { checkBotId } from 'botid/server';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return Response.json(
      { error: 'Não foi possível validar este acesso. Recarregue a página e tente novamente.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return handlePublicBooking(request, process.env);
}
