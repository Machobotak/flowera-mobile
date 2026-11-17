/**
 * Tab "Pesanan" — padanan daftar pesanan di `app/(buyer)/profile/page.tsx` web.
 *
 * Data:
 *   GET   /api/user/order                    → daftar pesanan (terbaru dulu)
 *   PATCH /api/user/order/image/:id/confirm  → setuju/tolak foto buket
 *   PATCH /api/user/order/:itemId/status     → transisi item (lihat catatan)
 *   GET   /api/payment/status/:orderNumber   → QR + status bayar terbaru
 *
 * Catatan backend: `PATCH /user/order/:id/status` menerima **ORDER_ITEM.id**
 * dan hanya mengizinkan CONFIRM_USER → CONFIRM_RECEIVED/PROSES_PENGERJAAN atau
 * DELIVERY → DITERIMA. Seller tidak pernah menulis `ORDER_ITEM.status`
 * (default PENDING), jadi transisi ini praktis ditolak backend; UI tetap
 * mengirimnya dan menampilkan pesan server apa adanya. Konfirmasi foto
 * memakai endpoint gambar yang memang jalan dan mengubah `ORDER.status`.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  ShadowSoft,
  Spacing,
} from '@/constants/theme';
import {
  confirmOrderImage,
  updateOrderItemStatus,
  type OrderImageModel,
  type OrderItemModel,
  type OrderModel,
} from '@/data/order/order-api';
import {
  ORDER_FILTERS,
  TIMELINE_STEPS,
  deriveServiceFee,
  getBuyerFilterKey,
  getBuyerStatusLabel,
  getOrderStatusStyle,
  getTimelineStep,
  isOrderFinished,
  type OrderFilterKey,
} from '@/data/order/order-status';
import { fetchPaymentStatus } from '@/data/payment/payment-api';
import { useCountdown } from '@/hooks/use-countdown';
import { useOrders } from '@/hooks/use-orders';
import { formatDate, formatRupiah } from '@/utils/format';

export default function OrdersScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { orders, isLoading, isRefreshing, error, refresh } = useOrders();
  const [filter, setFilter] = useState<OrderFilterKey>('all');

  useFocusEffect(
    useCallback(() => {
      if (user) refresh();
    }, [refresh, user]),
  );

  const visibleOrders =
    filter === 'all'
      ? orders
      : orders.filter((order) => getBuyerFilterKey(order.status) === filter);

  if (!user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.stateBox}>
          <MaterialIcons name="receipt-long" size={48} color={Colors.outlineVariant} />
          <Text style={styles.stateTitle}>Masuk dulu ya</Text>
          <Text style={styles.stateText}>
            Daftar pesanan tersimpan di akun Flowera kamu.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/login')}>
            <Text style={styles.primaryButtonLabel}>Masuk / Daftar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <Text style={styles.headerTitle}>Pesanan Saya</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} pesanan · semua transaksi buketmu ada di sini
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {ORDER_FILTERS.map((item) => {
            const active = item.key === filter;
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
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.six },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.stateText}>Memuat pesanan…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <MaterialIcons name="error-outline" size={40} color={Colors.outline} />
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={refresh}>
              <Text style={styles.primaryButtonLabel}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : visibleOrders.length === 0 ? (
          <View style={styles.stateBox}>
            <MaterialIcons
              name="inventory-2"
              size={48}
              color={Colors.outlineVariant}
            />
            <Text style={styles.stateTitle}>Belum ada pesanan</Text>
            <Text style={styles.stateText}>
              {filter === 'all'
                ? 'Yuk pesan buket pertamamu di beranda.'
                : 'Belum ada pesanan dengan status ini.'}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => router.push('/')}>
              <Text style={styles.primaryButtonLabel}>Mulai Belanja</Text>
            </TouchableOpacity>
          </View>
        ) : (
          visibleOrders.map((order) => (
            <OrderCard key={order.id} order={order} onChanged={refresh} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────── Kartu pesanan ──────────────────────────── */

