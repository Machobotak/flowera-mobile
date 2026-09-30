import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

/**
 * Tab "Profile" — padanan href="/profile/account" di web (halaman akun).
 * Static placeholder, meniru pola tampilan coming-soon/page.tsx web.
 * Saat sudah login: tampilkan identitas user + tombol Keluar.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.seven }]}>
      <View style={styles.placeholder}>
        <View style={styles.iconCircle}>
          <MaterialIcons
            name="account-circle"
            size={56}
            color={Colors.onSurfaceVariant}
          />
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
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.six,
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
});
