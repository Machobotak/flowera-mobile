/**
 * Hook beranda Flowera — menjalankan dua metode sekaligus:
 *
 * 1. SINKRON: seed lokal (`SEED_HOME_DATA`) dirender pada frame pertama tanpa
 *    menunggu jaringan, dan filter kategori tetap dihitung langsung di memori.
 * 2. ASINKRON: `GET /user/home` dan `GET /user/product/categories/:id`
 *    dijalankan lewat `async/await` + AbortController. Hasil API menggantikan
 *    seed saat sukses; saat gagal, seed tetap tampil dan error dilaporkan
 *    sebagai banner (aplikasi tidak kosong/crash).
 *
 * Status loading tidak di-set di dalam effect (menghindari cascading render):
 * cukup simpan token request yang sudah selesai, lalu hitung turunannya.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  SEED_HOME_DATA,
  fetchCategoryProducts,
  fetchHomeData,
  type HomeData,
} from '@/data/api/product-api';
import type { Product } from '@/data/home';

export interface HomeDataResult {
  data: HomeData;
  /** True selama request API pertama berjalan (seed tetap tampil). */
  isLoading: boolean;
  /** True saat pull-to-refresh berjalan. */
  isRefreshing: boolean;
  error: string | null;
  refresh(): void;
}

export function useHomeData(): HomeDataResult {
  const [data, setData] = useState<HomeData>(SEED_HOME_DATA);
  const [settledToken, setSettledToken] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const token = reloadToken;
    const controller = new AbortController();
    let active = true;

    fetchHomeData(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : 'Gagal memuat data beranda. Periksa koneksi ke server.',
        );
      })
      .finally(() => {
        if (active) setSettledToken(token);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const refresh = useCallback(() => {
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  return {
    data,
    isLoading: settledToken === null,
    isRefreshing: settledToken !== null && settledToken !== reloadToken,
    error,
    refresh,
  };
}

export interface CategoryProductsResult {
  /** Hasil API; `null` selama belum ada respons untuk kategori aktif. */
  products: Product[] | null;
  isLoading: boolean;
  error: string | null;
  retry(): void;
}

interface CategoryResolution {
  categoryId: number;
  products: Product[];
  message: string | null;
}

/**
 * Produk per kategori. Komponen tetap bisa menampilkan hasil filter sinkron
 * dari produk yang sudah dimuat sementara request kategori berjalan.
 */
export function useCategoryProducts(
  categoryId: number | null,
  knownProducts: Product[],
): CategoryProductsResult {
  const [resolution, setResolution] = useState<CategoryResolution | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const knownById = useMemo(
    () => new Map(knownProducts.map((product) => [product.id, product])),
    [knownProducts],
  );

  useEffect(() => {
    if (categoryId === null) return;

    const controller = new AbortController();
    let active = true;

    fetchCategoryProducts(categoryId, controller.signal)
      .then((products) => {
        if (!active) return;

        // Endpoint kategori tidak mengirim store/gambar; lengkapi dari
        // produk beranda yang sudah dimuat.
        const merged = products.map((product) => {
          const known = knownById.get(product.id);
          if (!known) return product;

          return {
            ...product,
            product_image:
              product.product_image.length > 0
                ? product.product_image
                : known.product_image,
            store: product.store ?? known.store,
            sold: product.sold ?? known.sold,
          };
        });

        setResolution({ categoryId, products: merged, message: null });
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setResolution({
          categoryId,
          products: [],
          message:
            cause instanceof Error
              ? cause.message
              : 'Gagal memuat produk kategori. Coba lagi.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [categoryId, knownById, reloadToken]);

  const retry = useCallback(() => {
    setResolution(null);
    setReloadToken((token) => token + 1);
  }, []);

  const current = resolution?.categoryId === categoryId ? resolution : null;

  return {
    products: current?.message ? null : (current?.products ?? null),
    isLoading: categoryId !== null && current === null,
    error: current?.message ?? null,
    retry,
  };
}
