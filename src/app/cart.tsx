/**
 * Layar keranjang — mobile-only (web mengarahkan `/cart` ke "coming soon",
 * dan backend tidak punya controller `/cart`). Isi keranjang berasal dari
 * `CartProvider` (`src/data/cart/cart-context.tsx`).
 *
 * Semua perhitungan di sini hanya untuk tampilan; harga final dihitung ulang
 * backend saat checkout-preview/checkout.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  ShadowFloat,
  ShadowSoft,
  Spacing,
} from '@/constants/theme';
import { useCart } from '@/data/cart/cart-context';
import { cartLineTotal, type CartItem } from '@/data/cart/types';
import { formatRupiah } from '@/utils/format';

export default function CartScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, subtotal, itemCount, setQuantity, removeItem } = useCart();

  const confirmRemove = (item: CartItem): void => {
    Alert.alert('Hapus Item', `Hapus "${item.productName}" dari keranjang?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => removeItem(item.key) },
    ]);
  };

  const goToCheckout = (): void => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (items.length === 0) return;
    router.push('/checkout');
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.one }]}>
        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
          accessibilityLabel="Kembali">
          <MaterialIcons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Keranjang</Text>
        <View style={styles.iconButton}>
          <Text style={styles.headerCount}>{itemCount} item</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons
            name="shopping-bag"
            size={48}
            color={Colors.outlineVariant}
          />
          <Text style={styles.emptyTitle}>Keranjang masih kosong</Text>
          <Text style={styles.emptyText}>
            Yuk pilih buket favoritmu dulu di beranda.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.replace('/')}>
            <Text style={styles.primaryButtonLabel}>Mulai Belanja</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 150 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <View key={item.key} style={styles.card}>
                <View style={styles.cardTop}>
                  <Image
                    source={{
                      uri:
                        item.image ??
                        'https://ui-avatars.com/api/?name=Flowera&background=8c4a5c&color=fff',
                    }}
                    style={styles.thumb}
                    contentFit="cover"
                    accessibilityLabel={item.productName}
                  />
                  <View style={styles.cardBody}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    {item.variantTitle ? (
                      <Text style={styles.variant}>Varian: {item.variantTitle}</Text>
                    ) : null}
                    <Text style={styles.store} numberOfLines={1}>
                      {item.storeName}
                    </Text>
                    <Text style={styles.unitPrice}>
                      {formatRupiah(item.unitPrice)}
                      {item.addons.length > 0
                        ? ` + ${formatRupiah(
                            item.addons.reduce((sum, addon) => sum + addon.price, 0),
                          )} add-on`
                        : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    activeOpacity={0.7}
                    onPress={() => confirmRemove(item)}
                    accessibilityLabel="Hapus item">
                    <MaterialIcons
                      name="delete-outline"
                      size={20}
                      color={Colors.error}
                    />
                  </TouchableOpacity>
                </View>

                {item.addons.length > 0 ? (
                  <View style={styles.addonList}>
                    {item.addons.map((addon) => (
                      <Text key={addon.id} style={styles.addonText}>
                        • {addon.title} (+{formatRupiah(addon.price)})
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View style={styles.cardBottom}>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      activeOpacity={0.7}
                      onPress={() => setQuantity(item.key, item.quantity - 1)}
                      accessibilityLabel="Kurangi jumlah">
                      <MaterialIcons
                        name="remove"
                        size={18}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      activeOpacity={0.7}
                      onPress={() => setQuantity(item.key, item.quantity + 1)}
                      accessibilityLabel="Tambah jumlah">
                      <MaterialIcons name="add" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.lineTotal}>
                    {formatRupiah(cartLineTotal(item))}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, Spacing.three) },
            ]}>
            <View style={styles.footerRow}>
              <Text style={styles.footerLabel}>Subtotal</Text>
              <Text style={styles.footerValue}>{formatRupiah(subtotal)}</Text>
            </View>
            <Text style={styles.footerNote}>
              Ongkir & biaya layanan dihitung di halaman checkout.
            </Text>
            <TouchableOpacity
              style={styles.checkoutButton}
              activeOpacity={0.85}
              onPress={goToCheckout}>
              <Text style={styles.checkoutLabel}>
                {user ? 'Lanjut ke Checkout' : 'Masuk untuk Checkout'}
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={18}
                color={Colors.onPrimary}
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  headerCount: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  iconButton: {
    padding: Spacing.two,
    minWidth: 56,
    alignItems: 'center',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: MarginMobile,
  },
  emptyTitle: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 18,
    color: Colors.onSurface,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: Spacing.three,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two + 2,
  },
  primaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onPrimary,
  },
  content: {
    padding: MarginMobile,
    gap: Spacing.three,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    ...ShadowSoft,
  },
  cardTop: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  variant: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  store: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.outline,
  },
  unitPrice: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.primary,
    marginTop: Spacing.half,
  },
  removeButton: {
    padding: Spacing.half,
    alignSelf: 'flex-start',
  },
  addonList: {
    gap: 2,
    paddingLeft: 72 + Spacing.three,
  },
  addonText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.secondary,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  stepperButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  quantity: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  lineTotal: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: MarginMobile,
    paddingTop: Spacing.three,
    gap: Spacing.one,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant,
    ...ShadowFloat,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  footerValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.primary,
  },
  footerNote: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.outline,
  },
  checkoutButton: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  checkoutLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
});
