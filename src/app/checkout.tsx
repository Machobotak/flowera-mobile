/**
 * Layar checkout — padanan `app/(buyer)/checkout/page.tsx` web, disesuaikan
 * dengan kontrak backend yang sebenarnya (lihat `src/data/order/checkout-api.ts`).
 *
 * Alur:
 *   1. alamat (`GET /user/address`) — wajib punya `zip_code`,
 *   2. ongkir per toko (`POST /user/order/shipping-options`) — kurir termurah
 *      otomatis terpilih, user bisa mengganti lewat bottom sheet,
 *   3. ringkasan (`POST /user/order/checkout-preview`) — harga final dihitung
 *      server; grand total = `estimated_total` + ongkir pilihan (backend tidak
 *      mengirim `grand_total`),
 *   4. buat pesanan (`POST /user/order/checkout`) → QRIS + hitung mundur,
 *   5. `GET /payment/status/:orderNumber` untuk cek status manual.
 *
 * Web menyimpan item "Beli Sekarang" di `sessionStorage`; di mobile item
 * tersebut sudah masuk keranjang sebelum layar ini dibuka.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
  ShadowFloat,
  ShadowSoft,
  Spacing,
} from '@/constants/theme';
import { listAddresses } from '@/data/address/address-api';
import type { UserAddress } from '@/data/address/types';
import { useCart } from '@/data/cart/cart-context';
import { cartLineTotal } from '@/data/cart/types';
import {
  fetchShippingOptions,
  placeOrder,
  previewCheckout,
  shippingTotalOf,
  type CheckoutItemInput,
  type CheckoutPreview,
  type CreatedOrder,
  type ShippingOption,
} from '@/data/order/checkout-api';
import { SERVICE_FEE } from '@/data/order/order-status';
import { fetchPaymentStatus } from '@/data/payment/payment-api';
import { useCountdown } from '@/hooks/use-countdown';
import { formatRupiah } from '@/utils/format';

const PAYMENT_SUCCESS_STATES = ['settlement', 'capture'];

/** Pilih kurir termurah untuk tiap toko (perilaku web `useShippingOptions`). */
function cheapestPerStore(
  optionsByStore: Record<number, ShippingOption[]>,
): Record<number, ShippingOption> {
  const selection: Record<number, ShippingOption> = {};

  for (const [storeId, options] of Object.entries(optionsByStore)) {
    let cheapest: ShippingOption | null = null;
    for (const option of options) {
      if (!cheapest || option.cost < cheapest.cost) cheapest = option;
    }
    if (cheapest) selection[Number(storeId)] = cheapest;
  }

  return selection;
}

function addressLine(address: UserAddress): string {
  const region = [
    address.subdistrict_name,
    address.district_name,
    address.city_name,
    address.province_name,
  ]
    .filter(Boolean)
    .join(', ');

  return [address.address, region, address.zip_code].filter(Boolean).join(' · ');
}

