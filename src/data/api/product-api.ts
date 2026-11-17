/**
 * Service produk Flowera API — satu-satunya modul yang tahu endpoint dan
 * bentuk response `/api/user/home` + `/api/user/product/*`.
 *
 * Kontrak diambil dari `flowera-api/src/user/home/home.service.ts` dan
 * `flowera-api/src/user/product/product.service.ts`:
 *
 *   GET /user/home
 *       200 { productCategories: [{ id, title }],
 *             product: [{ id, name, slug, price, rating, image,
 *                         store, product_image, ... }],
 *             store: [{ id, name, city, logo, rating, ... }] }
 *   GET /user/product/categories/:id
 *       200 { status: 'success', data: [product] }
 *
 * Response JSON dipetakan ke model UI (`Product`, `Store`,
 * `ProductCategory` di `src/data/home.ts`) di sini, bukan di component.
 */

import type { AxiosInstance } from 'axios';

import { api, resolveAssetUrl } from './client';
import { logApiError, toUserMessage } from './errors';
import {
  PRODUCT_CATEGORIES,
  PRODUCTS,
  STORES,
  type Product,
  type ProductCategory,
  type Store,
} from '@/data/home';

/* ──────────────────────────── Raw response ──────────────────────────── */

interface ApiProductImage {
  id: number;
  image_url: string;
  isDefault: boolean;
}

interface ApiStore {
  id: number;
  name: string;
  city?: string | null;
  logo?: string | null;
  rating?: string | number | null;
}

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  rating?: string | number | null;
  image?: string | null;
  product_image?: ApiProductImage[] | null;
  store?: ApiStore | null;
}

interface ApiHomeResponse {
  productCategories?: ProductCategory[] | null;
  product?: ApiProduct[] | null;
  store?: ApiStore[] | null;
}

interface ApiCategoryProductResponse {
  status: string;
  data: ApiProduct[];
}

/** Data beranda siap render. */
export interface HomeData {
  categories: ProductCategory[];
  products: Product[];
  stores: Store[];
}

/* ──────────────────────────── Mapping ──────────────────────────── */

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Logo store dari backend bisa relatif (`/uploads/...`). */
export function mapStore(store: ApiStore): Store {
  const logo =
    resolveAssetUrl(store.logo) ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(store.name)}&background=8c4a5c&color=fff`;

  return {
    id: store.id,
    name: store.name,
    city: store.city?.trim() || 'Lokasi belum tersedia',
    logo,
  };
}

export function mapProduct(product: ApiProduct): Product {
  const images = product.product_image ?? [];
  const primary = images.find((image) => image.isDefault) ?? images[0] ?? null;
  const imageUrl = resolveAssetUrl(primary?.image_url ?? product.image);

  return {
    id: product.id,
    name: product.name,
    price: toNumber(product.price),
    rating: toNumber(product.rating),
    store: product.store ? mapStore(product.store) : null,
    product_image: imageUrl
      ? [{ image_url: imageUrl, isDefault: true }]
      : [],
  };
}

export function mapHomeResponse(payload: ApiHomeResponse): HomeData {
  return {
    categories: (payload.productCategories ?? []).map((category) => ({
      id: category.id,
      title: category.title,
    })),
    products: (payload.product ?? []).map(mapProduct),
    stores: (payload.store ?? []).map(mapStore),
  };
}

/* ──────────────────────────── Requests ──────────────────────────── */

function fail(scope: string, error: unknown, fallback: string): never {
  logApiError(scope, error);
  throw new Error(toUserMessage(error, fallback));
}

/**
 * `GET /user/home` — kategori, produk, dan florist untuk beranda.
 * Tanpa token: endpoint ini publik di backend.
 */
export async function fetchHomeData(
  signal?: AbortSignal,
  client: AxiosInstance = api,
): Promise<HomeData> {
  try {
    const { data } = await client.get<ApiHomeResponse>('/user/home', {
      signal,
    });
    return mapHomeResponse(data);
  } catch (error) {
    return fail('home', error, 'Gagal memuat data beranda.');
  }
}

/**
 * `GET /user/product/categories/:id` — produk dalam satu kategori.
 * Endpoint ini tidak menyertakan relasi store/gambar; penggabungan data
 * dari produk beranda dilakukan di hook (`useCategoryProducts`).
 */
export async function fetchCategoryProducts(
  categoryId: number,
  signal?: AbortSignal,
  client: AxiosInstance = api,
): Promise<Product[]> {
  try {
    const { data } = await client.get<ApiCategoryProductResponse>(
      `/user/product/categories/${categoryId}`,
      { signal },
    );

    return (data.data ?? []).map((raw) => ({
      ...mapProduct(raw),
      category_id: categoryId,
    }));
  } catch (error) {
    return fail('product:by-category', error, 'Gagal memuat produk kategori.');
  }
}

/* ──────────────────────────── Seed sinkron ──────────────────────────── */

/**
 * Snapshot sinkron yang dipakai sebagai render pertama (tri-state awal) dan
 * fallback saat API tidak dapat dihubungi.
 */
export const SEED_HOME_DATA: HomeData = {
  categories: PRODUCT_CATEGORIES,
  products: PRODUCTS,
  stores: STORES,
};
