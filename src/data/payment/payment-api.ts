/**
 * Service status pembayaran Flowera API.
 *
 * Endpoint: `GET /api/payment/status/:orderNumber` (publik, tanpa guard).
 * Response (`src/payment/payment.service.ts#checkStatus`):
 *   `{ status: 'success', data: { payment_status, order_status, qr_url,
 *      expired_at } }`
 *
 * `qr_url` berasal dari Midtrans (URL gambar QR, bukan path storage kita),
 * jadi TIDAK dilewatkan `resolveAssetUrl`. Status Midtrans terbaru ikut
 * disinkronkan ke ORDER saat endpoint ini dipanggil — berguna untuk tombol
 * "Cek Pembayaran" manual tanpa webhook.
 */

import type { AxiosInstance } from 'axios';

import { api } from '@/data/api/client';
import { logApiError, toUserMessage } from '@/data/api/errors';

export interface PaymentStatus {
  paymentStatus: string;
  orderStatus: string;
  qrUrl: string | null;
  expiredAt: string | null;
}

interface ApiPaymentStatusResponse {
  status: string;
  data: {
    payment_status?: string | null;
    order_status?: string | null;
    qr_url?: string | null;
    expired_at?: string | null;
  } | null;
}

export async function fetchPaymentStatus(
  orderNumber: string,
  signal?: AbortSignal,
  client: AxiosInstance = api,
): Promise<PaymentStatus> {
  try {
    const { data } = await client.get<ApiPaymentStatusResponse>(
      `/payment/status/${encodeURIComponent(orderNumber)}`,
      { signal },
    );

    if (!data.data) throw new Error('Status pembayaran tidak tersedia.');

    return {
      paymentStatus: data.data.payment_status ?? 'PENDING',
      orderStatus: data.data.order_status ?? 'UNPAID',
      qrUrl: data.data.qr_url ?? null,
      expiredAt: data.data.expired_at ?? null,
    };
  } catch (error) {
    logApiError('payment:status', error);
    throw new Error(toUserMessage(error, 'Gagal memeriksa status pembayaran.'));
  }
}
