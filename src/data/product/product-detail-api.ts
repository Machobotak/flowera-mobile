/**
 * Service detail produk Flowera API — publik, tanpa token.
 *
 * Endpoint: `GET /api/user/product/detail/:productid`
 * Response backend (`src/user/product/product.service.ts`):
 *   `{ status: 'success', data: { product, product_variant, addon_product, store } }`
 *   - `product.product_image` hanya berisi gambar produk utama (bukan gambar
 *     varian/addon) dan relasi `store`
 *   - `product_variant[]` & `addon_product[]` masing-masing membawa
 *     `product_image` sendiri, urut `id ASC`
 *
 * Semua path gambar backend masih relatif (`/uploads/...`), jadi dipetakan ke
 * URL absolut lewat `resolveAssetUrl` sebelum dipakai komponen.
 */

import type { AxiosInstance } from 'axios';

import { api, resolveAssetUrl } from '@/data/api/client';
import { logApiError, toUserMessage } from '@/data/api/errors';

/* ──────────────────────────── Model UI ──────────────────────────── */

export interface ProductDetailImage {
  id: number;
  url: string;
}

export interface ProductDetailVariant {
  id: number;
  title: string;
  subTitle: string | null;
  price: number;
  image: string | null;
}

export interface ProductDetailAddon {
  id: number;
  title: string;
  price: number;
  image: string | null;
}

export interface ProductDetailStore {
  id: number;
  name: string;
  city: string | null;
  logo: string | null;
  description: string | null;
}

export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  rating: number;
  weight: number;
  isLifeFlower: boolean;
  images: ProductDetailImage[];
  store: ProductDetailStore | null;
  variants: ProductDetailVariant[];
  addons: ProductDetailAddon[];
}

/* ──────────────────────────── Raw response ──────────────────────────── */

interface ApiImage {
  id: number;
  image_url: string;
  isDefault?: number | boolean;
}

interface ApiVariant {
  id: number;
  title: string;
  subTitle?: string | null;
  price: number;
  product_image?: ApiImage[] | null;
}

interface ApiAddon {
  id: number;
  title?: string | null;
  price: number;
  product_image?: ApiImage[] | null;
}

interface ApiStore {
  id: number;
  name: string;
  logo?: string | null;
  city?: string | null;
  description?: string | null;
}

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  rating?: string | number | null;
  weight?: number | null;
  isLifeFlower?: number | boolean | null;
  product_image?: ApiImage[] | null;
  store?: ApiStore | null;
}

interface ApiDetailResponse {
  status: string;
  data: {
    product?: ApiProduct | null;
    product_variant?: ApiVariant[] | null;
    addon_product?: ApiAddon[] | null;
    store?: ApiStore | null;
  } | null;
}

/* ──────────────────────────── Mapping ──────────────────────────── */

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function primaryImage(images?: ApiImage[] | null): string | null {
  if (!images || images.length === 0) return null;
  const primary = images.find((image) => Boolean(image.isDefault)) ?? images[0];
  return resolveAssetUrl(primary?.image_url);
}

function mapStore(store?: ApiStore | null): ProductDetailStore | null {
  if (!store) return null;

  return {
    id: store.id,
    name: store.name,
    city: store.city?.trim() || null,
    logo: resolveAssetUrl(store.logo),
    description: store.description?.trim() || null,
  };
}

/* ──────────────────────────── Request ──────────────────────────── */

export async function fetchProductDetail(
  productId: number,
  signal?: AbortSignal,
  client: AxiosInstance = api,
): Promise<ProductDetail> {
  try {
    const { data } = await client.get<ApiDetailResponse>(
      `/user/product/detail/${productId}`,
      { signal },
    );

    const raw = data.data;
    const product = raw?.product;

    if (!product) {
      throw new Error('Produk tidak ditemukan.');
    }

    const images = (product.product_image ?? [])
      .map((image) => ({
        id: image.id,
        url: resolveAssetUrl(image.image_url),
      }))
      .filter((image): image is ProductDetailImage => Boolean(image.url));

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description?.trim() || null,
      price: toNumber(product.price),
      rating: toNumber(product.rating),
      weight: toNumber(product.weight) || 0,
      isLifeFlower: Boolean(product.isLifeFlower),
      images,
      store: mapStore(product.store ?? raw.store),
      variants: (raw.product_variant ?? []).map((variant) => ({
        id: variant.id,
        title: variant.title,
        subTitle: variant.subTitle?.trim() || null,
        price: toNumber(variant.price),
        image: primaryImage(variant.product_image),
      })),
      addons: (raw.addon_product ?? []).map((addon) => ({
        id: addon.id,
        title: addon.title?.trim() || 'Add-on',
        price: toNumber(addon.price),
        image: primaryImage(addon.product_image),
      })),
    };
  } catch (error) {
    logApiError('product:detail', error);
    throw new Error(toUserMessage(error, 'Gagal memuat detail produk.'));
  }
}
