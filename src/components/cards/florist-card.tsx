import { Image } from 'expo-image';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, Fonts, Radius, ShadowSoft, Spacing } from '@/constants/theme';

interface FloristCardProps {
  name: string;
  location: string;
  distance: string;
  avatar: string;
  avatarAlt: string;
  style?: StyleProp<ViewStyle>;
}

export default function FloristCard({
  name,
  location,
  distance,
  avatar,
  avatarAlt,
  style,
}: FloristCardProps) {
  return (
    <View style={[styles.card, style]}>
      {/* Info florist */}
      <View style={styles.infoRow}>
        <Image
          source={{ uri: avatar }}
          style={styles.avatar}
          contentFit="cover"
          accessibilityLabel={avatarAlt}
          transition={200}
        />
        <View style={styles.infoText}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {location} • {distance} away
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Visit Shop</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    padding: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.outlineVariant,
    ...ShadowSoft,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.onSurface,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.outline,
  },
  button: {
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.secondary,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.secondary,
  },
});
