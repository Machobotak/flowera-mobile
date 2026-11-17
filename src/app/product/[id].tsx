/**
 * Layar detail produk — padanan `app/(buyer)/product/[id]/page.tsx` web.
 *
 * Sumber data: `GET /api/user/product/detail/:id` (lihat
 * `src/data/product/product-detail-api.ts`). Galeri, pilihan varian, dan
 * add-on mengikuti perilaku web:
 *   - varian pertama otomatis terpilih (kalau ada),
 *   - harga = harga varian terpilih + total add-on,
 *   - gambar varian terpilih ditaruh paling depan di galeri.
 *
 * "Pesan Sekarang" menambahkan item ke keranjang lalu membuka checkout;
 * web memakai `sessionStorage.directCheckoutItems` untuk hal yang sama, di
 * mobile keranjang context yang menjadi perantara.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { useCart } from '@/data/cart/cart-context';
import type {
  ProductDetailAddon,
  ProductDetailImage,
  ProductDetailVariant,
} from '@/data/product/product-detail-api';
import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  ShadowFloat,
  ShadowSoft,
  Spacing,
} from '@/constants/theme';
import { useProductDetail } from '@/hooks/use-product-detail';
import { formatNumber, formatRupiah } from '@/utils/format';

export default function ProductDetailScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = Number(params.id);
  const validId = Number.isFinite(productId) && productId > 0 ? productId : null;

  const { product, isLoading, error, retry } = useProductDetail(validId);
  const { user } = useAuth();
  const { addItem } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [activeImage, setActiveImage] = useState(0);

  const variant: ProductDetailVariant | null =
    product?.variants.find((item) => item.id === selectedVariantId) ??
    product?.variants[0] ??
    null;
  const addons: ProductDetailAddon[] =
    product?.addons.filter((item) => selectedAddonIds.includes(item.id)) ?? [];

  const basePrice = variant?.price ?? product?.price ?? 0;
  const addonsTotal = addons.reduce((sum, item) => sum + item.price, 0);
  const totalPrice = basePrice + addonsTotal;

  const gallery: ProductDetailImage[] = product
    ? variant?.image
      ? [
          { id: -1, url: variant.image },
          ...product.images.filter((image) => image.url !== variant.image),
        ]
      : product.images
    : [];
  const currentImage = gallery[Math.min(activeImage, gallery.length - 1)] ?? null;

  const toggleAddon = (addonId: number): void => {
    setActiveImage(0);
    setSelectedAddonIds((previous) =>
      previous.includes(addonId)
        ? previous.filter((id) => id !== addonId)
        : [...previous, addonId],
    );
  };

  const addToCart = (): boolean => {
    if (!product) return false;

    addItem({
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      variantTitle: variant?.title ?? null,
      storeId: product.store?.id ?? 0,
      storeName: product.store?.name ?? 'Flowera',
      unitPrice: basePrice,
      addons: addons.map((addon) => ({
        id: addon.id,
        title: addon.title,
        price: addon.price,
        image: addon.image,
      })),
      weightGram: product.weight || 1000,
      image: currentImage?.url ?? null,
    });

    return true;
  };

  const handleAddToCart = (): void => {
    if (!addToCart()) return;
    Alert.alert('Masuk Keranjang', 'Produk sudah ditambahkan ke keranjang.', [
      { text: 'Lanjut Belanja', style: 'cancel' },
      { text: 'Lihat Keranjang', onPress: () => router.push('/cart') },
    ]);
  };

  const handleBuyNow = (): void => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!addToCart()) return;
    router.push('/checkout');
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.one }]}>
        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
          accessibilityLabel="Kembali">
          <MaterialIcons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detail Produk
        </Text>
        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.7}
          onPress={() => router.push('/cart')}
          accessibilityLabel="Keranjang">
          <MaterialIcons name="shopping-bag" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Memuat produk…</Text>
        </View>
      ) : error || !product ? (
        <View style={styles.stateBox}>
          <MaterialIcons name="error-outline" size={40} color={Colors.outline} />
          <Text style={styles.stateText}>{error ?? 'Produk tidak ditemukan.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryLabel}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 140 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}>
            {/* Galeri */}
            <View style={styles.gallery}>
              <Image
                source={{
                  uri:
                    currentImage?.url ??
                    'https://ui-avatars.com/api/?name=Flowera&background=8c4a5c&color=fff',
                }}
                style={styles.heroImage}
                contentFit="cover"
                transition={200}
                accessibilityLabel={product.name}
              />
              {product.isLifeFlower ? (
                <View style={styles.lifeBadge}>
                  <MaterialIcons name="eco" size={14} color={Colors.tertiary} />
                  <Text style={styles.lifeBadgeText}>Bunga Hidup</Text>
                </View>
              ) : null}
            </View>

            {gallery.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailRow}>
                {gallery.map((image, index) => (
                  <Pressable
                    key={`${image.id}-${image.url}`}
                    onPress={() => setActiveImage(index)}>
                    <Image
                      source={{ uri: image.url }}
                      style={[
                        styles.thumbnail,
                        index === activeImage && styles.thumbnailActive,
                      ]}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {/* Info utama */}
            <View style={styles.section}>
              <Text style={styles.title}>{product.name}</Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={16} color={Colors.star} />
                <Text style={styles.ratingText}>
                  {product.rating > 0 ? product.rating.toFixed(1) : 'Baru'}
                </Text>
                {product.store?.city ? (
                  <>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.ratingText}>{product.store.city}</Text>
                  </>
                ) : null}
              </View>
              <Text style={styles.price}>{formatRupiah(totalPrice)}</Text>
              <Text style={styles.weightNote}>
                Berat ± {formatNumber(product.weight || 1000)} gram
              </Text>
            </View>

            {/* Varian */}
            {product.variants.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Varian</Text>
                <View style={styles.chipWrap}>
                  {product.variants.map((item) => {
                    const selected = variant?.id === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedVariantId(item.id);
                          setActiveImage(0);
                        }}
                        style={[styles.variantCard, selected && styles.variantCardActive]}>
                        {item.image ? (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.variantImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.variantImagePlaceholder}>
                            <MaterialIcons
                              name="inventory-2"
                              size={20}
                              color={Colors.outline}
                            />
                          </View>
                        )}
                        <View style={styles.variantBody}>
                          <Text style={styles.variantTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {item.subTitle ? (
                            <Text style={styles.variantSubtitle} numberOfLines={1}>
                              {item.subTitle}
                            </Text>
                          ) : null}
                          <Text style={styles.variantPrice}>
                            {formatRupiah(item.price)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Add-on */}
            {product.addons.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tambahan (Add-on)</Text>
                <View style={styles.chipWrap}>
                  {product.addons.map((item) => {
                    const selected = selectedAddonIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        onPress={() => toggleAddon(item.id)}
                        style={[styles.addonCard, selected && styles.addonCardActive]}>
                        {item.image ? (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.addonImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.addonImagePlaceholder}>
                            <MaterialIcons
                              name="add-circle-outline"
                              size={20}
                              color={Colors.outline}
                            />
                          </View>
                        )}
                        <View style={styles.addonBody}>
                          <Text style={styles.addonTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.addonPrice}>
                            +{formatRupiah(item.price)}
                          </Text>
                        </View>
                        <MaterialIcons
                          name={selected ? 'check-circle' : 'radio-button-unchecked'}
                          size={20}
                          color={selected ? Colors.secondary : Colors.outline}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Deskripsi */}
            {product.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Deskripsi</Text>
                <Text style={styles.description}>{product.description}</Text>
              </View>
            ) : null}

            {/* Toko */}
            {product.store ? (
              <View style={[styles.section, styles.storeCard]}>
                <Image
                  source={{
                    uri:
                      product.store.logo ??
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(product.store.name)}&background=8c4a5c&color=fff`,
                  }}
                  style={styles.storeLogo}
                  contentFit="cover"
                />
                <View style={styles.storeBody}>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {product.store.name}
                  </Text>
                  {product.store.city ? (
                    <View style={styles.storeCityRow}>
                      <MaterialIcons
                        name="location-on"
                        size={13}
                        color={Colors.onSurfaceVariant}
                      />
                      <Text style={styles.storeCity}>{product.store.city}</Text>
                    </View>
                  ) : null}
                  {product.store.description ? (
                    <Text style={styles.storeDescription} numberOfLines={2}>
                      {product.store.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Ringkasan harga */}
            <View style={[styles.section, styles.summaryCard]}>
              <Text style={styles.summaryTitle}>Ringkasan Harga</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {variant ? variant.title : 'Harga produk'}
                </Text>
                <Text style={styles.summaryValue}>{formatRupiah(basePrice)}</Text>
              </View>
              {addons.map((addon) => (
                <View key={addon.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{addon.title}</Text>
                  <Text style={styles.summaryValue}>
                    +{formatRupiah(addon.price)}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatRupiah(totalPrice)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Aksi bawah */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, Spacing.three) },
            ]}>
            <View style={styles.footerPrice}>
              <Text style={styles.footerLabel}>Total</Text>
              <Text style={styles.footerValue}>{formatRupiah(totalPrice)}</Text>
            </View>
            <TouchableOpacity
              style={styles.cartButton}
              activeOpacity={0.85}
              onPress={handleAddToCart}>
              <MaterialIcons name="add-shopping-cart" size={18} color={Colors.primary} />
              <Text style={styles.cartButtonLabel}>Keranjang</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buyButton}
              activeOpacity={0.85}
              onPress={handleBuyNow}>
              <Text style={styles.buyButtonLabel}>Pesan Sekarang</Text>
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
  iconButton: {
    padding: Spacing.two,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: MarginMobile,
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
  },
  retryLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onPrimary,
  },
  content: {
    gap: Spacing.three,
  },
  gallery: {
    position: 'relative',
    backgroundColor: Colors.surfaceContainer,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 1,
  },
  lifeBadge: {
    position: 'absolute',
    left: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  lifeBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.tertiary,
  },
  thumbnailRow: {
    gap: Spacing.two,
    paddingHorizontal: MarginMobile,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Colors.surfaceContainer,
  },
  thumbnailActive: {
    borderColor: Colors.primary,
  },
  section: {
    paddingHorizontal: MarginMobile,
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: 24,
    color: Colors.onSurface,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  ratingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  dot: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.outline,
  },
  price: {
    fontFamily: Fonts.bodyBold,
    fontSize: 26,
    color: Colors.primary,
  },
  weightNote: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  variantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    maxWidth: '100%',
  },
  variantCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  variantImage: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
  },
  variantImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  variantBody: {
    maxWidth: 160,
  },
  variantTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  variantSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  variantPrice: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.primary,
  },
  addonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.one,
    paddingRight: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    minWidth: '48%',
  },
  addonCardActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  addonImage: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
  },
  addonImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  addonBody: {
    flex: 1,
  },
  addonTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onSurface,
  },
  addonPrice: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.secondary,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 21,
    color: Colors.onSurfaceVariant,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    marginHorizontal: MarginMobile,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...ShadowSoft,
  },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  storeBody: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  storeCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  storeCity: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  storeDescription: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.outline,
  },
  summaryCard: {
    marginHorizontal: MarginMobile,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: Spacing.two,
  },
  summaryTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summaryLabel: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  summaryValue: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.onSurface,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.outlineVariant,
  },
  summaryTotalLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  summaryTotalValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.primary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: MarginMobile,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant,
    ...ShadowFloat,
  },
  footerPrice: {
    flex: 1,
  },
  footerLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  footerValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.primary,
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    backgroundColor: Colors.surface,
  },
  cartButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  buyButton: {
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
  },
  buyButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onPrimary,
  },
});
