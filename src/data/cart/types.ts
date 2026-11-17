/**
 * Model keranjang Flowera — sisi klien.
 *
 * Backend `flowera-api` punya entity `Cart` tetapi **tidak ada controller**
 * untuknya (sama seperti web, yang mengarahkan `/cart` ke halaman
 * "coming soon"). Jadi isi keranjang hidup di memori aplikasi saja dan
 * dikonversi ke payload `POST /api/user/order/checkout` saat checkout.
 */

export interface CartAddon {
  id: number;
  title: string;
  price: number;
  image: string | null;
}

export interface CartItem {
  /** Kunci unik baris: produk + varian + kombinasi addon. */
  key: string;
  productId: number;
  variantId: number | null;
  productName: string;
  variantTitle: string | null;
  storeId: number;
  storeName: string;
  /** Harga produk/varian saja (addon dihitung terpisah). */
  unitPrice: number;
  addons: CartAddon[];
  quantity: number;
  /** Berat satuan dalam gram; backend memakai `product.weight ?? 1000`. */
  weightGram: number;
  image: string | null;
}

export function cartLineTotal(item: CartItem): number {
  const addonsTotal = item.addons.reduce((sum, addon) => sum + addon.price, 0);
  return (item.unitPrice + addonsTotal) * item.quantity;
}

export function cartAddonsTotal(item: CartItem): number {
  return item.addons.reduce((sum, addon) => sum + addon.price, 0);
}
