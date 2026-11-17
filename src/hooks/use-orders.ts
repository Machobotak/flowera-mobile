/**
 * Hook daftar pesanan pembeli.
 *
 * Memuat ulang setiap kali tab Pesanan difokuskan (mis. setelah checkout),
 * dan menyediakan `refresh()` untuk pull-to-refresh / aksi konfirmasi.
 * Sama seperti hook lain: loading dihitung dari token request yang selesai,
 * bukan `setState` di dalam effect. Saat refresh gagal, daftar lama tetap
 * ditampilkan supaya layar tidak kosong.
 */

import { useCallback, useEffect, useState } from 'react';

import { fetchOrders, type OrderModel } from '@/data/order/order-api';

interface OrdersState {
  reloadToken: number;
  orders: OrderModel[];
  error: string | null;
}

export interface OrdersResult {
  orders: OrderModel[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh(): void;
}

export function useOrders(): OrdersResult {
  const [state, setState] = useState<OrdersState>({
    reloadToken: -1,
    orders: [],
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchOrders(controller.signal)
      .then((orders) => {
        if (!active) return;
        setState({ reloadToken, orders, error: null });
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState((previous) => ({
          reloadToken,
          orders: previous.orders,
          error:
            cause instanceof Error
              ? cause.message
              : 'Gagal memuat daftar pesanan.',
        }));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    orders: state.orders,
    isLoading: state.reloadToken !== reloadToken,
    isRefreshing: state.reloadToken !== -1 && state.reloadToken !== reloadToken,
    error: state.reloadToken === reloadToken ? state.error : null,
    refresh,
  };
}
