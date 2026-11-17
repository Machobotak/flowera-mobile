/**
 * Profil toko seller — padanan `app/(seller)/store/(dashboard)/profile/page.tsx`.
 *
 * Kontrak:
 *   - `GET /seller/store/detail`
 *   - `PUT /seller/store/update` (backend menimpa kolom yang dikirim; nama,
 *     deskripsi, alamat, kota, dan tipe wajib selalu ikut)
 *   - `POST /seller/store/upload/logo` multipart field `file` (logo disimpan
 *     sebagai object name MinIO, bukan URL penuh)
 *
 * Wilayah disimpan sebagai nama + `subdistrict_id` (id kelurahan) persis seperti
 * web. Saat memuat data lama, nama wilayah dipetakan balik ke ID lewat
 * `resolveRegionNames()` agar cascade bisa dilanjutkan.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PhotoCaptureModal from '@/components/media/photo-capture-modal';
import LabeledInput from '@/components/profile/labeled-input';
import RegionSelect, {
  EMPTY_REGION,
  type RegionValue,
} from '@/components/seller/region-select';
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
import { resolveRegionNames } from '@/data/regions/resolve';
import {
  fetchStoreDetail,
  updateStore,
  uploadStoreLogo,
  type StoreDetail,
} from '@/data/seller/store-api';

export default function StoreProfileScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [region, setRegion] = useState<RegionValue>(EMPTY_REGION);

  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const applyStore = useCallback(async (detail: StoreDetail): Promise<void> => {
    setStore(detail);
    setName(detail.name);
    setPhone(detail.phoneNumber ?? '');
    setDescription(detail.description);
    setAddress(detail.address);
    setZipCode(detail.zipCode ?? '');

    const names: RegionValue = {
      provinceId: '',
      provinceName: detail.provinceName ?? '',
      cityId: '',
      cityName: detail.cityName ?? detail.city,
      districtId: '',
      districtName: detail.districtName ?? '',
      villageId: detail.subdistrictId ?? '',
      villageName: detail.subdistrictName ?? '',
    };
    setRegion(names);

    if (!detail.provinceName) return;

    try {
      const resolved = await resolveRegionNames({
        provinceName: detail.provinceName,
        cityName: detail.cityName ?? detail.city,
        districtName: detail.districtName,
        villageName: detail.subdistrictName,
      });

      setRegion({
        provinceId: resolved.province?.id ?? '',
        provinceName: detail.provinceName,
        cityId: resolved.city?.id ?? '',
        cityName: resolved.city?.name ?? detail.cityName ?? detail.city,
        districtId: resolved.district?.id ?? '',
        districtName: resolved.district?.name ?? detail.districtName ?? '',
        villageId: detail.subdistrictId ?? resolved.village?.id ?? '',
        villageName: resolved.village?.name ?? detail.subdistrictName ?? '',
      });
    } catch {
      /* Regions API gagal: pertahankan nama wilayah yang tersimpan. */
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchStoreDetail()
      .then((detail) => {
        if (active) return applyStore(detail);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Gagal memuat profil toko.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyStore, reloadToken]);

  const retryLoad = useCallback((): void => {
    setLoading(true);
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const handleLogoCaptured = async (uri: string): Promise<void> => {
    setUploading(true);
    try {
      await uploadStoreLogo(uri);
      await applyStore(await fetchStoreDetail());
      Alert.alert('Logo Diperbarui', 'Logo toko sudah diganti.');
    } catch (uploadError) {
      Alert.alert(
        'Gagal Mengunggah Logo',
        uploadError instanceof Error ? uploadError.message : 'Coba lagi.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (saving) return;

    if (!name.trim()) {
      Alert.alert('Nama Toko Kosong', 'Isi nama toko yang tampil ke pembeli.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Alamat Kosong', 'Isi alamat lengkap toko.');
      return;
    }
    if (!region.cityName) {
      Alert.alert('Kota Belum Diisi', 'Pilih kota/kabupaten toko.');
      return;
    }

    setSaving(true);
    try {
      await updateStore({
        name: name.trim(),
        address: address.trim(),
        type: store?.type || 'TOKO',
        description: description.trim(),
        city: region.cityName,
        provinceName: region.provinceName || undefined,
        cityName: region.cityName || undefined,
        districtName: region.districtName || undefined,
        subdistrictName: region.villageName || undefined,
        subdistrictId: region.villageId || undefined,
        zipCode: zipCode.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
      });

      await applyStore(await fetchStoreDetail());
      Alert.alert('Tersimpan', 'Perubahan profil toko berhasil disimpan.');
    } catch (saveError) {
      Alert.alert(
        'Gagal Menyimpan',
        saveError instanceof Error ? saveError.message : 'Coba lagi.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SellerAccessGate title="Profil Toko">
      <View style={styles.screen}>
        <SellerHeader
          title="Profil Toko"
          subtitle="Informasi yang dilihat pembeli di halaman toko"
        />

        {loading ? (
          <SellerState loading message="Memuat profil toko…" />
        ) : error ? (
          <SellerState
            icon="error-outline"
            title="Gagal Memuat"
            message={error}
            actionLabel="Coba Lagi"
            onAction={retryLoad}
          />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.seven },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={[styles.card, styles.logoCard]}>
              <View style={styles.logoWrap}>
                {store?.logo ? (
                  <Image
                    source={{ uri: store.logo }}
                    style={styles.logo}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <MaterialIcons
                    name="storefront"
                    size={34}
                    color={Colors.onPrimary}
                  />
                )}
                {uploading ? (
                  <View style={styles.logoOverlay}>
                    <ActivityIndicator color={Colors.onPrimary} />
                  </View>
                ) : null}
              </View>
              <View style={styles.logoInfo}>
                <Text style={styles.logoTitle}>{store?.name ?? '-'}</Text>
                <Text style={styles.logoMeta}>
                  {store?.rating.toFixed(1) ?? '0.0'} rating · {store?.type}
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  disabled={uploading}
                  onPress={() => setCameraOpen(true)}>
                  <MaterialIcons
                    name="photo-camera"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.secondaryButtonLabel}>
                    {uploading ? 'Mengunggah…' : 'Ganti Logo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Informasi Toko</Text>
              <LabeledInput
                label="Nama Toko"
                value={name}
                onChangeText={setName}
                placeholder="mis. Bloom Studio"
                maxLength={120}
                required
              />
              <LabeledInput
                label="Nomor Telepon"
                value={phone}
                onChangeText={setPhone}
                placeholder="08xxxxxxxxxx"
                keyboardType="phone-pad"
                maxLength={20}
              />
              <LabeledInput
                label="Deskripsi"
                value={description}
                onChangeText={setDescription}
                placeholder="Ceritakan keunikan tokomu"
                multiline
                maxLength={500}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Lokasi Toko</Text>
              <RegionSelect value={region} onChange={setRegion} />
              <LabeledInput
                label="Alamat Lengkap"
                value={address}
                onChangeText={setAddress}
                placeholder="Jalan, nomor, patokan"
                multiline
                maxLength={300}
                required
              />
              <LabeledInput
                label="Kode Pos"
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="40123"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              activeOpacity={0.85}
              disabled={saving}
              onPress={() => void handleSave()}>
              {saving ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <MaterialIcons name="save" size={18} color={Colors.onPrimary} />
              )}
              <Text style={styles.primaryButtonLabel}>Simpan Perubahan</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <PhotoCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={handleLogoCaptured}
      />
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
  card: {
    gap: Spacing.two,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    ...ShadowSoft,
  },
  cardTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  logoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: Radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 26, 27, 0.45)',
  },
  logoInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  logoTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.onSurface,
  },
  logoMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignSelf: 'flex-start',
  },
  secondaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
