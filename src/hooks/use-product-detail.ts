/**
 * Hook detail produk — pola sama dengan `useHomeData`: status loading
 * diturunkan dari pasangan (id produk, token reload) yang sudah selesai
 * dimuat, bukan `setState` di dalam effect. Request dibatalkan lewat
 * AbortController saat layar unmount atau id berubah.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  fetchProductDetail,
  type ProductDetail,
} from '@/data/product/product-detail-api';

interface DetailState {
  productId: number | null;
  reloadToken: number;
  data: ProductDetail | null;
  error: string | null;
}

const EMPTY_STATE: DetailState = {
  productId: null,
  reloadToken: 0,
  data: null,
  error: null,
};

export interface ProductDetailResult {
  product: ProductDetail | null;
  isLoading: boolean;
  error: string | null;
  retry(): void;
}

export function useProductDetail(productId: number | null): ProductDetailResult {
  const [state, setState] = useState<DetailState>(EMPTY_STATE);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (productId === null) return;

    const controller = new AbortController();
    let active = true;

    fetchProductDetail(productId, controller.signal)
      .then((product) => {
        if (!active) return;
        setState({ productId, reloadToken, data: product, error: null });
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({
          productId,
          reloadToken,
          data: null,
          error:
            cause instanceof Error
              ? cause.message
              : 'Gagal memuat detail produk.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [productId, reloadToken]);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const isCurrent =
    productId !== null &&
    state.productId === productId &&
    state.reloadToken === reloadToken;

  return {
    product: isCurrent ? state.data : null,
    isLoading: productId !== null && !isCurrent,
    error: isCurrent ? state.error : null,
    retry,
  };
}
