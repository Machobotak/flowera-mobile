/**
 * Data statis beranda Flowera — pengganti response API `GET /api/user/home`
 * di web base. Bentuk object-nya sengaja dibuat sama dengan response backend
 * (productCategories, product, store) supaya nanti gampang ditukar ke API asli.
 *
 * Semua URL gambar di sini sudah dites bisa diakses (HTTP 200).
 */

/* ──────────────────────────── Types ──────────────────────────── */

export interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  desc: string;
}

export interface ProductCategory {
  id: number;
  title: string;
}

export interface ProductImage {
  image_url: string;
  isDefault: boolean;
}

export interface Store {
  id: number;
  name: string;
  city: string;
  logo: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  rating: number;
  sold: number;
  /** Kategori dipakai untuk filter lokal (di web filter dilakukan lewat API). */
  category_id: number;
  store: Store;
  product_image: ProductImage[];
}

/* ──────────────────────────── Hero ──────────────────────────── */

/** 3 slide ini sama persis dengan HERO_SLIDES di app/(buyer)/page.tsx web. */
export const HERO_SLIDES: HeroSlide[] = [
  {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCHU-MNzSwSUbbUPvKZvCkAJnjjr1Q74pczA_BThQ1vmUXiAhigqFmfVM6UJBm6PKYLM6lwwR3NMrcTTLt9dYI6OdgW0NKTbW4t9TA8qu-ZUJaBia7VZ6ym3L57bQlqRQnEc0s2CL8xzuJjMzuFph9CXFRr3tv-TDqJl2Ju2inAm_6q0EVgsVwlto2C5UtHP0eocusr5WBn4VLNDYxwoz6p-itwOP7TBGSVeE-XuAy14jdF2ULjhxN4qEUGFGCz-m7liS_ZWUqg-1Y',
    title: 'Seasonal Bloom',
    subtitle: 'Collection',
    desc: 'Experience the elegance of hand-picked peonies delivered fresh to your doorstep.',
  },
  {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB2gUwgvHVeY6k-Mj9af0voVS5A7taBgEpmlkFTl1zVrhEOYtXz_p2qiRwDkkPYfepg8PZFoARMelNrheS_Sfbk7gimiQT8hYb7mvqWroNJsZWJfRXzN70p5V1vSnIljQcRwcPvUMZoxPB4KpASwBXWz6Z2zi_jo4jghhbkeD6Wq56PRXeXB3QyWkn8VdlTpjSKyJzdX3UfhpWT_yr54S666YNUHSjPPHFKHehPl0B0oX3KWA-UD3jX489q-4DErQXTgD4RjbM-wB0',
    title: 'Midnight Grace',
    subtitle: 'Premium',
    desc: 'A luxurious arrangement of deep purple calla lilies and dark burgundy roses.',
  },
  {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuALi3jtLys9GQK4zuPNTLeK5fH-p66mY-cHWAwD4bB86HAtWgVdzDsyjW0ILgI6Rl7fwyDwrXxOE5IkIo6NArfueTT8wzW5iZnUQYKUNqibjc3HH3X4mmsTmQLolHRVY_SVDTN6wSCyWscb_Akr9nuBg6CWJA1nqSAU0a7-WgNmmWMgJxd_LVZBsV2OEM1uB_ZHItrtYyIHzZ9eZBHmYaDUsC9Ml09B3EDEjzl0zNHW1jrY2nyPKjI-ByOqzX1zcjT5BLmQ86srKGs',
    title: 'Golden Hour',
    subtitle: 'Vibrant',
    desc: "Brighten someone's day with sunflowers and blue delphiniums.",
  },
];

/* ──────────────────────────── Stores ──────────────────────────── */

