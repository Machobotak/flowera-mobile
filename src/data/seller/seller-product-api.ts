/**
 * Service produk Seller Center.
 *
 * Kontrak dari `flowera-api/src/seller/product/product.controller.ts`,
 * `product-variant/*.controller.ts`, `addon-product/*.controller.ts`, dan
 * `product-categories/*.controller.ts`:
 *   GET    /seller/product                      → { status, data: Product[] }
 *   POST   /seller/product/create               body ProductCreateDto
 *   PUT    /seller/product/update?product=<id>  body ProductUpdateDto
 *   DELETE /seller/product/delete?product=<id>
 *   POST   /seller/product/:id/images           multipart field `files`, body `defaultIndex`
 *   POST   /seller/product/images/default/:img  body { product_id }
 *   GET    /seller/product-categories           → { status, data: Category[] }
 *   GET    /seller/product-categories/sub       → { status, data: SubCategory[] }
 *   POST   /seller/product-variant/create       multipart (title, sub_title, price, product_id, file)
 *   PUT    /seller/product-variant/update/:id   multipart idem
 *   DELETE /seller/product-variant/delete/:id
 *   POST   /seller/addon-product/create         multipart (title, price, product_id, file)
 *   PUT    /seller/addon-product/update/:id     multipart idem
 *   DELETE /seller/addon-product/delete/:id
 *
 * Catatan kontrak backend:
 *   - `GET /seller/product` hanya memuat relasi `product_image`; kategori dan
 *     varian/add-on tidak ikut. Varian & add-on dibaca lewat
 *     `GET /user/product/detail/:id` (publik) karena endpoint seller-nya
 *     menerima id produk di **body GET**, yang tidak bisa dikirim browser.
 *   - `PUT /product/update` hanya menyimpan name/description/price/isLifeFlower
 *     (weight & kategori diabaikan server walau dikirim).
 *   - Upload gambar butuh MinIO; kalau MinIO mati server membalas 500.
 */

import { api, resolveStorageUrl } from '@/data/api/client';
import { postImages, putImages } from '@/data/api/upload';
import { logApiError, toUserMessage } from '@/data/api/errors';
import { fetchProductDetail } from '@/data/product/product-detail-api';

/* ──────────────────────────── Model ──────────────────────────── */

export interface SellerProductImage {
  id: number;
  url: string | null;
  isDefault: boolean;
}

export interface SellerProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  weight: number;
  isLifeFlower: boolean;
  images: SellerProductImage[];
}

export interface SellerProductInput {
  name: string;
  description?: string;
  price: number;
  weight?: number;
  isLifeFlower: boolean;
  /** Hanya wajib saat create; `update` mengabaikan kategori. */
  subCategoryId?: number;
}

export interface ProductCategory {
  id: number;
  title: string;
}

export interface SellerVariant {
  id: number;
  title: string;
  subTitle: string | null;
  price: number;
  image: string | null;
}

export interface SellerAddon {
  id: number;
  title: string;
  price: number;
  image: string | null;
}

export interface SellerVariantInput {
  title: string;
  subTitle: string;
  price: number;
  imageUri?: string | null;
}

export interface SellerAddonInput {
  title: string;
  price: number;
  imageUri?: string | null;
}

/* ──────────────────────────── Raw response ──────────────────────────── */

interface ApiImage {
  id: number;
  image_url?: string | null;
  isDefault?: number | boolean;
}

interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  weight?: number | string | null;
  isLifeFlower?: number | boolean | null;
  product_image?: ApiImage[] | null;
}

interface ApiEnvelope<T> {
  status: string;
  data: T;
}

/* ──────────────────────────── Mapping ──────────────────────────── */

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapProduct(product: ApiProduct): SellerProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description?.trim() ?? '',
    price: toNumber(product.price),
    weight: toNumber(product.weight),
    isLifeFlower: Boolean(product.isLifeFlower),
    images: (product.product_image ?? []).map((image) => ({
      id: image.id,
      url: resolveStorageUrl(image.image_url),
      isDefault: Boolean(image.isDefault),
    })),
  };
}

/* ──────────────────────────── Produk ──────────────────────────── */

export async function fetchSellerProducts(
  signal?: AbortSignal,
): Promise<SellerProduct[]> {
  try {
    const { data } = await api.get<ApiEnvelope<ApiProduct[] | null>>(
      '/seller/product',
      { signal },
    );

    return (data.data ?? []).map(mapProduct);
  } catch (error) {
    logApiError('seller:product:list', error);
    throw new Error(toUserMessage(error, 'Gagal memuat produk.'));
  }
}

/** `POST /seller/product/create` → id produk baru (dipakai untuk upload gambar). */
export async function createSellerProduct(
  input: SellerProductInput,
): Promise<number> {
  try {
    const { data } = await api.post<{ data?: { id?: number } }>(
      '/seller/product/create',
      {
        name: input.name,
        description: input.description,
        price: input.price,
        weight: input.weight,
        isLifeFlower: input.isLifeFlower,
        sub_product_categories_id: input.subCategoryId,
      },
    );

    const id = data.data?.id;
    if (!id) throw new Error('Server tidak mengembalikan ID produk.');
    return id;
  } catch (error) {
    logApiError('seller:product:create', error);
    throw new Error(toUserMessage(error, 'Gagal menyimpan produk.'));
  }
}

