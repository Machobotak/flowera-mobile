import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import CameraCaptureModal from '@/components/profile/camera-capture-modal';
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
  type SavedProfilePhoto,
} from '@/profile/photo-storage';

/**
 * Tab "Profile" — padanan href="/profile/account" di web (halaman akun).
 * Static placeholder, meniru pola tampilan coming-soon/page.tsx web.
 * Saat sudah login: tampilkan identitas user + tombol Keluar.
 * Foto profil diambil lewat kamera perangkat (lihat CameraCaptureModal) dan
 * disimpan lokal; kalau user punya avatar dari API, itu jadi fallback.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [savedPhoto, setSavedPhoto] = useState<SavedProfilePhoto | null>(() =>
    getSavedProfilePhoto(),
  );
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const hasLocalPhoto = Boolean(user && savedPhoto?.userId === user.id);
  const avatarUri =
    user && savedPhoto?.userId === user.id
      ? savedPhoto.uri
      : (user?.avatar ?? null);

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.seven }]}>
      <View style={styles.placeholder}>
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
                size={56}
                color={Colors.onSurfaceVariant}
              />
            )}
          </View>
          {user ? (
            <TouchableOpacity
              style={styles.cameraBadge}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ambil foto profil"
              onPress={() => setIsCameraOpen(true)}>
              <MaterialIcons
                name="photo-camera"
                size={18}
                color={Colors.onPrimary}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.title}>
          {user ? `Halo, ${user.name}` : 'Akun Saya'}
        </Text>
        <Text style={styles.desc}>
          {user ? user.email : 'Fitur ini sedang dalam pengembangan.'}
        </Text>
        <Text style={styles.descMuted}>
          {user
            ? 'Kamu sudah masuk ke akun Flowera.'
            : 'Tim kami sedang bekerja keras untuk menghadirkannya segera.'}
        </Text>

        {user ? (
          <TouchableOpacity
            style={styles.cameraButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => setIsCameraOpen(true)}>
            <MaterialIcons
              name="photo-camera"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.cameraButtonText}>
              {hasLocalPhoto ? 'Ganti Foto' : 'Ambil Foto'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {user ? (
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={handleLogout}>
            <MaterialIcons name="logout" size={18} color={Colors.onPrimary} />
            <Text style={styles.buttonText}>Keluar</Text>
          </TouchableOpacity>
        ) : (
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.button} activeOpacity={0.85}>
              <MaterialIcons name="login" size={18} color={Colors.onPrimary} />
              <Text style={styles.buttonText}>Masuk / Daftar</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>
      {user ? (
        <CameraCaptureModal
          visible={isCameraOpen}
          userId={user.id}
          onClose={() => setIsCameraOpen(false)}
          onSaved={(uri) => setSavedPhoto({ userId: user.id, uri })}
        />
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: MarginMobile,
  },
  placeholder: {
    alignItems: 'center',
  },
  avatarWrap: {
    width: 112,
    height: 112,
    marginBottom: Spacing.six,
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...ShadowSoft,
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: 28,
    color: Colors.onSurface,
    marginBottom: Spacing.two,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  descMuted: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
    textAlign: 'center',
  },
  button: {
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
  buttonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  cameraButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});
