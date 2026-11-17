/**
 * Modal detail pesanan seller — padanan halaman/dialog pesanan web.
 *
 * Kontrak:
 *   - `GET /seller/order/:id` (detail + item + foto bukti)
 *   - `PATCH /seller/order/:id/status` (transisi sesuai `SELLER_TRANSITIONS`)
 *   - `POST /seller/order/:id/upload-image` (hanya saat PROSES_PENGERJAAN)
 *
 * Backend menolak TRANSISI ke CONFIRM_USER bila belum ada foto bukti
 * ("Proof image not found."), jadi tombolnya dinonaktifkan sampai foto
 * terunggah — pesan backend tetap ditampilkan kalau tetap gagal.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PhotoCaptureModal from '@/components/media/photo-capture-modal';
import LabeledInput from '@/components/profile/labeled-input';
import { SellerState, SellerStatusBadge } from '@/components/seller/seller-ui';
import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  Spacing,
} from '@/constants/theme';
import {
  fetchSellerOrderDetail,
  updateSellerOrderStatus,
  uploadSellerOrderImage,
  type SellerOrderDetail,
} from '@/data/seller/seller-order-api';
import {
  canUploadProof,
  getSellerStatusHint,
  getSellerTransitions,
} from '@/data/seller/seller-order-status';
import { formatDateTime, formatRupiah } from '@/utils/format';

interface SellerOrderDetailModalProps {
  orderId: number | null;
  onClose: () => void;
  /** Dipanggil setelah status/foto berubah agar daftar ikut diperbarui. */
  onChanged: () => void;
}

interface DetailState {
  orderId: number;
  detail: SellerOrderDetail | null;
  error: string | null;
}

