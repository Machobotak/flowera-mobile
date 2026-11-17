/**
 * Hitung mundur pembayaran QRIS. `expiredAt` berasal dari `payment.expired_at`
 * (`POST /user/order/checkout`) atau `expired_at` dari
 * `GET /payment/status/:orderNumber`.
 *
 * Tick hanya berjalan selama `expiredAt` terisi; nilai kembali `null` berarti
 * waktu habis/format tidak valid.
 */

import { useEffect, useState } from 'react';

import { formatCountdown } from '@/utils/format';

export function useCountdown(expiredAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiredAt) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiredAt]);

  return expiredAt ? formatCountdown(expiredAt, now) : null;
}
