/**
 * Input berlabel untuk form profil & alamat.
 * Gaya mengikuti input web: surface-container-low, border outline-variant,
 * radius 12, label kecil di atas field.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

interface LabeledInputProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  editable?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
}

export default function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  editable = true,
  multiline,
  maxLength,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
}: LabeledInputProps): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.outline}
        style={[
          styles.input,
          multiline === true && styles.inputMultiline,
          !editable && styles.inputReadonly,
        ]}
        editable={editable}
        multiline={multiline}
        maxLength={maxLength}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        textAlignVertical={multiline === true ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.half + 2,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  required: {
    color: Colors.error,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two + 2,
  },
  inputMultiline: {
    minHeight: 76,
    paddingTop: Spacing.two + 2,
  },
  inputReadonly: {
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
  },
});
