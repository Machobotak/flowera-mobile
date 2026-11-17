import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  ShadowSoft,
  Spacing,
} from '@/constants/theme';

import { useCart } from '@/data/cart/cart-context';

/**
 * Header beranda versi mobile.
 *
 * Di web, navbar ini desktop-oriented: search bar `hidden md:block`, tombol
 * cart/notifikasi juga hanya desktop, dan versi mobile-nya mengandalkan bottom
 * nav. Karena aplikasi mobile selalu selebar layar kecil, di sini yang dipakai
 * adalah konten versi mobile-nya saja (logo + search + notifikasi),
 * disusun dua baris supaya search bar tetap nyaman dipakai.
 *
 * Bagian auth (avatar, dropdown, tombol Masuk/Daftar) belum diport karena
 * tahap ini masih static/tanpa login.
 */
export default function BuyerNavbar() {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();
  const [query, setQuery] = React.useState('');

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
      {/* Baris 1: brand + aksi */}
      <View style={styles.topRow}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => router.push('/cart')}
            accessibilityLabel="Keranjang">
            <MaterialIcons
              name="shopping-bag"
              size={22}
              color={Colors.onSurfaceVariant}
            />
            {itemCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>
                  {itemCount > 99 ? '99+' : itemCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <MaterialIcons
              name="notifications"
              size={22}
              color={Colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Baris 2: search */}
      <View style={styles.searchWrapper}>
        <MaterialIcons
          name="search"
          size={20}
          color={Colors.outline}
          style={styles.searchIcon}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for bouquets, florists, or occasions..."
          placeholderTextColor={Colors.outline}
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: MarginMobile,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
    ...ShadowSoft,
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    height: 28,
    width: 198, // rasio asli logo 936x132
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.onPrimary,
  },
  iconButton: {
    padding: Spacing.one,
  },
  searchWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    paddingLeft: 44,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
});
