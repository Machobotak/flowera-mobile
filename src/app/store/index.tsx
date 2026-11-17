/**
 * Dashboard Seller Center — padanan `app/(seller)/store/(dashboard)/page.tsx`.
 *
 * Statistik memakai rumus web yang sama (`computeSellerStats`):
 * pesanan baru = PAID, diproses = CONFIRM_SELLER/PROSES_PENGERJAAN/DELIVERY,
 * pendapatan = total order PAID..DITERIMA.
 *
 * Data diambil paralel dari tiga endpoint seller: detail toko, pesanan, dan
 * produk. Layar di-refresh setiap kali kembali fokus (mis. setelah menambah
 * produk atau memproses pesanan).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
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
  SellerStatCard,
  SellerStatusBadge,
  getSellerStatCards,
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
  fetchSellerOrders,
  type SellerOrder,
} from '@/data/seller/seller-order-api';
import { computeSellerStats } from '@/data/seller/seller-order-status';
import {
  fetchSellerProducts,
  type SellerProduct,
} from '@/data/seller/seller-product-api';
import { fetchStoreDetail, type StoreDetail } from '@/data/seller/store-api';
import { formatDate, formatRupiah } from '@/utils/format';

export default function SellerDashboardScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [storeData, orderData, productData] = await Promise.all([
        fetchStoreDetail(),
        fetchSellerOrders(),
        fetchSellerProducts(),
      ]);
      setStore(storeData);
      setOrders(orderData);
      setProducts(productData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Gagal memuat Seller Center.',
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

  const stats = computeSellerStats(orders, products.length);
  const recentOrders = orders.slice(0, 3);

  return (
    <SellerAccessGate title="Seller Center">
      <View style={styles.screen}>
        <SellerHeader
          title="Seller Center"
          subtitle={store ? store.name : 'Kelola toko Flowera kamu'}
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
            <SellerState loading message="Memuat data toko…" />
          ) : error ? (
            <SellerState
              icon="error-outline"
              title="Gagal Memuat"
              message={error}
              actionLabel="Coba Lagi"
              onAction={() => void load()}
            />
          ) : (
            <>
              {store ? (
                <TouchableOpacity
                  style={styles.storeCard}
                  activeOpacity={0.85}
                  onPress={() => router.push('/store/profile')}>
                  <View style={styles.storeAvatar}>
                    {store.logo ? (
                      <Image
                        source={{ uri: store.logo }}
                        style={styles.storeLogo}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <MaterialIcons
                        name="storefront"
                        size={26}
                        color={Colors.onPrimary}
                      />
                    )}
                  </View>
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {store.name}
                    </Text>
                    <Text style={styles.storeMeta} numberOfLines={1}>
                      {[store.cityName ?? store.city, store.type]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    <View style={styles.ratingRow}>
                      <MaterialIcons
                        name="star"
                        size={13}
                        color={Colors.star}
                      />
                      <Text style={styles.ratingText}>
                        {store.rating.toFixed(1)} rating toko
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={Colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              ) : null}

              <View style={styles.statGrid}>
                {getSellerStatCards(stats).map((card) => (
                  <SellerStatCard
                    key={card.key}
                    icon={card.icon}
                    label={card.label}
                    value={card.value}
                    tone={card.tone}
                  />
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.85}
                  onPress={() => router.push('/store/orders')}>
                  <View style={styles.actionIcon}>
                    <MaterialIcons
                      name="receipt-long"
                      size={22}
                      color={Colors.primary}
                    />
                    {stats.newOrders > 0 ? (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>
                          {stats.newOrders}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.actionLabel}>Pesanan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.85}
                  onPress={() => router.push('/store/products')}>
                  <View style={styles.actionIcon}>
                    <MaterialIcons
                      name="inventory-2"
                      size={22}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.actionLabel}>Produk</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.85}
                  onPress={() => router.push('/store/profile')}>
                  <View style={styles.actionIcon}>
                    <MaterialIcons
                      name="edit-note"
                      size={22}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.actionLabel}>Profil Toko</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pesanan Terbaru</Text>
                {orders.length > 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push('/store/orders')}>
                    <Text style={styles.sectionLink}>Lihat Semua</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {recentOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <MaterialIcons
                    name="receipt-long"
                    size={36}
                    color={Colors.outlineVariant}
                  />
                  <Text style={styles.emptyTitle}>Belum ada pesanan</Text>
                  <Text style={styles.emptyText}>
                    Pesanan pembeli akan muncul di sini.
                  </Text>
                </View>
              ) : (
                recentOrders.map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.orderCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: '/store/orders',
                        params: { orderId: String(order.id) },
                      })
                    }>
                    <View style={styles.orderTop}>
                      <Text style={styles.orderNumber}>
                        {order.orderNumber}
                      </Text>
                      <SellerStatusBadge status={order.status} />
                    </View>
                    <Text style={styles.orderCustomer} numberOfLines={1}>
                      {order.customerName}
                    </Text>
                    <View style={styles.orderBottom}>
                      <Text style={styles.orderDate}>
                        {order.createdAt ? formatDate(order.createdAt) : '-'}
                      </Text>
                      <Text style={styles.orderTotal}>
                        {formatRupiah(order.total)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
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
    gap: Spacing.three,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    ...ShadowSoft,
  },
  storeAvatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    overflow: 'hidden',
  },
  storeLogo: {
    width: '100%',
    height: '100%',
  },
  storeInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  storeMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.onPrimary,
  },
  actionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.onSurface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  sectionLink: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.five,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
  },
  emptyTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  orderCard: {
    gap: Spacing.one,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  orderNumber: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  orderCustomer: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  orderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  orderDate: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.outline,
  },
  orderTotal: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});
