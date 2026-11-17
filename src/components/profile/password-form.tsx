/**
 * Tab "Password" — padanan `ChangePasswordTab` web.
 * Backend: POST /api/auth/change-password, minimal 8 karakter.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import LabeledInput from '@/components/profile/labeled-input';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { changePassword } from '@/data/api/auth-api';

const MIN_LENGTH = 8;

export default function PasswordForm(): React.JSX.Element {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!oldPassword) {
      Alert.alert('Password Lama Kosong', 'Masukkan password lama kamu.');
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      Alert.alert(
        'Password Terlalu Pendek',
        `Password baru minimal ${MIN_LENGTH} karakter.`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Konfirmasi Tidak Cocok',
        'Konfirmasi password baru belum sama.',
      );
      return;
    }

    setSaving(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Diubah', 'Password akun berhasil diperbarui.');
    } catch (error) {
      Alert.alert(
        'Gagal Mengubah Password',
        error instanceof Error ? error.message : 'Coba lagi.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Ubah Password</Text>
      <Text style={styles.sectionDesc}>
        Gunakan kombinasi huruf, angka, dan simbol agar akun lebih aman.
      </Text>

      <LabeledInput
        label="Password Lama"
        value={oldPassword}
        onChangeText={setOldPassword}
        placeholder="Masukkan password lama"
        secureTextEntry
        autoCapitalize="none"
      />
      <LabeledInput
        label="Password Baru"
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder={`Minimal ${MIN_LENGTH} karakter`}
        secureTextEntry
        autoCapitalize="none"
      />
      <LabeledInput
        label="Konfirmasi Password Baru"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Ulangi password baru"
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        activeOpacity={0.85}
        disabled={saving}
        onPress={() => void handleSubmit()}>
        {saving ? (
          <ActivityIndicator color={Colors.onPrimary} size="small" />
        ) : (
          <Text style={styles.saveText}>Ubah Password</Text>
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
});
