/**
 * Util format bersama (rupiah, tanggal, waktu) — padanan `utils/format.ts`
 * dan helper tanggal di `app/(buyer)/profile/page.tsx` web.
 *
 * Sengaja tanpa `Intl`: grouping ribuan dilakukan manual supaya hasilnya
 * sama di Hermes (Android), JSC (iOS), dan browser.
 */

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/** `185000` → `"Rp 185.000"` (gaya web: `Intl.NumberFormat("id-ID")`). */
export function formatRupiah(value: number | null | undefined): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'Rp 0';

  const rounded = Math.round(num);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${sign}Rp ${digits}`;
}

/** `185000` → `"185.000"` tanpa prefix (dipakai di baris ringkasan). */
export function formatNumber(value: number | null | undefined): string {
  return formatRupiah(value).replace(/^(-?)Rp /, '$1');
}

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `"2026-11-17T07:20:00.000Z"` → `"17 Nov 2026"`. */
export function formatDate(iso?: string | null): string {
  const date = parseDate(iso);
  if (!date) return '-';

  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()] ?? '';
  return `${day} ${month} ${date.getFullYear()}`;
}

/** `"2026-11-17T07:20:00.000Z"` → `"17 Nov 2026, 14.20"`. */
export function formatDateTime(iso?: string | null): string {
  const date = parseDate(iso);
  if (!date) return '-';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(iso)}, ${hours}.${minutes}`;
}

/**
 * Sisa waktu pembayaran: `"23j 59m 12d"`, atau `null` kalau sudah lewat.
 * `now` bisa diisi supaya pemanggil mengontrol tick (mis. dari interval).
 */
export function formatCountdown(
  expiredAt?: string | null,
  now: number = Date.now(),
): string | null {
  const date = parseDate(expiredAt);
  if (!date) return null;

  const diff = date.getTime() - now;
  if (diff <= 0) return null;

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return `${hours}j ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}d`;
}
