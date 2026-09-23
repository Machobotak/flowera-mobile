import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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

interface ProductCardProps {
  name: string;
  florist: string;
  price: string;
  rating: string;
  location: string;
  sold: string;
  image: string;
  imageAlt: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function ProductCard({
  name,
  florist,
  price,
  rating,
  location,
  sold,
  image,
  imageAlt,
  onPress,
  style,
}: ProductCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.85}
      onPress={onPress}>
      {/* Gambar */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: image }}
          style={styles.image}
          contentFit="cover"
          accessibilityLabel={imageAlt}
          transition={200}
        />
        {/* Di web tombol ini muncul saat hover; di mobile selalu tampil. */}
        <TouchableOpacity
          style={styles.favoriteButton}
          activeOpacity={0.7}
          onPress={(e) => e.stopPropagation()}>
          <MaterialIcons name="favorite" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* Detail */}
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        <View style={styles.floristRow}>
          <MaterialIcons name="verified" size={14} color={Colors.secondary} />
          <Text style={styles.florist} numberOfLines={1}>
            {florist}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{price}</Text>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={14} color={Colors.star} />
            <Text style={styles.rating}>{rating}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons
              name="location-on"
              size={12}
              color={Colors.outline}
            />
            <Text style={styles.metaText} numberOfLines={1}>
              {location}
            </Text>
          </View>
          <Text style={styles.metaText}>{sold}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...ShadowSoft,
  },
  imageWrapper: {
    aspectRatio: 1,
    backgroundColor: Colors.surfaceContainer,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    padding: Spacing.one,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: Radius.full,
  },
  details: {
    padding: Spacing.two + 4,
    gap: Spacing.one,
  },
  name: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 16,
    color: Colors.onSurface,
  },
  floristRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  florist: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  price: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.onSurface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
    marginTop: Spacing.half,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.outline,
  },
});