function OrderCard({
  order,
  onChanged,
}: {
  order: OrderModel;
  onChanged(): void;
}): React.JSX.Element {
  const [replyNotes, setReplyNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showQr, setShowQr] = useState(false);

  const finished = isOrderFinished(order.status);
  const timelineStep = getTimelineStep(order.status);
  const statusStyle = getOrderStatusStyle(order.status);
  const pendingImages = order.images.filter((image) => image.status === 'PENDING');
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const firstItem = order.items[0];

  const handleConfirmImage = async (
    image: OrderImageModel,
    status: 'CONFIRMED' | 'REJECTED',
  ): Promise<void> => {
    const replyNote = replyNotes[image.id]?.trim();

    setBusyId(image.id);
    try {
      const message = await confirmOrderImage(image.id, {
        status,
        ...(replyNote ? { reply_note: replyNote } : {}),
      });
      Alert.alert('Berhasil', message);
      onChanged();
    } catch (cause) {
      Alert.alert(
        'Gagal',
        cause instanceof Error ? cause.message : 'Coba lagi sebentar lagi.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReceived = async (): Promise<void> => {
    const target = order.items[0];
    if (!target) return;

    setBusyId(target.id);
    try {
      const message = await updateOrderItemStatus(target.id, 'DITERIMA');
      Alert.alert('Berhasil', message);
      onChanged();
    } catch (cause) {
      Alert.alert(
        'Belum Bisa Dikonfirmasi',
        cause instanceof Error
          ? cause.message
          : 'Status pesanan tidak bisa diperbarui dari aplikasi.',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.card, finished && styles.cardFinished]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Image
            source={{
              uri:
                firstItem?.productImage ??
                'https://ui-avatars.com/api/?name=Flowera&background=8c4a5c&color=fff',
            }}
            style={styles.headerThumb}
            contentFit="cover"
          />
          <View style={styles.headerBody}>
            <Text style={styles.headerProduct} numberOfLines={1}>
              {firstItem?.productName ?? 'Pesanan'}
              {order.items.length > 1
                ? ` +${order.items.length - 1} lainnya`
                : ''}
            </Text>
            <Text style={styles.headerDate}>
              {formatDate(order.createdAt)} · #{order.orderNumber}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusStyle.background },
          ]}>
          <Text style={[styles.statusLabel, { color: statusStyle.foreground }]}>
            {getBuyerStatusLabel(order.status)}
          </Text>
        </View>
      </View>

      {/* Item */}
      <View style={styles.items}>
        {order.items.map((item) => (
          <OrderItemRow key={item.id} item={item} />
        ))}
      </View>

      {/* Ringkasan harga */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Item ({totalQuantity})</Text>
          <Text style={styles.summaryValue}>
            {formatRupiah(order.itemsTotal ?? 0)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ongkir</Text>
          <Text style={styles.summaryValue}>
            {formatRupiah(order.shippingTotal ?? 0)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Biaya layanan</Text>
          <Text style={styles.summaryValue}>
            {formatRupiah(
              deriveServiceFee({
                total: order.total,
                items_total: order.itemsTotal,
                shipping_total: order.shippingTotal,
                discount: order.discount,
              }),
            )}
          </Text>
        </View>
        {order.discount > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Diskon</Text>
            <Text style={styles.summaryValue}>
              -{formatRupiah(order.discount)}
            </Text>
          </View>
        ) : null}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Total</Text>
          <Text style={styles.summaryTotalValue}>{formatRupiah(order.total)}</Text>
        </View>
      </View>

      {order.note ? (
        <Text style={styles.orderNote}>Catatan: {order.note}</Text>
      ) : null}

      {/* Timeline */}
      {!finished ? (
        <View style={styles.timeline}>
          {TIMELINE_STEPS.map((label, index) => {
            const done = index < timelineStep;
            const isLast = index === TIMELINE_STEPS.length - 1;
            return (
              <View key={label} style={styles.timelineStep}>
                <View style={styles.timelineTrack}>
                  <View style={[styles.timelineDot, done && styles.timelineDotDone]} />
                  {!isLast ? (
                    <View
                      style={[
                        styles.timelineLine,
                        index < timelineStep - 1 && styles.timelineLineDone,
                      ]}
                    />
                  ) : null}
                </View>
                <Text
                  style={[styles.timelineLabel, done && styles.timelineLabelDone]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Foto buket dari penjual */}
      {order.images.length > 0 ? (
        <View style={styles.imagesSection}>
          <Text style={styles.sectionTitle}>Foto Buket dari Penjual</Text>
          {order.images.map((image) => {
            const pending = image.status === 'PENDING';
            const busy = busyId === image.id;

            return (
              <View key={image.id} style={styles.imageCard}>
                <Image
                  source={{ uri: image.url }}
                  style={styles.bouquetImage}
                  contentFit="cover"
                  accessibilityLabel="Foto buket dari penjual"
                />
                {image.note ? (
                  <Text style={styles.imageNote}>
                    Catatan penjual: {image.note}
                  </Text>
                ) : null}
                {image.replyNote ? (
                  <Text style={styles.imageNote}>
                    Balasan kamu: {image.replyNote}
                  </Text>
                ) : null}

                {pending ? (
                  <>
                    <TextInput
                      value={replyNotes[image.id] ?? ''}
                      onChangeText={(value) =>
                        setReplyNotes((previous) => ({
                          ...previous,
                          [image.id]: value,
                        }))
                      }
                      placeholder="Catatan untuk penjual (opsional)…"
                      placeholderTextColor={Colors.outline}
                      style={styles.replyInput}
                      multiline
                      maxLength={300}
                    />
                    <View style={styles.imageActions}>
                      <TouchableOpacity
                        style={[styles.acceptButton, busy && styles.buttonDisabled]}
                        activeOpacity={0.85}
                        disabled={busy}
                        onPress={() => handleConfirmImage(image, 'CONFIRMED')}>
                        {busy ? (
                          <ActivityIndicator size="small" color={Colors.onPrimary} />
                        ) : (
                          <>
                            <MaterialIcons
                              name="check"
                              size={16}
                              color={Colors.onPrimary}
                            />
                            <Text style={styles.acceptLabel}>Setuju</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rejectButton, busy && styles.buttonDisabled]}
                        activeOpacity={0.85}
                        disabled={busy}
                        onPress={() => handleConfirmImage(image, 'REJECTED')}>
                        <MaterialIcons name="close" size={16} color={Colors.error} />
                        <Text style={styles.rejectLabel}>Tolak</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View
                    style={[
                      styles.imageStatusBadge,
                      image.status === 'CONFIRMED'
                        ? styles.imageStatusOk
                        : styles.imageStatusRejected,
                    ]}>
                    <Text
                      style={[
                        styles.imageStatusLabel,
                        image.status === 'CONFIRMED'
                          ? styles.imageStatusLabelOk
                          : styles.imageStatusLabelRejected,
                      ]}>
                      {image.status === 'CONFIRMED' ? 'Disetujui' : 'Ditolak'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Aksi */}
      <View style={styles.actions}>
        {order.status === 'UNPAID' ? (
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => setShowQr((value) => !value)}>
            <MaterialIcons name="qr-code-2" size={16} color={Colors.onPrimary} />
            <Text style={styles.primaryButtonLabel}>
              {showQr ? 'Sembunyikan QR' : 'Lihat QR Pembayaran'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {order.status === 'PAID' ? (
          <View style={styles.hintBadge}>
            <MaterialIcons name="verified" size={16} color={Colors.secondary} />
            <Text style={styles.hintText}>Pembayaran terverifikasi</Text>
          </View>
        ) : null}

        {order.status === 'CONFIRM_SELLER' ||
        order.status === 'PROSES_PENGERJAAN' ? (
          <View style={styles.hintBadge}>
            <MaterialIcons name="handyman" size={16} color={Colors.tertiary} />
            <Text style={styles.hintText}>Sedang dibuat oleh penjual</Text>
          </View>
        ) : null}

        {order.status === 'CONFIRM_USER' && pendingImages.length === 0 ? (
          <View style={styles.hintBadge}>
            <MaterialIcons name="image" size={16} color={Colors.error} />
            <Text style={styles.hintText}>
              Menunggu foto buket dari penjual
            </Text>
          </View>
        ) : null}

        {order.status === 'DELIVERY' ? (
          <TouchableOpacity
            style={[
              styles.acceptButton,
              styles.fullWidthButton,
              busyId !== null && styles.buttonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={busyId !== null}
            onPress={handleConfirmReceived}>
            <MaterialIcons name="check-circle" size={16} color={Colors.onPrimary} />
            <Text style={styles.acceptLabel}>Pesanan Diterima</Text>
          </TouchableOpacity>
        ) : null}

        {finished ? (
          <TouchableOpacity
            style={[styles.secondaryButton, styles.fullWidthButton]}
            activeOpacity={0.85}
            onPress={() => router.push('/')}>
            <MaterialIcons name="refresh" size={16} color={Colors.primary} />
            <Text style={styles.secondaryButtonLabel}>Pesan Lagi</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {showQr && order.status === 'UNPAID' ? (
        <UnpaidQrPanel orderNumber={order.orderNumber} createdAt={order.createdAt} />
      ) : null}
    </View>
  );
}

function OrderItemRow({ item }: { item: OrderItemModel }): React.JSX.Element {
  return (
    <View style={styles.itemRow}>
      <Image
        source={{
          uri:
            item.productImage ??
            'https://ui-avatars.com/api/?name=Flowera&background=8c4a5c&color=fff',
        }}
        style={styles.itemThumb}
        contentFit="cover"
      />
      <View style={styles.itemBody}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.productName}
        </Text>
        {item.variantTitle ? (
          <Text style={styles.itemMeta}>Varian: {item.variantTitle}</Text>
        ) : null}
        {item.addons.length > 0 ? (
          <Text style={styles.itemMeta} numberOfLines={1}>
            Add-on: {item.addons.map((addon) => addon.name).join(', ')}
          </Text>
        ) : null}
        {item.storeName ? (
          <Text style={styles.itemStore}>{item.storeName}</Text>
        ) : null}
      </View>
      <View style={styles.itemPriceBox}>
        <Text style={styles.itemPrice}>{formatRupiah(item.unitPrice)}</Text>
        <Text style={styles.itemQty}>×{item.quantity}</Text>
      </View>
    </View>
  );
}

/** QR pembayaran untuk pesanan UNPAID; QR diambil ulang dari endpoint status. */
function UnpaidQrPanel({
  orderNumber,
  createdAt,
}: {
  orderNumber: string;
  createdAt: string;
}): React.JSX.Element {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const countdown = useCountdown(expiredAt);

  useEffect(() => {
    let active = true;

    fetchPaymentStatus(orderNumber)
      .then((status) => {
        if (!active) return;
        setQrUrl(status.qrUrl);
        setExpiredAt(
          status.expiredAt ??
            new Date(new Date(createdAt).getTime() + 24 * 3600000).toISOString(),
        );
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : 'QR pembayaran tidak tersedia.',
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [createdAt, orderNumber]);

  return (
    <View style={styles.qrPanel}>
      {isLoading ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.stateText}>Memuat pembayaran…</Text>
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          {qrUrl ? (
            <Image
              source={{ uri: qrUrl }}
              style={styles.qrImage}
              contentFit="contain"
              accessibilityLabel="QRIS pembayaran"
            />
          ) : (
            <Text style={styles.stateText}>
              QR belum tersedia. Coba lagi beberapa saat lagi.
            </Text>
          )}
          <Text style={styles.qrCountdown}>
            {countdown ? `Bayar dalam ${countdown}` : 'Waktu pembayaran habis'}
          </Text>
          <Text style={styles.qrHint}>
            Scan dengan e-wallet/mobile banking. Status diperbarui otomatis saat
            kamu menarik layar ke bawah.
          </Text>
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
    paddingHorizontal: MarginMobile,
    paddingBottom: Spacing.two,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant,
    gap: Spacing.one,
  },
  headerTitle: {
    fontFamily: Fonts.headline,
    fontSize: 24,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  filterRow: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    paddingRight: MarginMobile,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  filterLabelActive: {
    color: Colors.onPrimary,
  },
  content: {
    padding: MarginMobile,
    gap: Spacing.three,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.seven,
  },
  stateTitle: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 18,
    color: Colors.onSurface,
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.error,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two + 2,
  },
  primaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onPrimary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.two,
  },
  secondaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  fullWidthButton: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
    ...ShadowSoft,
  },
  cardFinished: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
  },
  headerBody: {
    flex: 1,
    gap: 2,
  },
  headerProduct: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  headerDate: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  statusLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
  },
  items: {
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
  },
  itemBody: {
    flex: 1,
    gap: 1,
  },
  itemName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onSurface,
  },
  itemMeta: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  itemStore: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.outline,
  },
  itemPriceBox: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onSurface,
  },
  itemQty: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  summary: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summaryLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  summaryValue: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.onSurface,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.outlineVariant,
    marginVertical: Spacing.one,
  },
  summaryTotalLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onSurface,
  },
  summaryTotalValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.primary,
  },
  orderNote: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  timeline: {
    flexDirection: 'row',
    paddingTop: Spacing.one,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  timelineTrack: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  timelineDotDone: {
    backgroundColor: Colors.secondary,
  },
  timelineLine: {
    position: 'absolute',
    top: 4,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  timelineLineDone: {
    backgroundColor: Colors.secondary,
  },
  timelineLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.onSurfaceVariant,
  },
  timelineLabelDone: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.secondary,
  },
  imagesSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onSurface,
  },
  imageCard: {
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.two,
  },
  bouquetImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
  },
  imageNote: {
    fontFamily: Fonts.body,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.onSurfaceVariant,
  },
  replyInput: {
    minHeight: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.one,
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurface,
    textAlignVertical: 'top',
  },
  imageActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  acceptButton: {
    justifyContent: 'center',
    gap: Spacing.half,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.two,
  },
  acceptLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.onPrimary,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rejectLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.error,
  },
  imageStatusBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  imageStatusOk: {
    backgroundColor: Colors.secondaryContainer,
  },
  imageStatusRejected: {
    backgroundColor: Colors.errorContainer,
  },
  imageStatusLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
  },
  imageStatusLabelOk: {
    color: Colors.secondary,
  },
  imageStatusLabelRejected: {
    color: Colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  hintBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  hintText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  qrPanel: {
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: Radius.md,
  },
  qrCountdown: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.tertiary,
  },
  qrHint: {
    fontFamily: Fonts.body,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});


