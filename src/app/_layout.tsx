import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';

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
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Tahan splash screen sampai font siap supaya teks tidak "berkedip".
  if (!loaded && !error) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
    </>
  );
}
