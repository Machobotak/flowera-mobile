/**
 * Screen Login (`/login`) — prototype auth lokal.
 * Padanan `app/(auth)/login/page.tsx` web: email + password, redirect ke Home.
 */

import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FormField from '@/components/auth/form-field';
import PrimaryButton from '@/components/auth/primary-button';
import { useAuth } from '@/auth/auth-context';
import { Colors, Fonts, MarginMobile, StackMd } from '@/constants/theme';
import { validateEmail, validatePassword } from '@/data/auth/validation';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { registered } = useLocalSearchParams<{ registered?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    const errors: FieldErrors = {};
    if (email.trim().length === 0) {
      errors.email = 'Email wajib diisi';
    } else {
      const emailError = validateEmail(email);
      if (emailError) errors.email = emailError;
    }
    if (password.length === 0) {
      errors.password = 'Password wajib diisi';
    } else {
      const passwordError = validatePassword(password);
      if (passwordError) errors.password = passwordError;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.replace('/');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Login gagal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <Text style={styles.title}>Selamat Datang Kembali</Text>
              <Text style={styles.subtitle}>
                Masuk ke akun kamu untuk melanjutkan belanja bunga.
              </Text>
            </View>

            {registered === '1' ? (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>
                  Registrasi berhasil. Silakan masuk.
                </Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <FormField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="nama@email.com"
                icon="mail"
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors.email}
              />
              <FormField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password"
                icon="lock"
                secureTextEntry
                error={fieldErrors.password}
              />

              {formError ? (
                <Text style={styles.formError}>{formError}</Text>
              ) : null}

              <PrimaryButton
                label="Masuk"
                onPress={handleSubmit}
                loading={submitting}
              />
            </View>

            <Text style={styles.footer}>
              Belum punya akun?{' '}
              <Link href="/register" style={styles.link}>
                Daftar sekarang
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: MarginMobile,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: StackMd,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    height: 28,
    width: 198,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: 28,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  successText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSecondary,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  formError: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  footer: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  link: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.primary,
  },
});
