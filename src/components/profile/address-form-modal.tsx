/**
 * Modal tambah/ubah alamat — padanan `AddAddressModal` web.
 *
 * Backend hanya menyimpan nama wilayah + subdistrict_id, sehingga saat
 * mengubah alamat, ID provinsi/kota/kecamatan dipulihkan dari nama lewat
 * Regions API (`resolveRegionNames`). Tombol "Pilih lewat peta" memakai titik
 * yang digeser user untuk mengisi field yang sama.
 */

import React, { useEffect, useRef, useState } from 'react';

import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LabeledInput from '@/components/profile/labeled-input';
import MapPickerModal, {
  type MapCoordinates,
} from '@/components/profile/map-picker-modal';
import RegionPickerModal from '@/components/profile/region-picker-modal';
import { Colors, Fonts, MarginMobile, Radius, Spacing } from '@/constants/theme';
import { createAddress, updateAddress } from '@/data/address/address-api';
import type { AddressInput, UserAddress } from '@/data/address/types';
import {
  getCities,
  getDistricts,
  getProvinces,
  getVillages,
  type Region,
} from '@/data/regions/regions-api';
import { resolveRegionNames } from '@/data/regions/resolve';
import {
  normalizePhoneNumber,
  validatePhoneNumber,
} from '@/data/auth/validation';
import {
  detectRegionFromCoordinates,
  type DetectedRegion,
} from '@/profile/detect-current-region';

type PickerKind = 'province' | 'city' | 'district' | 'village';

interface AddressFormModalProps {
  address: UserAddress | null;
  onClose: () => void;
  onSaved: () => void;
}

