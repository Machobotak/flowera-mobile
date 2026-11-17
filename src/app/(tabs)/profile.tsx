/**
 * Tab "Profile" — padanan /profile/account di web.
 *
 * Struktur web: kartu akun + sidebar (Ubah Profil, Alamat, Password). Di
 * mobile sidebar diganti segmented tabs agar tetap satu layar.
 *
 * Foto profil: kamera perangkat (PhotoCaptureModal) disimpan lokal; avatar
 * API dipakai sebagai fallback.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import AddressSection from '@/components/profile/address-section';
import PhotoCaptureModal from '@/components/media/photo-capture-modal';
import PasswordForm from '@/components/profile/password-form';
import ProfileForm from '@/components/profile/profile-form';
import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  ShadowSoft,
  Spacing,
} from '@/constants/theme';
import {
  getSavedProfilePhoto,
  savePhotoToLibrary,
  saveProfilePhoto,
  type SavedProfilePhoto,
} from '@/profile/photo-storage';

type TabKey = 'profile' | 'address' | 'password';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'Profil' },
  { key: 'address', label: 'Alamat' },
  { key: 'password', label: 'Password' },
];

export default function ProfileScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [savedPhoto, setSavedPhoto] = useState<SavedProfilePhoto | null>(() =>
    getSavedProfilePhoto(),
  );
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  const hasLocalPhoto = Boolean(user && savedPhoto?.userId === user.id);
  const avatarUri = hasLocalPhoto
    ? (savedPhoto?.uri ?? null)
    : (user?.avatar ?? null);

  const handleLogout = (): void => {
    Alert.alert('Keluar Akun', 'Yakin ingin keluar dari akun Flowera?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => {
          void logout().then(() => router.replace('/'));
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.seven }]}>
        <View style={styles.placeholder}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <MaterialIcons
                name="account-circle"
                size={56}
                color={Colors.onSurfaceVariant}
              />
            </View>
          </View>

          <Text style={styles.title}>Akun Saya</Text>
          <Text style={styles.desc}>
            Masuk untuk mengelola profil dan alamat pengiriman kamu.
          </Text>

          <Link href="/login" asChild>
            <TouchableOpacity style={styles.loginButton} activeOpacity={0.85}>
              <MaterialIcons name="login" size={18} color={Colors.onPrimary} />
              <Text style={styles.loginButtonText}>Masuk / Daftar</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  const isSeller = user.roles.includes('seller');
  const roleLabel = user.roles.includes('admin')
    ? 'Admin'
    : isSeller
      ? 'Penjual'
      : 'Member';

  /** Simpan ke penyimpanan app + galeri (best-effort), sama seperti sebelumnya. */
  const handlePhotoCaptured = async (uri: string): Promise<void> => {
    const savedUri = saveProfilePhoto(uri, user.id);
    const savedToGallery = await savePhotoToLibrary(savedUri);
    setSavedPhoto({ userId: user.id, uri: savedUri });

    Alert.alert(
      'Foto Profil Tersimpan',
      savedToGallery
        ? 'Foto juga disimpan ke galeri perangkat.'
        : 'Foto disimpan di aplikasi (galeri tidak tersedia).',
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.five,
            paddingBottom: insets.bottom + Spacing.seven + Spacing.six,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.accountCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <MaterialIcons
                  name="account-circle"
                  size={48}
                  color={Colors.onSurfaceVariant}
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.cameraBadge}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ambil foto profil"
              onPress={() => setIsCameraOpen(true)}>
              <MaterialIcons
                name="photo-camera"
                size={15}
                color={Colors.onPrimary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.accountInfo}>
            <Text style={styles.accountName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.sellerCard}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isSeller ? 'Buka Seller Center' : 'Buat toko'}
          onPress={() => router.push(isSeller ? '/store' : '/store/create')}>
          <View style={styles.sellerIcon}>
            <MaterialIcons
              name={isSeller ? 'storefront' : 'add-business'}
              size={22}
              color={Colors.onPrimary}
            />
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerTitle}>
              {isSeller ? 'Seller Center' : 'Buka Toko'}
            </Text>
            <Text style={styles.sellerDesc}>
              {isSeller
                ? 'Kelola produk, pesanan, dan profil toko.'
                : 'Mulai jual buket & tanamanmu di Flowera.'}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={Colors.onSurfaceVariant}
          />
        </TouchableOpacity>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                style={styles.tab}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View
                  style={[styles.tabIndicator, active && styles.tabIndicatorActive]}
                />
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'profile' ? <ProfileForm /> : null}
        {activeTab === 'address' ? <AddressSection /> : null}
        {activeTab === 'password' ? <PasswordForm /> : null}

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.85}
          onPress={handleLogout}>
          <MaterialIcons name="logout" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>

      <PhotoCaptureModal
        visible={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCaptured={handlePhotoCaptured}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: MarginMobile,
    gap: Spacing.four,
  },
  accountCard: {
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
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    ...ShadowSoft,
  },
  sellerIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
  },
  sellerInfo: {
    flex: 1,
    gap: 2,
  },
  sellerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  sellerDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  avatarWrap: {
    width: 48,
    height: 48,
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  accountName: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 18,
    color: Colors.onSurface,
  },
  accountEmail: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    marginTop: Spacing.half,
  },
  roleText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.4,
    color: Colors.onPrimaryContainer,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  tabText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.primary,
  },
  tabIndicator: {
    height: 2,
    width: 28,
    borderRadius: Radius.full,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: Colors.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  logoutText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.error,
  },
  placeholder: {
    alignItems: 'center',
    paddingHorizontal: MarginMobile,
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: 28,
    color: Colors.onSurface,
    marginBottom: Spacing.two,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.seven,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    ...ShadowSoft,
  },
  loginButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
});
