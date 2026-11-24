import { useFonts } from 'expo-font';
import { router, Stack, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { AuthProvider } from '@/auth/auth-context';
import { Colors } from '@/constants/theme';
import { CartProvider } from '@/data/cart/cart-context';
import {
  ensureNotificationPermission,
  listenForNotificationTaps,
  type NotificationScreen,
} from '@/notifications/notifications';

SplashScreen.preventAutoHideAsync();

/**
 * Layout root. Menyuplai font brand Flowera (Playfair Display + Montserrat,
 * sama seperti web) lalu merender Stack — header bawaan dimatikan karena
 * tiap halaman punya navbar sendiri (lihat components/layout/navbar).
 *
 * File .ttf disimpan langsung di assets/fonts/ (bukan import dari package
 * @expo-google-fonts) karena aset dari package itu tidak ikut ter-copy saat
 * `expo export` — akibatnya font hilang di build produksi.
 */
export default function RootLayout() {
  const rootNavigationState = useRootNavigationState();
  const rootNavigationKeyRef = useRef(rootNavigationState?.key);
  const pendingNotificationScreenRef = useRef<NotificationScreen | null>(null);
  const [loaded, error] = useFonts({
    PlayfairDisplay_400Regular: require('@/assets/fonts/PlayfairDisplay_400Regular.ttf'),
    PlayfairDisplay_500Medium: require('@/assets/fonts/PlayfairDisplay_500Medium.ttf'),
    PlayfairDisplay_700Bold: require('@/assets/fonts/PlayfairDisplay_700Bold.ttf'),
    Montserrat_300Light: require('@/assets/fonts/Montserrat_300Light.ttf'),
    Montserrat_400Regular: require('@/assets/fonts/Montserrat_400Regular.ttf'),
    Montserrat_500Medium: require('@/assets/fonts/Montserrat_500Medium.ttf'),
    Montserrat_600SemiBold: require('@/assets/fonts/Montserrat_600SemiBold.ttf'),
    Montserrat_700Bold: require('@/assets/fonts/Montserrat_700Bold.ttf'),
  });

  useEffect(() => {
    rootNavigationKeyRef.current = rootNavigationState?.key;
  }, [rootNavigationState?.key]);

  useEffect(() => {
    if (!loaded && !error) return;

    SplashScreen.hideAsync();
    // Cek izin notifikasi sekali per sesi setelah splash hilang; prompt
    // hanya muncul kalau pengguna belum pernah memutuskan.
    void ensureNotificationPermission();

    // Response tap yang diterima saat startup ditahan sampai navigator siap.
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void listenForNotificationTaps((screen) => {
      if (rootNavigationKeyRef.current) {
        openNotificationScreen(screen);
      } else {
        pendingNotificationScreenRef.current = screen;
      }
    }).then((cleanup) => {
      if (cancelled) cleanup();
      else unsubscribe = cleanup;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [loaded, error]);

  useEffect(() => {
    const pendingScreen = pendingNotificationScreenRef.current;
    if (!pendingScreen || !rootNavigationState?.key) return;

    pendingNotificationScreenRef.current = null;
    openNotificationScreen(pendingScreen);
  }, [rootNavigationState?.key]);

  // Tahan splash screen sampai font siap supaya teks tidak "berkedip".
  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="cart" />
          <Stack.Screen name="checkout" />
          <Stack.Screen name="store/create" />
          <Stack.Screen name="store/index" />
          <Stack.Screen name="store/orders" />
          <Stack.Screen name="store/products/index" />
          <Stack.Screen name="store/products/[id]" />
          <Stack.Screen name="store/profile" />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}

function openNotificationScreen(screen: NotificationScreen): void {
  if (screen === 'login') {
    router.navigate({ pathname: '/login', params: { registered: '1' } });
  }
}
