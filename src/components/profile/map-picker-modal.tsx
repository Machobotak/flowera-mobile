/**
 * Pemilih titik di peta — pengganti `expo-location.reverseGeocodeAsync` yang
 * dihapus di web sejak SDK 49.
 *
 * Peta digambar manual dari ubin OpenStreetMap (256 px) yang diposisikan
 * relatif terhadap titik tengah. Pin selalu di tengah layar; user menggeser
 * peta di bawahnya. Tidak ada modul native (`react-native-maps`/`expo-maps`
 * butuh development build + API key Google), jadi komponen ini berjalan sama
 * di Android dan web dengan responder View + `expo-image`.
 *
 * Komponen ini hanya menghasilkan koordinat; pemanggil yang melakukan reverse
 * geocoding lewat Regions API. Dipasang hanya saat terbuka (parent me-mount
 * ulang), jadi `initial` cukup dibaca sekali sebagai state awal.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, MarginMobile, Radius, Spacing } from '@/constants/theme';

const TILE_SIZE = 256;
const MIN_ZOOM = 15;
const MAX_ZOOM = 18;
const ATTRIBUTION = '© OpenStreetMap contributors';
/**
 * OSM memblokir request ber-User-Agent default library (Glide/`okhttp`) dengan
 * gambar "Access blocked", jadi ubin native wajib membawa identitas aplikasi.
 * Di web browser sudah mengirim UA-nya sendiri dan header ini dilarang `fetch`,
 * jadi hanya dipasang di native.
 * https://operations.osmfoundation.org/policies/tiles/#34-apps-library-defaults--software-development-kits-identification-required
 */
const TILE_HEADERS: Record<string, string> | undefined =
  Platform.OS === 'web'
    ? undefined
    : { 'User-Agent': 'FloweraMobile/1.0 (com.anonymous.flowera)' };
/** Jakarta — titik awal kalau lokasi terakhir perangkat tidak tersedia. */
const FALLBACK_CENTER = { latitude: -6.2, longitude: 106.8167 };
const MAX_LATITUDE = 85.05112878;

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface MapPickerModalProps {
  initial: MapCoordinates | null;
  onClose: () => void;
  onConfirm: (coordinates: MapCoordinates) => Promise<void>;
}

function worldSize(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}

function toWorldPixel(latitude: number, longitude: number, zoom: number) {
  const size = worldSize(zoom);
  const clampedLat = Math.max(Math.min(latitude, MAX_LATITUDE), -MAX_LATITUDE);
  const rad = (clampedLat * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * size,
  };
}

function fromWorldPixel(x: number, y: number, zoom: number): MapCoordinates {
  const size = worldSize(zoom);
  const longitude = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return {
    latitude: Math.max(Math.min(latitude, MAX_LATITUDE), -MAX_LATITUDE),
    longitude,
  };
}

/** Geser peta sejauh `dx`/`dy` px: titik tengah bergerak ke arah berlawanan. */
function shiftCenter(
  center: MapCoordinates,
  dx: number,
  dy: number,
  zoom: number,
): MapCoordinates {
  const size = worldSize(zoom);
  const point = toWorldPixel(center.latitude, center.longitude, zoom);
  const x = (((point.x - dx) % size) + size) % size;
  const y = Math.max(Math.min(point.y - dy, size - 1), 0);
  return fromWorldPixel(x, y, zoom);
}

interface Tile {
  key: string;
  left: number;
  top: number;
  url: string;
}