export default function CheckoutScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();

  const [addresses, setAddresses] = useState<UserAddress[] | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const [optionsByStore, setOptionsByStore] = useState<
    Record<number, ShippingOption[]>
  >({});
  const [selectedShipping, setSelectedShipping] = useState<
    Record<number, ShippingOption>
  >({});
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingSettledKey, setShippingSettledKey] = useState<string | null>(null);
  const [shippingReload, setShippingReload] = useState(0);
  const [courierStoreId, setCourierStoreId] = useState<number | null>(null);

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSettledKey, setPreviewSettledKey] = useState<string | null>(null);

  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);

  const countdown = useCountdown(createdOrder?.payment.expiredAt ?? null);

  const selectedAddress =
    addresses?.find((address) => address.id === addressId) ?? null;
  const storeIds = [...new Set(items.map((item) => item.storeId))];
  const itemsSignature = items
    .map((item) => `${item.key}x${item.quantity}`)
    .join('|');
  const shippingKey =
    addressId === null ? null : `${addressId}|${itemsSignature}|${shippingReload}`;
  const shippingLoading =
    shippingKey !== null && shippingSettledKey !== shippingKey;

  /* ── Alamat ── */
  useEffect(() => {
    if (!user) return;

    let active = true;
    listAddresses()
      .then((list) => {
        if (!active) return;
        setAddresses(list);
        setAddressId((current) =>
          current && list.some((address) => address.id === current)
            ? current
            : (list[0]?.id ?? null),
        );
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setAddresses([]);
        setAddressError(
          cause instanceof Error ? cause.message : 'Gagal memuat alamat.',
        );
      });

    return () => {
      active = false;
    };
  }, [user]);

  /* ── Ongkir per toko ── */
  useEffect(() => {
    if (!addressId || !shippingKey || items.length === 0) return;

    const controller = new AbortController();
    let active = true;

    const payload: CheckoutItemInput[] = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      storeId: item.storeId,
      weightGram: item.weightGram,
      price: item.unitPrice + item.addons.reduce((sum, addon) => sum + addon.price, 0),
      addons: item.addons.map((addon) => ({
        title: addon.title,
        price: addon.price,
      })),
    }));

    fetchShippingOptions(addressId, payload, controller.signal)
      .then((stores) => {
        if (!active) return;
        const grouped: Record<number, ShippingOption[]> = {};
        for (const store of stores) grouped[store.storeId] = store.options;

        setOptionsByStore(grouped);
        setSelectedShipping(cheapestPerStore(grouped));
        setShippingError(null);
        setShippingSettledKey(shippingKey);
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setOptionsByStore({});
        setSelectedShipping({});
        setShippingError(
          cause instanceof Error ? cause.message : 'Gagal menghitung ongkir.',
        );
        setShippingSettledKey(shippingKey);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [addressId, items, shippingKey]);

  const selectedCount = Object.keys(selectedShipping).length;
  const shippingReady =
    storeIds.length > 0 &&
    selectedCount >= storeIds.length &&
    shippingKey !== null &&
    shippingSettledKey === shippingKey &&
    shippingError === null;

  /* ── Preview harga ── */
  const previewKey = shippingReady
    ? `${shippingKey}|${Object.values(selectedShipping)
        .map((option) => `${option.storeId}:${option.cost}`)
        .join(',')}`
    : null;

  useEffect(() => {
    if (!addressId || !previewKey) return;

    const controller = new AbortController();
    let active = true;

    const payload: CheckoutItemInput[] = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      storeId: item.storeId,
      weightGram: item.weightGram,
      price: item.unitPrice + item.addons.reduce((sum, addon) => sum + addon.price, 0),
      addons: item.addons.map((addon) => ({
        title: addon.title,
        price: addon.price,
      })),
    }));

    previewCheckout(addressId, payload, selectedShipping, note || undefined, controller.signal)
      .then((result) => {
        if (!active) return;
        setPreview(result);
        setPreviewError(null);
        setPreviewSettledKey(previewKey);
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setPreviewError(
          cause instanceof Error ? cause.message : 'Gagal memverifikasi pesanan.',
        );
        setPreviewSettledKey(previewKey);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // `note` sengaja tidak memicu preview ulang; catatan dikirim saat checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressId, items, selectedShipping, previewKey]);

  const itemsTotal = preview?.itemsTotal ?? subtotal;
  const serviceFee = preview?.serviceFee ?? SERVICE_FEE;
  const shippingTotal = shippingTotalOf(selectedShipping);
  const grandTotal = itemsTotal + serviceFee + shippingTotal;

  const canPlaceOrder =
    !placing &&
    !!addressId &&
    shippingReady &&
    items.length > 0 &&
    !!selectedAddress?.zip_code;

  const handlePlaceOrder = async (): Promise<void> => {
    if (!addressId) return;

    setPlacing(true);
    setOrderError(null);

    try {
      const payload: CheckoutItemInput[] = items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        storeId: item.storeId,
        weightGram: item.weightGram,
        price: item.unitPrice + item.addons.reduce((sum, addon) => sum + addon.price, 0),
        addons: item.addons.map((addon) => ({
          title: addon.title,
          price: addon.price,
        })),
      }));

      const order = await placeOrder(
        addressId,
        payload,
        selectedShipping,
        note || undefined,
      );

      setCreatedOrder(order);
      clear();
    } catch (cause) {
      setOrderError(
        cause instanceof Error ? cause.message : 'Gagal membuat pesanan.',
      );
    } finally {
      setPlacing(false);
    }
  };

  const handleCheckPayment = async (): Promise<void> => {
    if (!createdOrder) return;

    setChecking(true);
    try {
      const status = await fetchPaymentStatus(createdOrder.orderNumber);
      const isPaid = PAYMENT_SUCCESS_STATES.includes(status.paymentStatus);

      if (isPaid) {
        setPaid(true);
        Alert.alert('Pembayaran Diterima', 'Pesananmu sedang diproses penjual.', [
          { text: 'Lihat Pesanan', onPress: () => router.replace('/(tabs)/orders') },
        ]);
        return;
      }

      Alert.alert(
        'Belum Dibayar',
        status.paymentStatus === 'expire'
          ? 'Waktu pembayaran sudah habis.'
          : 'Pembayaran belum masuk. Selesaikan scan QRIS lalu cek lagi.',
      );
    } catch (cause) {
      Alert.alert(
        'Gagal Memeriksa',
        cause instanceof Error ? cause.message : 'Coba lagi sebentar lagi.',
      );
    } finally {
      setChecking(false);
    }
  };

  const courierOptions =
    courierStoreId === null ? [] : (optionsByStore[courierStoreId] ?? []);
  const courierStoreName =
    items.find((item) => item.storeId === courierStoreId)?.storeName ?? 'Toko';

  /* ──────────────────────────── Render ──────────────────────────── */

  const headerTitle = createdOrder ? 'Pembayaran' : 'Checkout';

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
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.iconButton} />
      </View>

      {!user ? (
        <View style={styles.stateBox}>
          <MaterialIcons name="lock-outline" size={44} color={Colors.outline} />
          <Text style={styles.stateTitle}>Masuk dulu ya</Text>
          <Text style={styles.stateText}>
            Checkout membutuhkan akun Flowera untuk menyimpan pesanan.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/login')}>
            <Text style={styles.primaryButtonLabel}>Masuk / Daftar</Text>
          </TouchableOpacity>
        </View>
      ) : createdOrder ? (
        /* ── QRIS ── */
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.six },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.qrisCard}>
            <Text style={styles.qrisTitle}>Pembayaran QRIS</Text>
            <Text style={styles.qrisOrder}>#{createdOrder.orderNumber}</Text>

            {createdOrder.payment.qrUrl ? (
              <Image
                source={{ uri: createdOrder.payment.qrUrl }}
                style={styles.qrisImage}
                contentFit="contain"
                transition={200}
                accessibilityLabel="QRIS pembayaran"
              />
            ) : createdOrder.payment.qrString ? (
              <Text style={styles.qrisString}>{createdOrder.payment.qrString}</Text>
            ) : (
              <Text style={styles.qrisEmpty}>
                QR tidak tersedia. Coba cek status pembayaran beberapa saat lagi.
              </Text>
            )}

            <View style={styles.qrisInfo}>
              <View style={styles.qrisInfoRow}>
                <Text style={styles.qrisInfoLabel}>Total</Text>
                <Text style={styles.qrisInfoValue}>
                  {formatRupiah(createdOrder.summary.total)}
                </Text>
              </View>
              <View style={styles.qrisInfoRow}>
                <Text style={styles.qrisInfoLabel}>Sisa waktu</Text>
                <Text
                  style={[
                    styles.qrisInfoValue,
                    !countdown && styles.qrisExpired,
                  ]}>
                  {countdown ?? 'Waktu habis'}
                </Text>
              </View>
              <Text style={styles.qrisHint}>
                Scan QR dengan aplikasi e-wallet atau mobile banking, lalu tekan
                “Cek Pembayaran”.
              </Text>
            </View>

            {paid ? (
              <View style={styles.paidBadge}>
                <MaterialIcons name="check-circle" size={18} color={Colors.secondary} />
                <Text style={styles.paidLabel}>Pembayaran diterima</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, checking && styles.buttonDisabled]}
              activeOpacity={0.85}
              disabled={checking}
              onPress={handleCheckPayment}>
              {checking ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonLabel}>Cek Pembayaran</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => router.replace('/(tabs)/orders')}>
              <Text style={styles.secondaryButtonLabel}>Lihat Pesanan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : items.length === 0 ? (
        <View style={styles.stateBox}>
          <MaterialIcons
            name="shopping-bag"
            size={44}
            color={Colors.outlineVariant}
          />
          <Text style={styles.stateTitle}>Keranjang kosong</Text>
          <Text style={styles.stateText}>
            Tambahkan produk dulu sebelum masuk ke checkout.
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
              { paddingBottom: 170 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}>
            {/* Alamat */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Alamat Pengiriman</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setAddressModalOpen(true)}>
                  <Text style={styles.link}>Ganti</Text>
                </TouchableOpacity>
              </View>

              {addressError ? (
                <Text style={styles.errorText}>{addressError}</Text>
              ) : null}

              {addresses === null ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                  <Text style={styles.inlineLoadingText}>Memuat alamat…</Text>
                </View>
              ) : selectedAddress ? (
                <View style={styles.addressCard}>
                  <View style={styles.addressTop}>
                    <Text style={styles.addressName}>
                      {selectedAddress.nama_penerima}
                    </Text>
                    <Text style={styles.addressPhone}>{selectedAddress.no_hp}</Text>
                  </View>
                  <Text style={styles.addressText}>{addressLine(selectedAddress)}</Text>
                  {selectedAddress.note ? (
                    <Text style={styles.addressNote}>
                      Catatan: {selectedAddress.note}
                    </Text>
                  ) : null}
                  {!selectedAddress.zip_code ? (
                    <Text style={styles.errorText}>
                      Alamat ini belum punya kode pos. Lengkapi di tab Profil →
                      Alamat supaya ongkir bisa dihitung.
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.addressCard}>
                  <Text style={styles.stateText}>
                    Belum ada alamat tersimpan.
                  </Text>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    activeOpacity={0.85}
                    onPress={() => router.push('/(tabs)/profile')}>
                    <Text style={styles.secondaryButtonLabel}>Tambah Alamat</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Produk per toko + kurir */}
            {storeIds.map((storeId) => {
              const storeItems = items.filter((item) => item.storeId === storeId);
              const storeName = storeItems[0]?.storeName ?? 'Toko';
              const chosen = selectedShipping[storeId];

              return (
                <View key={storeId} style={styles.section}>
                  <Text style={styles.sectionTitle}>{storeName}</Text>

                  {storeItems.map((item) => (
                    <View key={item.key} style={styles.itemRow}>
                      <Image
                        source={{
                          uri:
                            item.image ??
                            'https://ui-avatars.com/api/?name=Flowera&background=8c4a5c&color=fff',
                        }}
                        style={styles.itemImage}
                        contentFit="cover"
                      />
                      <View style={styles.itemBody}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.productName}
                        </Text>
                        {item.variantTitle ? (
                          <Text style={styles.itemMeta}>
                            Varian: {item.variantTitle}
                          </Text>
                        ) : null}
                        {item.addons.length > 0 ? (
                          <Text style={styles.itemMeta}>
                            Add-on: {item.addons.map((addon) => addon.title).join(', ')}
                          </Text>
                        ) : null}
                        <Text style={styles.itemMeta}>{item.quantity}×</Text>
                      </View>
                      <Text style={styles.itemTotal}>
                        {formatRupiah(cartLineTotal(item))}
                      </Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.courierRow}
                    activeOpacity={0.8}
                    disabled={shippingLoading || !chosen}
                    onPress={() => setCourierStoreId(storeId)}>
                    <MaterialIcons
                      name="local-shipping"
                      size={18}
                      color={Colors.primary}
                    />
                    <View style={styles.courierBody}>
                      <Text style={styles.courierLabel}>Pengiriman</Text>
                      <Text style={styles.courierValue} numberOfLines={1}>
                        {shippingLoading
                          ? 'Menghitung ongkir…'
                          : chosen
                            ? `${chosen.courierName} ${chosen.courierService} · ${chosen.etd || '-'}`
                            : 'Pilih kurir'}
                      </Text>
                    </View>
                    {chosen ? (
                      <Text style={styles.courierCost}>
                        {formatRupiah(chosen.cost)}
                      </Text>
                    ) : null}
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={Colors.outline}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}

            {shippingError ? (
              <View style={styles.section}>
                <Text style={styles.errorText}>{shippingError}</Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  onPress={() => setShippingReload((value) => value + 1)}>
                  <Text style={styles.secondaryButtonLabel}>Hitung Ulang Ongkir</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Catatan */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Catatan untuk Penjual</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Contoh: kirim pagi hari, tulis kartu ucapan…"
                placeholderTextColor={Colors.outline}
                style={styles.noteInput}
                multiline
                maxLength={300}
              />
            </View>

            {/* Ringkasan */}
            <View style={[styles.section, styles.summaryCard]}>
              <Text style={styles.sectionTitle}>Ringkasan Pembayaran</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Harga barang ({items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                  item)
                </Text>
                <Text style={styles.summaryValue}>{formatRupiah(itemsTotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ongkos kirim</Text>
                <Text style={styles.summaryValue}>
                  {shippingReady ? formatRupiah(shippingTotal) : '—'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya layanan</Text>
                <Text style={styles.summaryValue}>{formatRupiah(serviceFee)}</Text>
              </View>
              {preview && preview.discount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Diskon</Text>
                  <Text style={styles.summaryValue}>
                    -{formatRupiah(preview.discount)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total bayar</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatRupiah(grandTotal)}
                </Text>
              </View>
              {previewSettledKey !== previewKey && previewKey ? (
                <Text style={styles.summaryHint}>Memverifikasi harga…</Text>
              ) : null}
              {previewError ? (
                <Text style={styles.errorText}>{previewError}</Text>
              ) : null}
              {orderError ? (
                <Text style={styles.errorText}>{orderError}</Text>
              ) : null}
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, Spacing.three) },
            ]}>
            <View style={styles.footerAmount}>
              <Text style={styles.footerLabel}>Total bayar</Text>
              <Text style={styles.footerValue}>{formatRupiah(grandTotal)}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.orderButton,
                (!canPlaceOrder || placing) && styles.buttonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={!canPlaceOrder}
              onPress={handlePlaceOrder}>
              {placing ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Text style={styles.orderButtonLabel}>Bayar dengan QRIS</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Modal alamat */}
      <Modal
        visible={addressModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddressModalOpen(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAddressModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Alamat</Text>
              <TouchableOpacity
                onPress={() => setAddressModalOpen(false)}
                accessibilityLabel="Tutup">
                <MaterialIcons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {(addresses ?? []).map((address) => {
                const selected = address.id === addressId;
                return (
                  <TouchableOpacity
                    key={address.id}
                    activeOpacity={0.8}
                    style={[
                      styles.modalOption,
                      selected && styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      setAddressId(address.id);
                      setAddressModalOpen(false);
                    }}>
                    <View style={styles.modalOptionBody}>
                      <Text style={styles.addressName}>
                        {address.nama_penerima} · {address.no_hp}
                      </Text>
                      <Text style={styles.addressText}>{addressLine(address)}</Text>
                      {!address.zip_code ? (
                        <Text style={styles.errorText}>Kode pos belum diisi</Text>
                      ) : null}
                    </View>
                    <MaterialIcons
                      name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={20}
                      color={selected ? Colors.primary : Colors.outline}
                    />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.modalOption, styles.modalAdd]}
                activeOpacity={0.8}
                onPress={() => {
                  setAddressModalOpen(false);
                  router.push('/(tabs)/profile');
                }}>
                <MaterialIcons name="add" size={20} color={Colors.primary} />
                <Text style={styles.link}>Tambah alamat baru di Profil</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal kurir */}
      <Modal
        visible={courierStoreId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCourierStoreId(null)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCourierStoreId(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kurir · {courierStoreName}</Text>
              <TouchableOpacity
                onPress={() => setCourierStoreId(null)}
                accessibilityLabel="Tutup">
                <MaterialIcons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {courierOptions.length === 0 ? (
                <Text style={styles.stateText}>Belum ada opsi kurir.</Text>
              ) : (
                courierOptions.map((option) => {
                  const selected =
                    courierStoreId !== null &&
                    selectedShipping[courierStoreId]?.courierCode ===
                      option.courierCode &&
                    selectedShipping[courierStoreId]?.courierService ===
                      option.courierService;

                  return (
                    <TouchableOpacity
                      key={`${option.courierCode}-${option.courierService}`}
                      activeOpacity={0.8}
                      style={[
                        styles.modalOption,
                        selected && styles.modalOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedShipping((previous) => ({
                          ...previous,
                          [option.storeId]: option,
                        }));
                        setCourierStoreId(null);
                      }}>
                      <View style={styles.modalOptionBody}>
                        <Text style={styles.courierOptionTitle}>
                          {option.courierName} {option.courierService}
                        </Text>
                        <Text style={styles.courierOptionMeta}>
                          Estimasi {option.etd || '-'}
                        </Text>
                      </View>
                      <Text style={styles.courierCost}>
                        {formatRupiah(option.cost)}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    minWidth: 40,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: MarginMobile,
  },
  stateTitle: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 18,
    color: Colors.onSurface,
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  content: {
    padding: MarginMobile,
    gap: Spacing.three,
  },
  section: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    ...ShadowSoft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  link: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.error,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  inlineLoadingText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  addressCard: {
    gap: Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.three,
  },
  addressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  addressName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  addressPhone: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  addressText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },
  addressNote: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.outline,
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  itemImage: {
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
    fontSize: 13,
    color: Colors.onSurface,
  },
  itemMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  itemTotal: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.two,
  },
  courierBody: {
    flex: 1,
  },
  courierLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  courierValue: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.onSurface,
  },
  courierCost: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.primary,
  },
  noteInput: {
    minHeight: 72,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.two,
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurface,
    textAlignVertical: 'top',
  },
  summaryCard: {
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summaryLabel: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  summaryValue: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
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
  summaryHint: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.outline,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: MarginMobile,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant,
    ...ShadowFloat,
  },
  footerAmount: {
    flex: 1,
  },
  footerLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  footerValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.primary,
  },
  orderButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    minWidth: 170,
    alignItems: 'center',
  },
  orderButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  primaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onPrimary,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.two + 2,
  },
  secondaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  qrisCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    ...ShadowSoft,
  },
  qrisTitle: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 18,
    color: Colors.onSurface,
  },
  qrisOrder: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  qrisImage: {
    width: 240,
    height: 240,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  qrisString: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  qrisEmpty: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  qrisInfo: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  qrisInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qrisInfoLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  qrisInfoValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.tertiary,
  },
  qrisExpired: {
    color: Colors.error,
  },
  qrisHint: {
    fontFamily: Fonts.body,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.onSurfaceVariant,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  paidLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.secondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(32, 26, 27, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '75%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  modalList: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.three,
  },
  modalOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  modalOptionBody: {
    flex: 1,
    gap: 2,
  },
  modalAdd: {
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  courierOptionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  courierOptionMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
});