export default function SellerOrderDetailModal({
  orderId,
  onClose,
  onChanged,
}: SellerOrderDetailModalProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DetailState | null>(null);
  const [busyStatus, setBusyStatus] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [note, setNote] = useState('');

  /* Detail hanya ditampilkan bila milik `orderId` aktif; ini sekaligus
     mencegah state basi tanpa perlu reset `setState` di dalam effect. */
  const detail = data !== null && data.orderId === orderId ? data.detail : null;
  const error = data !== null && data.orderId === orderId ? data.error : null;
  const loading =
    orderId !== null && (data === null || data.orderId !== orderId);

  useEffect(() => {
    if (orderId === null) return undefined;

    let active = true;
    fetchSellerOrderDetail(orderId)
      .then((nextDetail) => {
        if (active) setData({ orderId, detail: nextDetail, error: null });
      })
      .catch((loadError) => {
        if (active) {
          setData({
            orderId,
            detail: null,
            error:
              loadError instanceof Error
                ? loadError.message
                : 'Gagal memuat detail pesanan.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  const reload = async (): Promise<void> => {
    if (orderId === null) return;
    try {
      const nextDetail = await fetchSellerOrderDetail(orderId);
      setData({ orderId, detail: nextDetail, error: null });
    } catch (reloadError) {
      setData((previous) => ({
        orderId,
        detail: previous?.orderId === orderId ? previous.detail : null,
        error:
          reloadError instanceof Error
            ? reloadError.message
            : 'Gagal memuat detail pesanan.',
      }));
    }
  };

  const handleTransition = (targetStatus: string, label: string): void => {
    if (orderId === null || busyStatus) return;

    const isConfirmUser = targetStatus === 'CONFIRM_USER';
    const message = isConfirmUser
      ? 'Pembeli akan menerima notifikasi untuk menyetujui foto buket. Lanjutkan?'
      : `Ubah status pesanan menjadi "${label}"?`;

    Alert.alert(label, message, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Lanjutkan',
        onPress: () => {
          setBusyStatus(targetStatus);
          updateSellerOrderStatus(orderId, targetStatus)
            .then(async () => {
              await reload();
              onChanged();
              Alert.alert('Status Diperbarui', `Pesanan kini: ${label}.`);
            })
            .catch((statusError) => {
              Alert.alert(
                'Gagal Mengubah Status',
                statusError instanceof Error
                  ? statusError.message
                  : 'Coba lagi.',
              );
            })
            .finally(() => setBusyStatus(null));
        },
      },
    ]);
  };

  const handleUpload = async (uri: string): Promise<void> => {
    if (orderId === null) return;
    await uploadSellerOrderImage(orderId, uri, note);
    setNote('');
    await reload();
    onChanged();
    Alert.alert(
      'Foto Terkirim',
      'Tekan "Minta Konfirmasi Buyer" agar pembeli meninjau foto buket.',
    );
  };

  const handleClose = (): void => {
    setNote('');
    onClose();
  };

  const status = detail?.status ?? '';
  const transitions = getSellerTransitions(status);
  const hint = getSellerStatusHint(status);
  const canUpload = canUploadProof(status);
  const hasProof = (detail?.proofs.length ?? 0) > 0;

  return (
    <Modal
      visible={orderId !== null}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Tutup detail pesanan"
            onPress={handleClose}>
            <MaterialIcons name="close" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {detail?.orderNumber ?? 'Detail Pesanan'}
          </Text>
          <View style={styles.iconButton} />
        </View>

        {loading ? (
          <SellerState loading message="Memuat pesanan…" />
        ) : error ? (
          <SellerState
            icon="error-outline"
            title="Gagal Memuat"
            message={error}
            actionLabel="Coba Lagi"
            onAction={() => void reload()}
          />
        ) : detail ? (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.seven },
            ]}
            showsVerticalScrollIndicator={false}>
            <View style={styles.statusCard}>
              <SellerStatusBadge status={detail.status} />
              <Text style={styles.statusDate}>
                Dibuat {detail.createdAt ? formatDateTime(detail.createdAt) : '-'}
              </Text>
              {hint ? <Text style={styles.statusHint}>{hint}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pembeli</Text>
              <Text style={styles.bodyStrong}>{detail.customerName}</Text>
              {detail.customerEmail ? (
                <Text style={styles.bodyText}>{detail.customerEmail}</Text>
              ) : null}
              {detail.customerPhone ? (
                <Text style={styles.bodyText}>{detail.customerPhone}</Text>
              ) : null}
            </View>

            {detail.address ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Alamat Pengiriman</Text>
                <Text style={styles.bodyStrong}>
                  {detail.address.recipient ?? '-'}
                  {detail.address.phone ? ` · ${detail.address.phone}` : ''}
                </Text>
                <Text style={styles.bodyText}>{detail.address.address}</Text>
                <Text style={styles.bodyText}>
                  {[
                    detail.address.subdistrict,
                    detail.address.district,
                    detail.address.city,
                    detail.address.province,
                    detail.address.zipCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
                {detail.address.note ? (
                  <Text style={styles.noteText}>
                    Catatan: {detail.address.note}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Item Pesanan</Text>
              {detail.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Image
                    source={{
                      uri:
                        item.productImage ??
                        'https://ui-avatars.com/api/?name=Flowera&background=8c4a5c&color=fff',
                    }}
                    style={styles.itemImage}
                    contentFit="cover"
                    transition={150}
                  />
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    {item.variantTitle ? (
                      <Text style={styles.bodyText}>
                        Varian: {item.variantTitle}
                      </Text>
                    ) : null}
                    {item.addon ? (
                      <Text style={styles.bodyText}>Add-on: {item.addon}</Text>
                    ) : null}
                    <Text style={styles.bodyText}>
                      {item.quantity} × {formatRupiah(item.price)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>
                    {formatRupiah(item.subTotal)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Pesanan</Text>
                <Text style={styles.totalValue}>
                  {formatRupiah(detail.total)}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Foto Bukti Pengerjaan</Text>
              {detail.proofs.length === 0 ? (
                <Text style={styles.bodyText}>
                  Belum ada foto. Unggah foto buket saat pesanan berstatus
                  “Sedang Dikerjakan”.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.proofRow}>
                  {detail.proofs.map((proof) => (
                    <View key={proof.id} style={styles.proofWrap}>
                      {proof.imageUrl ? (
                        <Image
                          source={{ uri: proof.imageUrl }}
                          style={styles.proofImage}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View style={styles.proofPlaceholder}>
                          <MaterialIcons
                            name="broken-image"
                            size={22}
                            color={Colors.outline}
                          />
                        </View>
                      )}
                      <Text style={styles.proofStatus}>{proof.status}</Text>
                      {proof.note ? (
                        <Text style={styles.proofNote} numberOfLines={2}>
                          {proof.note}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              )}

              {canUpload ? (
                <>
                  <LabeledInput
                    label="Catatan Foto (opsional)"
                    value={note}
                    onChangeText={setNote}
                    placeholder="mis. Mawar sudah dirangkai, siap dikirim"
                    maxLength={150}
                  />
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    activeOpacity={0.85}
                    onPress={() => setCameraOpen(true)}>
                    <MaterialIcons
                      name="photo-camera"
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={styles.secondaryButtonLabel}>
                      Ambil & Unggah Foto
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>

            {transitions.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Aksi Pesanan</Text>
                {transitions.map((action) => {
                  const blocked =
                    action.status === 'CONFIRM_USER' && !hasProof;
                  const busy = busyStatus === action.status;

                  return (
                    <TouchableOpacity
                      key={action.status}
                      style={[
                        styles.primaryButton,
                        (blocked || busyStatus !== null) &&
                          styles.buttonDisabled,
                      ]}
                      activeOpacity={0.85}
                      disabled={blocked || busyStatus !== null}
                      onPress={() =>
                        handleTransition(action.status, action.label)
                      }>
                      {busy ? (
                        <ActivityIndicator color={Colors.onPrimary} />
                      ) : (
                        <MaterialIcons
                          name={action.icon}
                          size={18}
                          color={Colors.onPrimary}
                        />
                      )}
                      <Text style={styles.primaryButtonLabel}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {blockedReason(status, hasProof) ? (
                  <Text style={styles.warningText}>
                    {blockedReason(status, hasProof)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      <PhotoCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={handleUpload}
      />
    </Modal>
  );
}

function blockedReason(status: string, hasProof: boolean): string | null {
  if (status === 'PROSES_PENGERJAAN' && !hasProof) {
    return 'Unggah minimal satu foto buket sebelum meminta konfirmasi pembeli.';
  }
  return null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: MarginMobile,
    paddingBottom: Spacing.three,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: MarginMobile,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  statusCard: {
    gap: Spacing.one,
  },
  statusDate: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  statusHint: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  card: {
    gap: Spacing.two,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  cardTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  bodyStrong: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  bodyText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.onSurfaceVariant,
  },
  noteText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.tertiary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
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
  itemTotal: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: Spacing.two,
  },
  totalLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  totalValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  proofRow: {
    gap: Spacing.two,
  },
  proofWrap: {
    width: 96,
    gap: 2,
  },
  proofImage: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
  },
  proofPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  proofStatus: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  proofNote: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.outline,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  secondaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  warningText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.error,
  },
});
