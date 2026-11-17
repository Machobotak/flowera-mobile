/**
 * Cart context Flowera — state keranjang sisi klien (lihat catatan di
 * `src/data/cart/types.ts`: backend belum punya controller `/cart`).
 *
 * Dipasang di root layout supaya isi keranjang bertahan saat user berpindah
 * tab (Home → produk → keranjang → checkout).
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

import {
  cartLineTotal,
  type CartAddon,
  type CartItem,
} from '@/data/cart/types';

export function buildCartKey(
  productId: number,
  variantId: number | null,
  addons: CartAddon[],
): string {
  const addonIds = addons
    .map((addon) => addon.id)
    .sort((a, b) => a - b)
    .join(',');
  return `${productId}:${variantId ?? 0}:${addonIds}`;
}

export interface AddToCartInput {
  productId: number;
  variantId: number | null;
  productName: string;
  variantTitle: string | null;
  storeId: number;
  storeName: string;
  unitPrice: number;
  addons: CartAddon[];
  weightGram: number;
  image: string | null;
  quantity?: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem(input: AddToCartInput): void;
  setQuantity(key: string, quantity: number): void;
  removeItem(key: string): void;
  clear(): void;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  itemCount: 0,
  subtotal: 0,
  addItem: () => {},
  setQuantity: () => {},
  removeItem: () => {},
  clear: () => {},
});

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (input: AddToCartInput): void => {
    const quantity = Math.max(1, input.quantity ?? 1);
    const key = buildCartKey(input.productId, input.variantId, input.addons);

    setItems((previous) => {
      const existing = previous.find((item) => item.key === key);
      if (existing) {
        return previous.map((item) =>
          item.key === key
            ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
            : item,
        );
      }

      return [
        ...previous,
        {
          key,
          productId: input.productId,
          variantId: input.variantId,
          productName: input.productName,
          variantTitle: input.variantTitle,
          storeId: input.storeId,
          storeName: input.storeName,
          unitPrice: input.unitPrice,
          addons: input.addons,
          quantity,
          weightGram: input.weightGram,
          image: input.image,
        },
      ];
    });
  };

  const setQuantity = (key: string, quantity: number): void => {
    if (quantity < 1) {
      setItems((previous) => previous.filter((item) => item.key !== key));
      return;
    }

    setItems((previous) =>
      previous.map((item) =>
        item.key === key ? { ...item, quantity: Math.min(99, quantity) } : item,
      ),
    );
  };

  const removeItem = (key: string): void => {
    setItems((previous) => previous.filter((item) => item.key !== key));
  };

  const clear = (): void => {
    setItems([]);
  };

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + cartLineTotal(item), 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{ items, itemCount, subtotal, addItem, setQuantity, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  return useContext(CartContext);
}
