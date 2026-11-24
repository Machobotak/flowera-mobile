/**
 * Notifikasi lokal Flowera (bukan push dari server) — dipakai untuk konfirmasi
 * registrasi.
 *
 * `expo-notifications` dimuat secara lazy: di Expo Go Android SDK 58, membuka
 * project lain dalam sesi Expo Go yang sama bisa menghilangkan native module
 * `ExpoApplication` (expo/expo#54020). Import di level modul membuat seluruh
 * app crash; dengan lazy import, hanya fitur notifikasi yang dinonaktifkan.
 *
 * `expo-notifications` juga tidak mendukung web, jadi semua fungsi di sini
 * no-op di platform tersebut.
 */

import { PermissionStatus } from 'expo';
import type * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPermission =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unsupported';

const SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';
const ACCOUNT_CHANNEL_ID = 'account';
type NotificationsModule = typeof ExpoNotifications;
type NotificationPermissionsStatus =
  ExpoNotifications.NotificationPermissionsStatus;

/** Layar yang bisa dibuka dari tap notifikasi. */
export type NotificationScreen = 'login';

let notificationsPromise: Promise<NotificationsModule | null> | null = null;

/**
 * Muat modul notifikasi sekali per sesi. Gagal dimuat (native module hilang,
 * Expo Go, web) → `null`; pemanggil harus no-op.
 */
function loadNotifications(): Promise<NotificationsModule | null> {
  if (!SUPPORTED) return Promise.resolve(null);

  notificationsPromise ??= import('expo-notifications')
    .then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      return Notifications;
    })
    .catch((error: unknown) => {
      console.warn('Fitur notifikasi tidak tersedia:', error);
      return null;
    });

  return notificationsPromise;
}

/**
 * Channel wajib dibuat sebelum prompt izin Android 13 bisa muncul, tapi
 * kegagalannya tidak boleh memblokir alur izin/penjadwalan: Expo Go SDK 58
 * melempar NPE dari channel manager (expo/expo#53907). Tanpa channel,
 * notifikasi tetap dikirim lewat fallback channel milik expo-notifications.
 */
let androidChannel: Promise<boolean> | null = null;

function ensureAndroidChannel(
  Notifications: NotificationsModule,
): Promise<boolean> {
  if (Platform.OS !== 'android') return Promise.resolve(false);
  androidChannel ??= createAndroidChannel(Notifications);
  return androidChannel;
}

async function createAndroidChannel(
  Notifications: NotificationsModule,
): Promise<boolean> {
  try {
    await Notifications.setNotificationChannelAsync(ACCOUNT_CHANNEL_ID, {
      name: 'Akun',
      description: 'Pemberitahuan aktivitas akun Flowera.',
      importance: Notifications.AndroidImportance.HIGH,
    });
    return true;
  } catch (error) {
    console.warn('Channel notifikasi Android tidak tersedia:', error);
    return false;
  }
}

function toPermission(
  Notifications: NotificationsModule,
  status: NotificationPermissionsStatus,
): NotificationPermission {
  if (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }
  return status.status === PermissionStatus.UNDETERMINED
    ? 'undetermined'
    : 'denied';
}

async function readPermission(
  Notifications: NotificationsModule,
): Promise<NotificationPermission> {
  try {
    return toPermission(Notifications, await Notifications.getPermissionsAsync());
  } catch (error) {
    console.warn('Gagal membaca izin notifikasi:', error);
    return 'denied';
  }
}

async function checkAtStartup(): Promise<NotificationPermission> {
  const Notifications = await loadNotifications();
  if (!Notifications) return 'unsupported';

  // Kegagalan channel sudah ditelan di dalam ensureAndroidChannel().
  await ensureAndroidChannel(Notifications);

  try {
    const status = await Notifications.getPermissionsAsync();
    const current = toPermission(Notifications, status);
    if (current === 'granted' || !status.canAskAgain) return current;

    // Belum diizinkan tapi sistem masih membolehkan prompt (undetermined, atau
    // Android 13 yang mengizinkan prompt ulang) → minta izin sekali.
    return toPermission(
      Notifications,
      await Notifications.requestPermissionsAsync(),
    );
  } catch (error) {
    console.warn('Gagal memeriksa izin notifikasi:', error);
    return 'denied';
  }
}

let startupCheck: Promise<NotificationPermission> | null = null;

/**
 * Dipanggil sekali saat aplikasi dibuka: cek izin notifikasi, lalu minta izin
 * bila `canAskAgain` masih true. Hasilnya di-cache agar prompt tidak muncul
 * dua kali per sesi.
 */
export function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!SUPPORTED) return Promise.resolve('unsupported');
  startupCheck ??= checkAtStartup();
  return startupCheck;
}

function readScreen(
  response: ExpoNotifications.NotificationResponse,
): NotificationScreen | null {
  const data = response.notification.request.content.data;
  return data?.screen === 'login' ? 'login' : null;
}

/**
 * Tangani tap notifikasi, termasuk tap yang membuka aplikasi dari kondisi
 * mati (lewat response terakhir yang disimpan expo-notifications).
 * Mengembalikan fungsi cleanup; no-op bila modul notifikasi tidak tersedia.
 */
export async function listenForNotificationTaps(
  onOpen: (screen: NotificationScreen) => void,
): Promise<() => void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return () => {};

  // Listener bisa terpanggil lagi oleh getLastNotificationResponse();
  // identifier mencegah navigasi ganda.
  const handled = new Set<string>();
  const handle = (response: ExpoNotifications.NotificationResponse): void => {
    const id = response.notification.request.identifier;
    if (handled.has(id)) return;
    handled.add(id);

    const screen = readScreen(response);
    if (screen) onOpen(screen);
  };

  const subscription =
    Notifications.addNotificationResponseReceivedListener(handle);

  try {
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      handle(last);
      Notifications.clearLastNotificationResponse();
    }
  } catch (error) {
    console.warn('Gagal membaca tap notifikasi terakhir:', error);
  }

  return () => subscription.remove();
}

/**
 * Notifikasi lokal "akun berhasil dibuat". Diam saja bila izin belum/tidak
 * diberikan — konfirmasi visual tetap ada lewat banner di halaman login.
 */
export async function notifyAccountCreated(name: string): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    if ((await readPermission(Notifications)) !== 'granted') return;

    const channelReady = await ensureAndroidChannel(Notifications);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Akun berhasil dibuat',
        body:
          name.length > 0
            ? `Selamat bergabung, ${name}. Silakan masuk untuk mulai belanja bunga.`
            : 'Silakan masuk untuk mulai belanja bunga.',
        sound: 'default',
        data: { screen: 'login' },
      },
      trigger:
        Platform.OS === 'android' && channelReady
          ? { channelId: ACCOUNT_CHANNEL_ID }
          : null,
    });
  } catch (error) {
    console.warn('Gagal menampilkan notifikasi registrasi:', error);
  }
}