export async function updateSellerProduct(
  productId: number,
  input: SellerProductInput,
): Promise<void> {
  try {
    await api.put(`/seller/product/update?product=${productId}`, {
      name: input.name,
      description: input.description,
      price: input.price,
      weight: input.weight,
      isLifeFlower: input.isLifeFlower,
      sub_product_categories_id: input.subCategoryId,
    });
  } catch (error) {
    logApiError('seller:product:update', error);
    throw new Error(toUserMessage(error, 'Gagal menyimpan produk.'));
  }
}

export async function deleteSellerProduct(productId: number): Promise<void> {
  try {
    await api.delete(`/seller/product/delete?product=${productId}`);
  } catch (error) {
    logApiError('seller:product:delete', error);
    throw new Error(toUserMessage(error, 'Gagal menghapus produk.'));
  }
}

/** Upload banyak gambar sekaligus (field `files`, maks 10 per request). */
export async function uploadSellerProductImages(
  productId: number,
  uris: string[],
): Promise<SellerProductImage[]> {
  interface ApiUploadResponse {
    data?: ApiImage[] | { id: number; image_url?: string; isDefault?: boolean }[];
  }

  const data = await postImages<ApiUploadResponse>(
    `/seller/product/${productId}/images`,
    'files',
    uris.map((uri) => ({ uri })),
  );

  return (data.data ?? []).map((image) => ({
    id: image.id,
    url: resolveStorageUrl(image.image_url),
    isDefault: Boolean(image.isDefault),
  }));
}

export async function setSellerProductDefaultImage(
  imageId: number,
  productId: number,
): Promise<void> {
  try {
    await api.post(`/seller/product/images/default/${imageId}`, {
      product_id: productId,
    });
  } catch (error) {
    logApiError('seller:product:default-image', error);
    throw new Error(toUserMessage(error, 'Gagal menjadikan foto utama.'));
  }
}

/* ──────────────────────────── Kategori ──────────────────────────── */

interface ApiCategory {
  id: number;
  title?: string | null;
  name?: string | null;
}

function mapCategory(category: ApiCategory): ProductCategory {
  return {
    id: category.id,
    title: category.title?.trim() || category.name?.trim() || `Kategori ${category.id}`,
  };
}

export async function fetchSubCategories(
  signal?: AbortSignal,
): Promise<ProductCategory[]> {
  try {
    const { data } = await api.get<ApiEnvelope<ApiCategory[] | null>>(
      '/seller/product-categories/sub',
      { signal },
    );

    return (data.data ?? []).map(mapCategory);
  } catch (error) {
    logApiError('seller:category:sub', error);
    throw new Error(toUserMessage(error, 'Gagal memuat kategori produk.'));
  }
}

/* ──────────────────────────── Varian & add-on ──────────────────────────── */

/**
 * Varian + add-on yang sudah tersimpan untuk satu produk.
 * Memakai endpoint publik detail produk karena `GET /seller/product-variant`
 * dan `GET /seller/addon-product` membaca `product` dari **body GET** (tidak
 * bisa dikirim browser/XHR; Node fetch bahkan menolaknya).
 */
export async function fetchProductVariantAddon(
  productId: number,
  signal?: AbortSignal,
): Promise<{ variants: SellerVariant[]; addons: SellerAddon[] }> {
  const detail = await fetchProductDetail(productId, signal);
  return { variants: detail.variants, addons: detail.addons };
}

export async function createSellerVariant(
  productId: number,
  input: SellerVariantInput,
): Promise<void> {
  await postImages(
    '/seller/product-variant/create',
    'variants',
    input.imageUri ? [{ uri: input.imageUri }] : [],
    {
      title: input.title,
      sub_title: input.subTitle,
      price: input.price,
      product_id: productId,
    },
  );
}

export async function updateSellerVariant(
  variantId: number,
  productId: number,
  input: SellerVariantInput,
): Promise<void> {
  await putImages(
    `/seller/product-variant/update/${variantId}`,
    'variants',
    input.imageUri ? [{ uri: input.imageUri }] : [],
    {
      title: input.title,
      sub_title: input.subTitle,
      price: input.price,
      product_id: productId,
    },
  );
}

export async function deleteSellerVariant(variantId: number): Promise<void> {
  try {
    await api.delete(`/seller/product-variant/delete/${variantId}`);
  } catch (error) {
    logApiError('seller:variant:delete', error);
    throw new Error(toUserMessage(error, 'Gagal menghapus varian.'));
  }
}

export async function createSellerAddon(
  productId: number,
  input: SellerAddonInput,
): Promise<void> {
  await postImages(
    '/seller/addon-product/create',
    'addon',
    input.imageUri ? [{ uri: input.imageUri }] : [],
    { title: input.title, price: input.price, product_id: productId },
  );
}

export async function updateSellerAddon(
  addonId: number,
  productId: number,
  input: SellerAddonInput,
): Promise<void> {
  await putImages(
    `/seller/addon-product/update/${addonId}`,
    'addon',
    input.imageUri ? [{ uri: input.imageUri }] : [],
    { title: input.title, price: input.price, product_id: productId },
  );
}

export async function deleteSellerAddon(addonId: number): Promise<void> {
  try {
    await api.delete(`/seller/addon-product/delete/${addonId}`);
  } catch (error) {
    logApiError('seller:addon:delete', error);
    throw new Error(toUserMessage(error, 'Gagal menghapus add-on.'));
  }
}
