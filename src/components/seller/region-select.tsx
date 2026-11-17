/**
 * Pemilih wilayah bertingkat (provinsi → kota → kecamatan → kelurahan).
 *
 * Dipakai form Buka Toko dan form Profil Toko. Pola sama dengan
 * `address-form-modal.tsx`: memilih induk mereset semua anak, daftar anak
 * dimuat dari Regions API, dan daftar panjang dibuka lewat
 * `RegionPickerModal` (ada pencarian).
 *
 * Nilai disimpan di parent (`RegionValue`) supaya payload toko bisa
 * menggabungkan nama wilayah + `subdistrict_id` persis seperti web.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import RegionPickerModal from '@/components/profile/region-picker-modal';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  getCities,
  getDistricts,
  getProvinces,
  getVillages,
  type Region,
} from '@/data/regions/regions-api';

export interface RegionValue {
  provinceId: string;
  provinceName: string;
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  villageId: string;
  villageName: string;
}

export const EMPTY_REGION: RegionValue = {
  provinceId: '',
  provinceName: '',
  cityId: '',
  cityName: '',
  districtId: '',
  districtName: '',
  villageId: '',
  villageName: '',
};

type PickerKind = 'province' | 'city' | 'district' | 'village';

/** Daftar anak + id induknya; `parentId` berbeda berarti daftar masih basi. */
type RegionListState = { parentId: string; items: Region[] } | null;

interface RegionSelectProps {
  value: RegionValue;
  onChange: (next: RegionValue) => void;
  disabled?: boolean;
}

export function RegionSelectField({
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

export default function RegionSelect({
  value,
  onChange,
  disabled,
}: RegionSelectProps): React.JSX.Element {
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<RegionListState>(null);
  const [districts, setDistricts] = useState<RegionListState>(null);
  const [villages, setVillages] = useState<RegionListState>(null);

  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [picker, setPicker] = useState<PickerKind | null>(null);

  useEffect(() => {
    let active = true;
    getProvinces()
      .then((data) => {
        if (active) setProvinces(data);
      })
      .catch((error) => console.warn('[store] gagal memuat provinsi', error))
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const parentId = value.provinceId;
    if (!parentId) return undefined;

    let active = true;
    getCities(parentId)
      .then((data) => {
        if (active) setCities({ parentId, items: data });
      })
      .catch((error) => {
        console.warn('[store] gagal memuat kota', error);
        if (active) setCities({ parentId, items: [] });
      });

    return () => {
      active = false;
    };
  }, [value.provinceId]);

  useEffect(() => {
    const parentId = value.cityId;
    if (!parentId) return undefined;

    let active = true;
    getDistricts(parentId)
      .then((data) => {
        if (active) setDistricts({ parentId, items: data });
      })
      .catch((error) => {
        console.warn('[store] gagal memuat kecamatan', error);
        if (active) setDistricts({ parentId, items: [] });
      });

    return () => {
      active = false;
    };
  }, [value.cityId]);

  useEffect(() => {
    const parentId = value.districtId;
    if (!parentId) return undefined;

    let active = true;
    getVillages(parentId)
      .then((data) => {
        if (active) setVillages({ parentId, items: data });
      })
      .catch((error) => {
        console.warn('[store] gagal memuat kelurahan', error);
        if (active) setVillages({ parentId, items: [] });
      });

    return () => {
      active = false;
    };
  }, [value.districtId]);

  /* Daftar hanya dipakai bila id induknya masih cocok — perubahan induk
     otomatis mengosongkan daftar anak tanpa `setState` di dalam effect. */
  const cityItems = cities?.parentId === value.provinceId ? cities.items : [];
  const districtItems =
    districts?.parentId === value.cityId ? districts.items : [];
  const villageItems =
    villages?.parentId === value.districtId ? villages.items : [];
  const loadingCities =
    Boolean(value.provinceId) && cities?.parentId !== value.provinceId;
  const loadingDistricts =
    Boolean(value.cityId) && districts?.parentId !== value.cityId;
  const loadingVillages =
    Boolean(value.districtId) && villages?.parentId !== value.districtId;

  const handleSelect = (region: Region): void => {
    if (picker === 'province') {
      onChange({
        ...EMPTY_REGION,
        provinceId: region.id,
        provinceName: region.name,
      });
    } else if (picker === 'city') {
      onChange({
        ...value,
        cityId: region.id,
        cityName: region.name,
        districtId: '',
        districtName: '',
        villageId: '',
        villageName: '',
      });
    } else if (picker === 'district') {
      onChange({
        ...value,
        districtId: region.id,
        districtName: region.name,
        villageId: '',
        villageName: '',
      });
    } else if (picker === 'village') {
      onChange({
        ...value,
        villageId: region.id,
        villageName: region.name,
      });
    }
    setPicker(null);
  };

  const items =
    picker === 'province'
      ? provinces
      : picker === 'city'
        ? cityItems
        : picker === 'district'
          ? districtItems
          : villageItems;

  const title =
    picker === 'province'
      ? 'Pilih Provinsi'
      : picker === 'city'
        ? 'Pilih Kota/Kabupaten'
        : picker === 'district'
          ? 'Pilih Kecamatan'
          : 'Pilih Kelurahan';

  const loading =
    picker === 'province'
      ? loadingProvinces
      : picker === 'city'
        ? loadingCities
        : picker === 'district'
          ? loadingDistricts
          : loadingVillages;

  return (
    <View style={styles.group}>
      <RegionSelectField
        label="Provinsi"
        value={value.provinceName}
        placeholder="Pilih provinsi"
        required
        disabled={disabled}
        loading={loadingProvinces}
        onPress={() => setPicker('province')}
      />
      <RegionSelectField
        label="Kota/Kabupaten"
        value={value.cityName}
        placeholder="Pilih kota/kabupaten"
        required
        disabled={disabled || !value.provinceId}
        loading={loadingCities}
        onPress={() => setPicker('city')}
      />
      <RegionSelectField
        label="Kecamatan"
        value={value.districtName}
        placeholder="Pilih kecamatan"
        required
        disabled={disabled || !value.cityId}
        loading={loadingDistricts}
        onPress={() => setPicker('district')}
      />
      <RegionSelectField
        label="Kelurahan"
        value={value.villageName}
        placeholder="Pilih kelurahan"
        disabled={disabled || !value.districtId}
        loading={loadingVillages}
        onPress={() => setPicker('village')}
      />

      <RegionPickerModal
        visible={picker !== null}
        title={title}
        items={items}
        loading={loading}
        selectedId={
          picker === 'province'
            ? value.provinceId
            : picker === 'city'
              ? value.cityId
              : picker === 'district'
                ? value.districtId
                : value.villageId
        }
        onClose={() => setPicker(null)}
        onSelect={handleSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
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
});
