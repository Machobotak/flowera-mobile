/**
 * Form "Buka Toko" — padanan `app/(seller)/store/create/page.tsx` web.
 *
 * Alur backend (`POST /seller/store/create`):
 *   1. user biasa mendaftarkan toko → server membuat baris SELLER + STORE
 *   2. respons hanya berisi pesan, tanpa id toko
 *   3. role `seller` baru terbaca di `GET /auth/me`, jadi setelah sukses
 *      layar ini memanggil `refreshUser()` sebelum pindah ke dashboard.
 *
 * Field wajib mengikuti `StoreCreateDto`: name, address, type, description,
 * city. Wilayah memakai cascade Regions API (sama seperti form alamat).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import LabeledInput from '@/components/profile/labeled-input';
import RegionSelect, {
  EMPTY_REGION,
  type RegionValue,
} from '@/components/seller/region-select';
import { SellerHeader } from '@/components/seller/seller-ui';
import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  ShadowSoft,
  Spacing,
} from '@/constants/theme';
import { createStore } from '@/data/seller/store-api';

export default function CreateStoreScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [region, setRegion] = useState<RegionValue>(EMPTY_REGION);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (saving) return;

    if (!name.trim()) {
      Alert.alert('Nama Toko Kosong', 'Isi nama toko yang akan tampil ke pembeli.');
      return;
    }
    if (!region.provinceName || !region.cityName || !region.districtName) {
      Alert.alert(
        'Wilayah Belum Lengkap',
        'Pilih provinsi, kota/kabupaten, dan kecamatan toko.',
      );
      return;
    }
    if (!address.trim()) {
      Alert.alert('Alamat Kosong', 'Isi alamat lengkap toko.');
      return;
    }

    setSaving(true);
    try {
      await createStore({
        name: name.trim(),
        address: address.trim(),
        type: 'TOKO',
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

      // Role seller baru muncul setelah server membaca tabel SELLER.
      await refreshUser();
      Alert.alert('Toko Berhasil Dibuat', 'Selamat berjualan di Flowera!');
      router.replace('/store');
    } catch (error) {
      Alert.alert(
        'Gagal Membuat Toko',
        error instanceof Error ? error.message : 'Coba lagi sebentar.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.screen}>
        <SellerHeader title="Buka Toko" />
        <View style={styles.stateBox}>
          <MaterialIcons
            name="lock-outline"
            size={48}
            color={Colors.outlineVariant}
          />
          <Text style={styles.stateTitle}>Masuk dulu ya</Text>
          <Text style={styles.stateText}>
            Kamu perlu akun Flowera untuk membuka toko.
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

  if (user.roles.includes('seller')) {
    return (
      <View style={styles.screen}>
        <SellerHeader title="Buka Toko" />
        <View style={styles.stateBox}>
          <MaterialIcons
            name="storefront"
            size={48}
            color={Colors.outlineVariant}
          />
          <Text style={styles.stateTitle}>Kamu sudah punya toko</Text>
          <Text style={styles.stateText}>
            Satu akun hanya bisa memiliki satu toko. Kelola tokomu di Seller
            Center.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.replace('/store')}>
            <Text style={styles.primaryButtonLabel}>Buka Seller Center</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SellerHeader
        title="Buka Toko"
        subtitle="Mulai berjualan dan jangkau lebih banyak pelanggan."
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.seven },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <MaterialIcons
                name="storefront"
                size={28}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.heroTitle}>Buka Toko Bunga Anda</Text>
            <Text style={styles.heroText}>
              Data ini tampil di halaman toko dan dipakai untuk pengiriman
              pesanan.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Identitas Toko</Text>
            <LabeledInput
              label="Nama Toko"
              value={name}
              onChangeText={setName}
              placeholder="mis. Bloemetje Florist"
              required
              maxLength={150}
            />
            <LabeledInput
              label="Nomor Telepon Toko"
              value={phone}
              onChangeText={setPhone}
              placeholder="08xxxxxxxxxx"
              keyboardType="phone-pad"
              maxLength={20}
            />
            <LabeledInput
              label="Deskripsi Toko"
              value={description}
              onChangeText={setDescription}
              placeholder="Ceritakan keunikan buket dan bunga tokomu"
              multiline
              maxLength={500}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Lokasi Toko</Text>
            <RegionSelect value={region} onChange={setRegion} />
            <LabeledInput
              label="Alamat Lengkap"
              value={address}
              onChangeText={setAddress}
              placeholder="Nama jalan, nomor, RT/RW, patokan"
              required
              multiline
              maxLength={255}
            />
            <LabeledInput
              label="Kode Pos"
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="mis. 40123"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitDisabled]}
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleSubmit}>
            {saving ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <MaterialIcons
                name="storefront"
                size={18}
                color={Colors.onPrimary}
              />
            )}
            <Text style={styles.submitLabel}>
              {saving ? 'Membuat Toko…' : 'Buka Toko Sekarang'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: MarginMobile,
    gap: Spacing.three,
  },
  heroCard: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
  },
  heroTitle: {
    fontFamily: Fonts.headline,
    fontSize: 24,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  heroText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
  },
  card: {
    gap: Spacing.three,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    ...ShadowSoft,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    marginTop: Spacing.two,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.onPrimary,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: MarginMobile,
    gap: Spacing.two,
  },
  stateTitle: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 20,
    color: Colors.onSurface,
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
});