export default function MapPickerModal({
  initial,
  onClose,
  onConfirm,
}: MapPickerModalProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const [center, setCenter] = useState<MapCoordinates>(
    initial ?? FALLBACK_CENTER,
  );
  const [zoom, setZoom] = useState(16);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [submitting, setSubmitting] = useState(false);

  /* Titik sentuh terakhir. Ref hanya disentuh di handler gesture, tidak
     pernah saat render, jadi tidak perlu memicu render. */
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const handleGrant = (event: GestureResponderEvent): void => {
    lastPoint.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
  };

  const handleMove = (event: GestureResponderEvent): void => {
    const last = lastPoint.current;
    if (!last) return;

    const { pageX, pageY } = event.nativeEvent;
    const dx = pageX - last.x;
    const dy = pageY - last.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    lastPoint.current = { x: pageX, y: pageY };
    setCenter((current) => shiftCenter(current, dx, dy, zoom));
  };

  const handleRelease = (): void => {
    lastPoint.current = null;
  };

  const tiles = useMemo<Tile[]>(() => {
    if (layout.width <= 0 || layout.height <= 0) return [];

    const size = 2 ** zoom;
    const origin = toWorldPixel(center.latitude, center.longitude, zoom);
    const left = origin.x - layout.width / 2;
    const top = origin.y - layout.height / 2;
    const result: Tile[] = [];

    for (
      let x = Math.floor(left / TILE_SIZE);
      x <= Math.floor((left + layout.width) / TILE_SIZE);
      x += 1
    ) {
      for (
        let y = Math.floor(top / TILE_SIZE);
        y <= Math.floor((top + layout.height) / TILE_SIZE);
        y += 1
      ) {
        if (y < 0 || y >= size) continue;
        const wrappedX = ((x % size) + size) % size;
        result.push({
          key: `${zoom}/${x}/${y}`,
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        });
      }
    }

    return result;
  }, [center.latitude, center.longitude, zoom, layout.height, layout.width]);

  const handleLayout = (event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  const changeZoom = (delta: number): void => {
    setZoom((current) =>
      Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + delta)),
    );
  };

  const handleConfirm = async (): Promise<void> => {
    setSubmitting(true);
    try {
      await onConfirm(center);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup peta">
            <MaterialIcons name="close" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.title}>Pilih Titik di Peta</Text>
        </View>

        <View
          style={styles.mapArea}
          onLayout={handleLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleGrant}
          onResponderMove={handleMove}
          onResponderRelease={handleRelease}
          onResponderTerminate={handleRelease}>
          {tiles.map((tile) => (
            <Image
              key={tile.key}
              /* `cacheKey` ber-versi: ubin "Access blocked" yang sempat
                 tersimpan (sebelum header UA dipasang) tidak pernah dipakai
                 ulang, tanpa mengubah URL yang diwajibkan OSM. */
              source={{
                uri: tile.url,
                headers: TILE_HEADERS,
                cacheKey: `osm-standard/${tile.key}`,
              }}
              style={[styles.tile, { left: tile.left, top: tile.top }]}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
              pointerEvents="none"
            />
          ))}

          <View style={styles.pin} pointerEvents="none">
            <MaterialIcons name="place" size={44} color={Colors.primary} />
          </View>

          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => changeZoom(1)}
              disabled={zoom >= MAX_ZOOM}
              accessibilityRole="button"
              accessibilityLabel="Perbesar peta">
              <MaterialIcons name="add" size={22} color={Colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => changeZoom(-1)}
              disabled={zoom <= MIN_ZOOM}
              accessibilityRole="button"
              accessibilityLabel="Perkecil peta">
              <MaterialIcons name="remove" size={22} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          <Text style={styles.attribution} pointerEvents="none">
            {ATTRIBUTION}
          </Text>
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + Spacing.three },
          ]}>
          <Text style={styles.hint}>
            Geser peta sampai pin tepat di lokasi alamat kamu.
          </Text>
          <Text style={styles.coordinates}>
            {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
          </Text>
          <TouchableOpacity
            style={[styles.confirmButton, submitting && styles.buttonDisabled]}
            activeOpacity={0.85}
            disabled={submitting}
            onPress={() => void handleConfirm()}>
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <Text style={styles.confirmText}>Gunakan titik ini</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: MarginMobile,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 20,
    color: Colors.onSurface,
  },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceVariant,
    /* Web: jangan biarkan browser memulai drag gambar/teks saat peta digeser. */
    ...(Platform.OS === 'web'
      ? ({ touchAction: 'none', userSelect: 'none' } as ViewStyle)
      : null),
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  pin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -22,
    marginTop: -40,
  },
  zoomControls: {
    position: 'absolute',
    right: Spacing.three,
    top: Spacing.three,
    gap: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
  },
  attribution: {
    position: 'absolute',
    left: Spacing.two,
    bottom: Spacing.two,
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.half + 2,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  footer: {
    gap: Spacing.two,
    paddingHorizontal: MarginMobile,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  coordinates: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.secondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
});
