import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  ShadowSoft,
  Spacing,
} from '@/constants/theme';

/**
 * Tab "Orders" — padanan href="/profile" di web (halaman daftar pesanan).
 * Static placeholder, meniru pola tampilan coming-soon/page.tsx web.
 */
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.seven }]}>
      <View style={styles.placeholder}>
        <View style={styles.iconCircle}>
          <MaterialIcons
            name="local-mall"
            size={56}
            color={Colors.onSurfaceVariant}
          />
        </View>

        <Text style={styles.title}>Pesanan Saya</Text>
        <Text style={styles.desc}>Fitur ini sedang dalam pengembangan.</Text>
        <Text style={styles.descMuted}>
          Tim kami sedang bekerja keras untuk menghadirkannya segera.
        </Text>

        <Link href="/" asChild>
          <TouchableOpacity style={styles.button} activeOpacity={0.85}>
            <MaterialIcons name="arrow-back" size={18} color={Colors.onPrimary} />
            <Text style={styles.buttonText}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        </Link>
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
