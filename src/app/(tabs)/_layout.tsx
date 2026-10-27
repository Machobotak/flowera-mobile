import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';

import { Colors, Fonts, Radius, ShadowSoft } from '@/constants/theme';

/**
 * Bottom navigation versi mobile — padanan `mobileNavItems` di
 * components/layout/navbar/buyer-navbar.tsx web (Home, Orders, Profile).
 *
 * Perintah asli dari web base:
 *   - home   → beranda
 *   - local_mall → "Orders"  (halaman profil/pesanan)
 *   - person → "Profile"    (halaman akun)
 *
 * Web memakai Material Symbols; di sini dipakai MaterialIcons (`@expo/vector-icons`)
 * yang sudah terpasang, dengan padanan nama ikon terdekat:
 *   - home        → home
 *   - local_mall  → local-mall
 *   - person      → account-circle
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontFamily: Fonts.bodyMedium,
          fontSize: 10,
          lineHeight: 13,
        },
        tabBarIconStyle: {
          width: 24,
          height: 24,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: Radius.lg,
          borderTopRightRadius: Radius.lg,
          ...ShadowSoft,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <MaterialIcons
              name="home"
              size={24}
              color={
                typeof color === 'number' || color === null
                  ? undefined
                  : color
              }
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => (
            <MaterialIcons
              name="local-mall"
              size={24}
              color={
                typeof color === 'number' || color === null
                  ? undefined
                  : color
              }
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialIcons
              name="account-circle"
              size={24}
              color={
                typeof color === 'number' || color === null
                  ? undefined
                  : color
              }
            />
          ),
        }}
      />
    </Tabs>
  );
}
