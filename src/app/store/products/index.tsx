/**
 * Daftar produk seller — padanan halaman produk Seller Center web.
 *
 * Data: `GET /seller/product` (relasi `product_image` saja; kategori tidak
 * ikut). Hapus memakai `DELETE /seller/product/delete?product=<id>`.
 * Form tambah/ubah ada di `[id].tsx` (id `new` untuk produk baru).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SellerAccessGate,
  SellerHeader,
  SellerState,
} from '@/components/seller/seller-ui';
import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  ShadowSoft,
  Spacing,
} from '@/constants/theme';
import {
  deleteSellerProduct,
  fetchSellerProducts,
  type SellerProduct,
} from '@/data/seller/seller-product-api';
import { formatRupiah } from '@/utils/format';

const FALLBACK_IMAGE =
  'https://ui-avatars.com/api/?name=Flowera&background=8c4a5c&color=fff';

export default function SellerProductsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setProducts(await fetchSellerProducts());
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Gagal memuat produk.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleDelete = (product: SellerProduct): void => {
    Alert.alert(
      'Hapus Produk',
      `Hapus "${product.name}" dari toko? Produk yang sudah dipesan tetap ada di riwayat pesanan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            setDeletingId(product.id);
            deleteSellerProduct(product.id)
              .then(() => load('refresh'))
              .catch((deleteError) => {
                Alert.alert(
                  'Gagal Menghapus',
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Coba lagi.',
                );
              })
              .finally(() => setDeletingId(null));
          },
        },
      ],
    );
  };

  return (
    <SellerAccessGate title="Produk Toko">
      <View style={styles.screen}>
        <SellerHeader
          title="Produk Toko"
          subtitle={`${products.length} produk aktif`}
          action={
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Tambah produk"
              onPress={() => router.push('/store/products/new')}>
              <MaterialIcons name="add" size={26} color={Colors.primary} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.seven },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}>
          {loading ? (
            <SellerState loading message="Memuat produk…" />
          ) : error ? (
            <SellerState
              icon="error-outline"
              title="Gagal Memuat"
              message={error}
              actionLabel="Coba Lagi"
              onAction={() => void load()}
            />
          ) : products.length === 0 ? (
            <SellerState
              icon="inventory-2"
              title="Belum ada produk"
              message="Tambahkan buket atau tanaman pertama untuk mulai berjualan."
              actionLabel="Tambah Produk"
              onAction={() => router.push('/store/products/new')}
            />
          ) : (
            products.map((product) => {
              const cover =
                product.images.find((image) => image.isDefault)?.url ??
                product.images[0]?.url ??
                FALLBACK_IMAGE;

              return (
                <View key={product.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Image
                      source={{ uri: cover }}
                      style={styles.thumb}
                      contentFit="cover"
                      transition={150}
                    />
                    <View style={styles.info}>
                      <Text style={styles.name} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={styles.price}>
                        {formatRupiah(product.price)}
                      </Text>
                      <View style={styles.metaRow}>
                        {product.isLifeFlower ? (
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>Bunga Segar</Text>
                          </View>
                        ) : null}
                        <Text style={styles.meta}>
                          {product.weight > 0
                            ? `${product.weight} gr`
                            : 'Berat belum diisi'}
                        </Text>
                        <Text style={styles.meta}>
                          {product.images.length} foto
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: '/store/products/[id]',
                          params: { id: String(product.id) },
                        })
                      }>
                      <MaterialIcons
                        name="edit"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.secondaryLabel}>Ubah</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dangerButton, deletingId === product.id && styles.buttonDisabled]}
                      activeOpacity={0.85}
                      disabled={deletingId !== null}
                      onPress={() => handleDelete(product)}>
                      <MaterialIcons
                        name="delete-outline"
                        size={16}
                        color={Colors.error}
                      />
                      <Text style={styles.dangerLabel}>
                        {deletingId === product.id ? 'Menghapus…' : 'Hapus'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SellerAccessGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: MarginMobile,
    gap: Spacing.two + 2,
  },
  card: {
    gap: Spacing.two,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    ...ShadowSoft,
  },
  cardTop: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  price: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: 2,
  },
  tag: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 1,
    backgroundColor: Colors.secondaryContainer,
  },
  tagText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.secondary,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: Spacing.two,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  dangerLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
