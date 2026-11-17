/**
 * Komponen bersama Seller Center (mobile).
 *
 * Web memakai sidebar `(seller)/layout.tsx`; di mobile setiap layar berdiri
 * sendiri, jadi header + state box + badge status dikumpulkan di sini supaya
 * gaya antar layar toko konsisten.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  Spacing,
} from '@/constants/theme';
import {
  getSellerStatusStyle,
  type SellerStats,
} from '@/data/seller/seller-order-status';

/* ──────────────────────────── Header ──────────────────────────── */

interface SellerHeaderProps {
  title: string;
  subtitle?: string;
  /** Slot kanan (mis. tombol tambah). */
  action?: React.ReactNode;
  showBack?: boolean;
}

export function SellerHeader({
  title,
  subtitle,
  action,
  showBack = true,
}: SellerHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.headerRow}>
        {showBack ? (
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={() => router.back()}>
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={Colors.onSurface}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.iconButton}>{action}</View>
      </View>
      {subtitle ? (
        <Text style={styles.headerSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/* ──────────────────────────── Access gate ──────────────────────────── */

/**
 * Penjaga layar seller: belum login → CTA masuk, belum punya toko → CTA buka
 * toko. Role `seller` berasal dari `/auth/me`, jadi setelah create store
 * pemanggil wajib `refreshUser()` (lihat `store/create.tsx`).
 */
export function SellerAccessGate({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { user } = useAuth();

  if (user?.roles.includes('seller')) {
    return <>{children}</>;
  }

  return (
    <View style={styles.gateScreen}>
      <SellerHeader title={title} />
      <View style={styles.stateBox}>
        <MaterialIcons
          name={user ? 'storefront' : 'lock-outline'}
          size={48}
          color={Colors.outlineVariant}
        />
        <Text style={styles.stateTitle}>
          {user ? 'Toko belum dibuat' : 'Masuk dulu ya'}
        </Text>
        <Text style={styles.stateText}>
          {user
            ? 'Buka toko dulu untuk mengelola produk dan pesananmu.'
            : 'Seller Center hanya bisa diakses setelah masuk ke akun Flowera.'}
        </Text>
        {user ? (
          <Link href="/store/create" asChild>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
              <MaterialIcons
                name="add-business"
                size={18}
                color={Colors.onPrimary}
              />
              <Text style={styles.primaryButtonLabel}>Buka Toko</Text>
            </TouchableOpacity>
          </Link>
        ) : (
          <Link href="/login" asChild>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
              <MaterialIcons name="login" size={18} color={Colors.onPrimary} />
              <Text style={styles.primaryButtonLabel}>Masuk / Daftar</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>
    </View>
  );
}

/* ──────────────────────────── State box ──────────────────────────── */

export function SellerState({
  icon = 'hourglass-empty',
  title,
  message,
  loading,
  actionLabel,
  onAction,
}: {
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  title?: string;
  message?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.stateBox}>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : (
        <MaterialIcons name={icon} size={44} color={Colors.outlineVariant} />
      )}
      {title ? <Text style={styles.stateTitle}>{title}</Text> : null}
      {message ? <Text style={styles.stateText}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={onAction}>
          <Text style={styles.primaryButtonLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ──────────────────────────── Badge status ──────────────────────────── */

export function SellerStatusBadge({
  status,
}: {
  status: string;
}): React.JSX.Element {
  const style = getSellerStatusStyle(status);

  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Text style={[styles.badgeText, { color: style.foreground }]}>
        {style.label}
      </Text>
    </View>
  );
}

/* ──────────────────────────── Stat card ──────────────────────────── */

export function SellerStatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
  tone: string;
}): React.JSX.Element {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tone }]}>
        <MaterialIcons name={icon} size={20} color={Colors.onPrimary} />
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function getSellerStatCards(stats: SellerStats): {
  key: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
  tone: string;
}[] {
  return [
    {
      key: 'new',
      icon: 'fiber-new',
      label: 'Pesanan Baru',
      value: String(stats.newOrders),
      tone: Colors.primary,
    },
    {
      key: 'active',
      icon: 'autorenew',
      label: 'Sedang Diproses',
      value: String(stats.activeOrders),
      tone: Colors.secondary,
    },
    {
      key: 'products',
      icon: 'inventory-2',
      label: 'Produk',
      value: String(stats.productCount),
      tone: Colors.tertiary,
    },
    {
      key: 'revenue',
      icon: 'payments',
      label: 'Pendapatan',
      value: formatShortRupiah(stats.revenue),
      tone: Colors.onPrimaryContainer,
    },
  ];
}

/** Rupiah ringkas untuk kartu statistik (mis. `Rp 1,2 jt`). */
export function formatShortRupiah(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: MarginMobile,
    paddingBottom: Spacing.three,
    backgroundColor: Colors.background,
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.headline,
    fontSize: 24,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    paddingLeft: 44,
  },
  gateScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: MarginMobile,
    paddingVertical: Spacing.seven,
    gap: Spacing.two,
  },
  stateTitle: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 20,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
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
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  statValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.onSurface,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
});
