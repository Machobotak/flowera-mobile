/**
 * Daftar pesanan seller — padanan halaman "Pesanan" Seller Center web.
 *
 * Data: `GET /seller/order` (satu baris per order yang memuat produk toko).
 * Detail + aksi status/foto ada di `order-detail-modal.tsx` supaya layar ini
 * tetap ringan dan filter tidak hilang setelah memproses pesanan.
 *
 * Filter mengikuti alur status backend, bukan filter pembeli:
 * PAID (baru) → CONFIRM_SELLER/PROSES_PENGERJAAN → CONFIRM_USER →
 * CONFIRM_RECEIVED → DELIVERY → DITERIMA.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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

import SellerOrderDetailModal from '@/components/seller/order-detail-modal';
import {
  SellerAccessGate,
  SellerHeader,
  SellerState,
  SellerStatusBadge,
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
import { formatDate, formatRupiah } from '@/utils/format';

type FilterKey = 'all' | 'new' | 'work' | 'confirm' | 'shipped' | 'done';

const FILTERS: { key: FilterKey; label: string; statuses: string[] | null }[] = [
  { key: 'all', label: 'Semua', statuses: null },
  { key: 'new', label: 'Baru', statuses: ['PAID'] },
  {
    key: 'work',
    label: 'Dikerjakan',
    statuses: ['CONFIRM_SELLER', 'PROSES_PENGERJAAN'],
  },
  {
    key: 'confirm',
    label: 'Menunggu Buyer',
    statuses: ['CONFIRM_USER', 'CONFIRM_RECEIVED'],
  },
  { key: 'shipped', label: 'Dikirim', statuses: ['DELIVERY'] },
  { key: 'done', label: 'Selesai', statuses: ['DITERIMA'] },
];

export default function SellerOrdersScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const parsed = Number(params.orderId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setOrders(await fetchSellerOrders());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Gagal memuat pesanan masuk.',
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

  const activeFilter = FILTERS.find((item) => item.key === filter);
  const visibleOrders = activeFilter?.statuses
    ? orders.filter((order) => activeFilter.statuses?.includes(order.status))
    : orders;

  const countFor = (statuses: string[] | null): number =>
    statuses
      ? orders.filter((order) => statuses.includes(order.status)).length
      : orders.length;

  return (
    <SellerAccessGate title="Pesanan Masuk">
      <View style={styles.screen}>
        <SellerHeader
          title="Pesanan Masuk"
          subtitle={`${orders.length} pesanan dari pembeli`}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = item.key === filter;
            const count = countFor(item.statuses);

            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(item.key)}>
                <Text
                  style={[
                    styles.filterLabel,
                    active && styles.filterLabelActive,
                  ]}>
                  {item.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
            <SellerState loading message="Memuat pesanan…" />
          ) : error ? (
            <SellerState
              icon="error-outline"
              title="Gagal Memuat"
              message={error}
              actionLabel="Coba Lagi"
              onAction={() => void load()}
            />
          ) : visibleOrders.length === 0 ? (
            <SellerState
              icon="receipt-long"
              title="Tidak ada pesanan"
              message={
                filter === 'all'
                  ? 'Pesanan baru akan muncul di sini setelah pembeli membayar.'
                  : 'Tidak ada pesanan pada filter ini.'
              }
            />
          ) : (
            visibleOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => setSelectedId(order.id)}>
                <View style={styles.cardTop}>
                  <Text style={styles.orderNumber} numberOfLines={1}>
                    {order.orderNumber}
                  </Text>
                  <SellerStatusBadge status={order.status} />
                </View>

                <Text style={styles.customer} numberOfLines={1}>
                  {order.customerName}
                </Text>

                {order.address ? (
                  <Text style={styles.address} numberOfLines={2}>
                    {[
                      order.address.address,
                      order.address.district,
                      order.address.city,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                ) : null}

                <View style={styles.cardBottom}>
                  <Text style={styles.date}>
                    {order.createdAt ? formatDate(order.createdAt) : '-'}
                  </Text>
                  <Text style={styles.total}>{formatRupiah(order.total)}</Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={Colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}

          {orders.length === 0 && !loading && !error ? (
            <TouchableOpacity
              style={styles.productLink}
              activeOpacity={0.7}
              onPress={() => router.push('/store/products')}>
              <MaterialIcons
                name="inventory-2"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.productLinkText}>Kelola Produk Toko</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <SellerOrderDetailModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load('refresh')}
        />
      </View>
    </SellerAccessGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterRow: {
    paddingHorizontal: MarginMobile,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  filterLabelActive: {
    color: Colors.onPrimary,
  },
  content: {
    paddingHorizontal: MarginMobile,
    paddingTop: Spacing.two,
    gap: Spacing.two + 2,
  },
  card: {
    gap: Spacing.one,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    ...ShadowSoft,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  orderNumber: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  customer: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.onSurface,
  },
  address: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.onSurfaceVariant,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  date: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.outline,
  },
  total: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  productLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  productLinkText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.primary,
  },
});
