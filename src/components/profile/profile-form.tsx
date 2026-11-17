/**
 * Tab "Profil" — padanan `ProfileTab` web.
 *
 * Endpoint: GET /api/user/profile/detail + PUT /api/user/profile/update.
 * Nama & email hanya baca (sumbernya auth), field yang bisa diubah:
 * no. HP, jenis kelamin, tempat lahir, tanggal lahir.
 *
 * Tanggal lahir diketik DD/MM/YYYY (tanpa dependency date picker native) lalu
 * dikirim sebagai ISO date (`YYYY-MM-DD`) sesuai `ProfileUpdateDto`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/auth/auth-context';
import LabeledInput from '@/components/profile/labeled-input';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  normalizePhoneNumber,
  validatePhoneNumber,
} from '@/data/auth/validation';
import { getProfileDetail, updateProfile } from '@/data/profile/profile-api';
import type { ProfileDetail } from '@/data/profile/types';

const GENDERS = [
  { value: 'laki-laki', label: 'Laki-laki' },
  { value: 'perempuan', label: 'Perempuan' },
] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** ISO / 8 digit dari backend → tampilan DD/MM/YYYY. */
export function toDateDisplay(raw: string | null): string {
  if (!raw) return '';

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    const year = Number(digits.slice(0, 4));
    if (year >= 1900 && year <= 2100) {
      return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }

  return '';
}

/** DD/MM/YYYY atau YYYY-MM-DD → `YYYY-MM-DD`, atau null kalau tidak valid. */
function toIsoDate(value: string): string | null {
  const trimmed = value.trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    return isValidDate(year, month, day)
      ? `${iso[1]}-${pad(month)}-${pad(day)}`
      : null;
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    return isValidDate(year, month, day)
      ? `${dmy[3]}-${pad(month)}-${pad(day)}`
      : null;
  }

  return null;
}

export default function ProfileForm(): React.JSX.Element {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const applyDetail = useCallback((detail: ProfileDetail): void => {
    setPhone(detail.no_hp ?? '');
    setGender(detail.gender ?? '');
    setBirthPlace(detail.birth_place ?? '');
    setBirthDate(toDateDisplay(detail.birth_date));
  }, []);

  useEffect(() => {
    let active = true;
    getProfileDetail()
      .then((detail) => {
        if (active) applyDetail(detail);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : 'Gagal memuat profil.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyDetail]);

  const retry = async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      applyDetail(await getProfileDetail());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Gagal memuat profil.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (normalizedPhone) {
      const phoneError = validatePhoneNumber(normalizedPhone);
      if (phoneError) {
        Alert.alert('Nomor Telepon Tidak Valid', phoneError);
        return;
      }
    }

    let isoBirthDate: string | undefined;
    if (birthDate.trim()) {
      const parsed = toIsoDate(birthDate);
      if (!parsed) {
        Alert.alert(
          'Tanggal Lahir Tidak Valid',
          'Gunakan format DD/MM/YYYY, contoh 17/08/1998.',
        );
        return;
      }
      isoBirthDate = parsed;
    }

    setSaving(true);
    try {
      await updateProfile({
        no_hp: normalizedPhone || undefined,
        birth_place: birthPlace.trim() || undefined,
        birth_date: isoBirthDate,
        gender: gender || undefined,
      });
      Alert.alert('Profil Tersimpan', 'Data profil berhasil diperbarui.');
    } catch (error) {
      Alert.alert(
        'Gagal Menyimpan Profil',
        error instanceof Error ? error.message : 'Coba lagi.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.stateText}>Memuat data profil...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void retry()}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Profil Saya</Text>
      <Text style={styles.sectionDesc}>
        Kelola informasi profil untuk mengontrol akun kamu
      </Text>

      <LabeledInput
        label="Nama"
        value={user?.name ?? ''}
        editable={false}
      />
      <LabeledInput
        label="Email"
        value={user?.email ?? ''}
        editable={false}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <LabeledInput
        label="No. Telepon"
        value={phone}
        onChangeText={setPhone}
        placeholder="08xxxxxxxxxx"
        keyboardType="phone-pad"
      />

      <View style={styles.field}>
        <Text style={styles.label}>Jenis Kelamin</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((option) => {
            const selected = gender === option.value;
            return (
              <Pressable
                key={option.value}
                style={styles.genderOption}
                onPress={() => setGender(selected ? '' : option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}>
                <View
                  style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.genderLabel}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <LabeledInput
        label="Tempat Lahir"
        value={birthPlace}
        onChangeText={setBirthPlace}
        placeholder="Contoh: Jakarta"
      />
      <LabeledInput
        label="Tanggal Lahir"
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="DD/MM/YYYY"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        activeOpacity={0.85}
        disabled={saving}
        onPress={() => void handleSave()}>
        {saving ? (
          <ActivityIndicator color={Colors.onPrimary} size="small" />
        ) : (
          <Text style={styles.saveText}>Simpan</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionTitle: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 20,
    color: Colors.onSurface,
  },
  sectionDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: -Spacing.two,
    marginBottom: Spacing.two,
  },
  field: {
    gap: Spacing.half + 2,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.five,
    paddingVertical: Spacing.two,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  genderLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurface,
  },
  saveButton: {
    marginTop: Spacing.two,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.seven,
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  retryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});