function PickerField({
  label,
  value,
  placeholder,
  disabled,
  loading,
  required,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity
        style={[styles.pickerField, disabled === true && styles.pickerDisabled]}
        activeOpacity={0.75}
        disabled={disabled}
        onPress={onPress}
        accessibilityRole="button">
        <Text
          numberOfLines={1}
          style={[styles.pickerText, !value && styles.pickerPlaceholder]}>
          {value || placeholder}
        </Text>
        {loading === true ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <MaterialIcons
            name="expand-more"
            size={22}
            color={disabled === true ? Colors.outlineVariant : Colors.outline}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function AddressFormModal({
  address,
  onClose,
  onSaved,
}: AddressFormModalProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  /* Modal di-mount ulang setiap dibuka (lihat AddressSection), jadi state
     awal cukup dibaca dari `address` sekali. */
  const [recipient, setRecipient] = useState(address?.nama_penerima ?? '');
  const [phone, setPhone] = useState(address?.no_hp ?? '');
  const [provinceId, setProvinceId] = useState('');
  const [provinceName, setProvinceName] = useState(address?.province_name ?? '');
  const [cityId, setCityId] = useState('');
  const [cityName, setCityName] = useState(address?.city_name ?? '');
  const [districtId, setDistrictId] = useState('');
  const [districtName, setDistrictName] = useState(address?.district_name ?? '');
  const [villageId, setVillageId] = useState('');
  const [villageName, setVillageName] = useState(address?.subdistrict_name ?? '');
  const [zipCode, setZipCode] = useState(address?.zip_code ?? '');
  const [addressLine, setAddressLine] = useState(address?.address ?? '');
  const [note, setNote] = useState(address?.note ?? '');

  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [villages, setVillages] = useState<Region[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [regionError, setRegionError] = useState<string | null>(null);

  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [resolving, setResolving] = useState(address !== null);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapStart, setMapStart] = useState<MapCoordinates | null>(null);
  const [saving, setSaving] = useState(false);
  /* Jalan yang terakhir diisi otomatis, supaya deteksi ulang boleh
     menimpanya tanpa menghapus alamat yang diketik pengguna. */
  const autoAddressLine = useRef<string | null>(null);

  /* Pulihkan ID wilayah dari nama alamat yang tersimpan (hanya saat edit).
     Semua setState terjadi setelah await, jadi tidak memicu render berantai. */
  useEffect(() => {
    if (!address) return undefined;

    let active = true;
    resolveRegionNames({
      provinceName: address.province_name,
      cityName: address.city_name,
      districtName: address.district_name,
      villageName: address.subdistrict_name,
    })
      .then((resolved) => {
        if (!active) return;
        setProvinceId(resolved.province?.id ?? '');
        setCityId(resolved.city?.id ?? '');
        setDistrictId(resolved.district?.id ?? '');
        setVillageId(resolved.village?.id ?? '');
        setLoadingCities(Boolean(resolved.province));
        setLoadingDistricts(Boolean(resolved.city));
        setLoadingVillages(Boolean(resolved.district));
      })
      .catch((error) => {
        console.warn('[address] gagal memulihkan ID wilayah', error);
      })
      .finally(() => {
        if (active) setResolving(false);
      });

    return () => {
      active = false;
    };
  }, [address]);

  useEffect(() => {
    let active = true;
    getProvinces()
      .then((data) => {
        if (active) setProvinces(data);
      })
      .catch(() => {
        if (active) setRegionError('Gagal memuat daftar provinsi.');
      })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!provinceId) return undefined;

    let active = true;
    getCities(provinceId)
      .then((data) => {
        if (active) setCities(data);
      })
      .catch(() => {
        if (active) setRegionError('Gagal memuat daftar kota/kabupaten.');
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [provinceId]);

  useEffect(() => {
    if (!cityId) return undefined;

    let active = true;
    getDistricts(cityId)
      .then((data) => {
        if (active) setDistricts(data);
      })
      .catch(() => {
        if (active) setRegionError('Gagal memuat daftar kecamatan.');
      })
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });

    return () => {
      active = false;
    };
  }, [cityId]);

  useEffect(() => {
    if (!districtId) return undefined;

    let active = true;
    getVillages(districtId)
      .then((data) => {
        if (active) setVillages(data);
      })
      .catch(() => {
        if (active) setRegionError('Gagal memuat daftar kelurahan.');
      })
      .finally(() => {
        if (active) setLoadingVillages(false);
      });

    return () => {
      active = false;
    };
  }, [districtId]);

  const handleSelect = (region: Region): void => {
    if (picker === 'province') {
      setProvinceId(region.id);
      setProvinceName(region.name);
      setCityId('');
      setCityName('');
      setDistrictId('');
      setDistrictName('');
      setVillageId('');
      setVillageName('');
      setCities([]);
      setDistricts([]);
      setVillages([]);
      setLoadingCities(true);
    } else if (picker === 'city') {
      setCityId(region.id);
      setCityName(region.name);
      setDistrictId('');
      setDistrictName('');
      setVillageId('');
      setVillageName('');
      setDistricts([]);
      setVillages([]);
      setLoadingDistricts(true);
    } else if (picker === 'district') {
      setDistrictId(region.id);
      setDistrictName(region.name);
      setVillageId('');
      setVillageName('');
      setVillages([]);
      setLoadingVillages(true);
    } else if (picker === 'village') {
      setVillageId(region.id);
      setVillageName(region.name);
    }
    setRegionError(null);
    setPicker(null);
  };

  /** Isi field wilayah dari titik yang dipilih di peta. */
  const applyDetected = (detected: DetectedRegion): void => {
    if (detected.province) {
      setProvinceId(detected.province.id);
      setProvinceName(detected.province.name);
      setCityId(detected.city?.id ?? '');
      setCityName(detected.city?.name ?? '');
      setDistrictId(detected.district?.id ?? '');
      setDistrictName(detected.district?.name ?? '');
      setVillageId(detected.village?.id ?? '');
      setVillageName(detected.village?.name ?? '');
      setCities([]);
      setDistricts([]);
      setVillages([]);
      setLoadingCities(true);
      setLoadingDistricts(Boolean(detected.city));
      setLoadingVillages(Boolean(detected.district));
      setRegionError(null);
    }
    if (detected.postalCode) setZipCode(detected.postalCode);
    const autoFilled = autoAddressLine.current === addressLine;
    if (detected.addressLine && (!addressLine.trim() || autoFilled)) {
      autoAddressLine.current = detected.addressLine;
      setAddressLine(detected.addressLine);
    } else if (autoFilled && detected.addressLine === null) {
      /* Titik baru tidak punya nama jalan: jangan tinggalkan jalan lama. */
      autoAddressLine.current = null;
      setAddressLine('');
    }

    if (!detected.province) {
      Alert.alert(
        'Wilayah Tidak Dikenali',
        'Lokasi ditemukan, tetapi provinsinya tidak cocok dengan data wilayah. Pilih wilayah secara manual.',
      );
    } else if (!detected.city || !detected.district) {
      Alert.alert(
        'Lokasi Terisi Sebagian',
        'Provinsi/kota terisi otomatis. Lengkapi kecamatan dan kelurahan secara manual.',
      );
    }
  };

  /* Peta tetap terbuka selama reverse geocoding berjalan (spinner di tombol
     peta) dan baru ditutup setelah field wilayah terisi. */
  const handleMapConfirm = async (
    coordinates: MapCoordinates,
  ): Promise<void> => {
    try {
      applyDetected(
        await detectRegionFromCoordinates(
          coordinates.latitude,
          coordinates.longitude,
        ),
      );
      setMapVisible(false);
    } catch (error) {
      Alert.alert(
        'Gagal Mengambil Lokasi',
        error instanceof Error ? error.message : 'Coba lagi.',
      );
    }
  };

  /* Pusatkan peta ke lokasi terakhir perangkat (tanpa meminta izin); kalau
     tidak ada, komponen peta memakai titik fallback. */
  const handleOpenMap = async (): Promise<void> => {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 15 * 60 * 1000,
    }).catch(() => null);
    setMapStart(
      lastKnown
        ? {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          }
        : null,
    );
    setMapVisible(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!recipient.trim()) {
      Alert.alert('Nama Penerima Kosong', 'Isi nama penerima alamat.');
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const phoneError = validatePhoneNumber(normalizedPhone);
    if (phoneError) {
      Alert.alert('Nomor Telepon Tidak Valid', phoneError);
      return;
    }

    if (!provinceName || !cityName || !districtName) {
      Alert.alert(
        'Wilayah Belum Lengkap',
        'Pilih provinsi, kota/kabupaten, dan kecamatan.',
      );
      return;
    }

    if (!addressLine.trim()) {
      Alert.alert('Alamat Kosong', 'Isi alamat lengkap (jalan, RT/RW, patokan).');
      return;
    }

    const payload: AddressInput = {
      nama_penerima: recipient.trim(),
      no_hp: normalizedPhone,
      address: addressLine.trim(),
      note: note.trim() || undefined,
      province_name: provinceName || undefined,
      city_name: cityName || undefined,
      district_name: districtName || undefined,
      subdistrict_name: villageName || undefined,
      zip_code: zipCode.trim() || undefined,
      subdistrict_id: villageId || undefined,
    };

    setSaving(true);
    try {
      if (address) {
        await updateAddress(address.id, payload);
      } else {
        await createAddress(payload);
      }
      onSaved();
      onClose();
      Alert.alert(
        address ? 'Alamat Diperbarui' : 'Alamat Ditambahkan',
        'Perubahan alamat berhasil disimpan.',
      );
    } catch (error) {
      Alert.alert(
        'Gagal Menyimpan Alamat',
        error instanceof Error ? error.message : 'Coba lagi.',
      );
    } finally {
      setSaving(false);
    }
  };

  const pickerConfig =
    picker === 'province'
      ? { title: 'Pilih Provinsi', items: provinces, loading: loadingProvinces, selected: provinceId }
      : picker === 'city'
        ? { title: 'Pilih Kota/Kabupaten', items: cities, loading: loadingCities, selected: cityId }
        : picker === 'district'
          ? { title: 'Pilih Kecamatan', items: districts, loading: loadingDistricts, selected: districtId }
          : { title: 'Pilih Kelurahan', items: villages, loading: loadingVillages, selected: villageId };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup form alamat">
            <MaterialIcons name="close" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {address ? 'Ubah Alamat' : 'Tambah Alamat'}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.seven },
            ]}
            keyboardShouldPersistTaps="handled">
            <LabeledInput
              label="Nama Penerima"
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Nama lengkap penerima"
              required
            />
            <LabeledInput
              label="No. Telepon"
              value={phone}
              onChangeText={setPhone}
              placeholder="08xxxxxxxxxx"
              keyboardType="phone-pad"
              required
            />

            <TouchableOpacity
              style={styles.mapButton}
              activeOpacity={0.85}
              onPress={() => void handleOpenMap()}>
              <MaterialIcons name="map" size={18} color={Colors.secondary} />
              <Text style={styles.mapText}>Pilih lewat peta</Text>
            </TouchableOpacity>

            <PickerField
              label="Provinsi"
              value={provinceName}
              placeholder={resolving ? 'Memuat...' : 'Pilih provinsi'}
              loading={loadingProvinces || resolving}
              required
              onPress={() => setPicker('province')}
            />
            <PickerField
              label="Kota/Kabupaten"
              value={cityName}
              placeholder={provinceId ? 'Pilih kota/kabupaten' : 'Pilih provinsi dulu'}
              disabled={!provinceId}
              loading={loadingCities}
              required
              onPress={() => setPicker('city')}
            />
            <PickerField
              label="Kecamatan"
              value={districtName}
              placeholder={cityId ? 'Pilih kecamatan' : 'Pilih kota/kabupaten dulu'}
              disabled={!cityId}
              loading={loadingDistricts}
              required
              onPress={() => setPicker('district')}
            />
            <PickerField
              label="Kelurahan/Desa"
              value={villageName}
              placeholder={districtId ? 'Pilih kelurahan/desa' : 'Pilih kecamatan dulu'}
              disabled={!districtId}
              loading={loadingVillages}
              onPress={() => setPicker('village')}
            />

            {regionError ? <Text style={styles.errorText}>{regionError}</Text> : null}

            <LabeledInput
              label="Kode Pos"
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="5 digit"
              keyboardType="number-pad"
              maxLength={5}
              autoCapitalize="none"
            />
            <LabeledInput
              label="Alamat Lengkap"
              value={addressLine}
              onChangeText={setAddressLine}
              placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
              multiline
              required
            />
            <LabeledInput
              label="Catatan untuk Kurir"
              value={note}
              onChangeText={setNote}
              placeholder="Contoh: pagar hijau, titip ke satpam"
              multiline
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              activeOpacity={0.85}
              disabled={saving}
              onPress={() => void handleSave()}>
              {saving ? (
                <ActivityIndicator color={Colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.saveText}>
                  {address ? 'Simpan Perubahan' : 'Tambah Alamat'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <RegionPickerModal
        key={picker ?? 'closed'}
        visible={picker !== null}
        title={pickerConfig.title}
        items={pickerConfig.items}
        loading={pickerConfig.loading}
        selectedId={pickerConfig.selected}
        onClose={() => setPicker(null)}
        onSelect={handleSelect}
      />

      {mapVisible ? (
        <MapPickerModal
          initial={mapStart}
          onClose={() => setMapVisible(false)}
          onConfirm={handleMapConfirm}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: MarginMobile,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 20,
    color: Colors.onSurface,
  },
  content: {
    padding: MarginMobile,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.half + 2,
  },
  fieldLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  required: {
    color: Colors.error,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two + 3,
  },
  pickerDisabled: {
    opacity: 0.55,
  },
  pickerText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.onSurface,
  },
  pickerPlaceholder: {
    color: Colors.outline,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two + 2,
  },
  mapText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.secondary,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.error,
  },
  saveButton: {
    marginTop: Spacing.three,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
});