/** Fallback sama seperti web: avatar inisial dari ui-avatars. */
const avatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8c4a5c&color=fff`;

export const STORES: Store[] = [
  { id: 1, name: 'Bloom & Petal', city: 'Jakarta Selatan', logo: avatar('Bloom & Petal') },
  { id: 2, name: 'Rumah Bunga Asri', city: 'Bandung', logo: avatar('Rumah Bunga Asri') },
  { id: 3, name: 'Florist Ayu', city: 'Surabaya', logo: avatar('Florist Ayu') },
  { id: 4, name: 'Puspa Indah', city: 'Yogyakarta', logo: avatar('Puspa Indah') },
];

/* ──────────────────────────── Categories ──────────────────────────── */

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 1, title: 'Anniversary' },
  { id: 2, title: 'Birthday' },
  { id: 3, title: 'Wedding' },
  { id: 4, title: 'Sympathy' },
  { id: 5, title: 'Graduation' },
];

/* ──────────────────────────── Gambar produk ──────────────────────────── */
/* 4 gambar di bawah berasal dari project web (data/product.ts),           */
/* 4 sisanya foto Unsplash yang sudah dipakai di App.js versi sebelumnya.  */

const IMG = {
  roses:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAlxCGYf0kCA8GjMVjj3gy_tGqHvH3I5EgAqChbNHadQ5KfYii5hu1G636-M8SfpfmUxOnCy2dBHW4Sz5kWXjdTVHJ18dt5nIhhhf1fx7IQ2NqJcPEl-yyt3hTG6Kf0NUsJqNSOBrzgkUj6-nDBlaaNh0rwaQ-IeYxHXksU4_6unWJ_x34tXJIS2yCPvdEYGdS87TH7SLjNKXHJ5nA5pK9owKibCGZu5V7MBiF26Sg188Lw5AwuWYjb8fjfq3r6ky7505N_8yhkv8M',
  tulips:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDWjPJUIvA_CiWBA_DPTi_zwPbeE7INrhYaCdH7shUD5MgdLN6pFxP4AmjA-LQYBfgrhizB1Y3Lj4tZB3ETUG5B8Nc8IdQiG3kAJa0upreULqo8JWeb2ElL7jH8fk1rdzFuIoRigRmGgj2MGGWpmjBGPKPKZHHi9q72gBRvaaDX7_A5DDhIzYw5VVvQFbVezYwHKcG6dRYMNXt34eIsZ9UX2A5N4FcP6hjc9rDBVSpHjnMAY5iHGWRpQNo6-SnkJRdPzDlJKw-p8PI',
  roseBox:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAkIHGciqgT8B8rAAtLvesGrjOcRy-mPYHlf2dfxeuPXTgFF6wVWNdHd-jxYB9xSvKdio0Owp8Ld0dJEdDQA3G6H7qiRXQ-HZK8wu55uLMkG2dhM_mociLi3AmQmnJs_eI9tjdHVxwnVZL_YKqvFuaw7JyN5SVLPo6B5Ps2lzeVY3hx5sIIOEs3skN85JSl424qV0LkUev-dt_sGMiTLniqELzkcD6hS9099tQpVY5VTUcm_t-9hIL-Rk5M69cbVpzkrsvE6spzsrc',
  teddy:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBr9zzj83gRXyywUHo4tqJd97rGHfjNHs35HeOmdW4Abc1TYJY93MuOzI2cS7gwhgpNxtX38qgyi2Wi2uwL5I2dEDJm2C50j7zcn8Au63T1kOCqCuc0XDgGXQUQpRX0N2OePMsiYaFQC3ZZ0VCYV1E8mM0jGwfp1OagObAqdbJX2bwfBfKjfJgSHOMlFs0bn0WzZUhfs_zsgOgUhvYd8Z87khe6o_A7wOrofYgSn2Y1ZAWsNbHwVk7UzYYNrfQsTdAoLy7yYHXOarg',
  sweetPink:
    'https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop',
  eleganceRose:
    'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600&auto=format&fit=crop',
  pastel:
    'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?q=80&w=600&auto=format&fit=crop',
  blossom:
    'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=600&auto=format&fit=crop',
} as const;

/* ──────────────────────────── Products ──────────────────────────── */

const product = (
  id: number,
  name: string,
  price: number,
  rating: number,
  sold: number,
  categoryId: number,
  store: Store,
  imageUrl: string,
): Product => ({
  id,
  name,
  price,
  rating,
  sold,
  category_id: categoryId,
  store,
  product_image: [{ image_url: imageUrl, isDefault: true }],
});

export const PRODUCTS: Product[] = [
  product(1, 'Rosé Romance Bouquet', 385000, 4.9, 124, 1, STORES[0], IMG.roses),
  product(2, 'Blush Tulip Arrangement', 340000, 4.6, 156, 2, STORES[0], IMG.tulips),
  product(3, 'Crimson Rose Bouquet', 420000, 4.8, 265, 1, STORES[3], IMG.roseBox),
  product(4, 'Bouquet & Teddy Bear', 495000, 4.9, 88, 5, STORES[1], IMG.teddy),
  product(5, 'Sweet Pink Bouquet', 275000, 4.8, 203, 2, STORES[1], IMG.sweetPink),
  product(6, 'Elegance Rose Box', 520000, 4.9, 97, 3, STORES[2], IMG.eleganceRose),
  product(7, 'Pastel Sunbeam', 310000, 4.7, 65, 2, STORES[2], IMG.pastel),
  product(8, 'Blossom Grace Bloom', 365000, 4.8, 142, 4, STORES[3], IMG.blossom),
];
