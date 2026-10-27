/**
 * Modal kamera untuk foto profil (expo-camera).
 *
 * Alur:
 *   buka modal → izin kamera diminta otomatis → preview kamera → jepret →
 *   pratinjau hasil → "Simpan Foto" (app + galeri) / "Ambil Ulang".
 *
 * CameraView hanya dipasang saat preview dibutuhkan; begitu foto diambil
 * komponen kamera dilepas (expo hanya mendukung satu preview aktif).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { savePhotoToLibrary, saveProfilePhoto } from '@/profile/photo-storage';

interface CameraCaptureModalProps {
  visible: boolean;
  userId: number;
  onClose(): void;
  onSaved(uri: string): void;
}

export default function CameraCaptureModal({
  visible,
  userId,
  onClose,
  onSaved,
}: CameraCaptureModalProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission, getPermission] =
    useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  // Cegah permintaan izin berulang tiap kali `visible`/permission berubah.
  const hasRequestedRef = useRef(false);

  const [cameraSession, setCameraSession] = useState(0);
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = (): void => {
    setCapturedUri(null);
    setFacing('back');
    setCameraReady(false);
    hasRequestedRef.current = false;
    onClose();
  };

  // Status izin di pengaturan perangkat bisa berubah saat app di background;
  // hook tidak memperbaruinya sendiri, jadi baca ulang tiap modal dibuka dan
  // tiap app kembali aktif. Tanpa ini, izin yang baru diaktifkan tetap
  // terlihat "ditolak" dan kamera tidak pernah muncul.
  useEffect(() => {
    if (!visible) {
      return;
    }

    void getPermission();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Izin bisa dicabut/diaktifkan saat app di background. Baca ulang
        // statusnya dan pasang sesi kamera baru: sesi lama bisa mati setelah
        // izin diubah dari pengaturan perangkat.
        void getPermission();
        setCameraReady(false);
        setCameraSession((session) => session + 1);
      }
    });

    return () => subscription.remove();
  }, [visible, getPermission]);

  // Permintaan akses kamera di awal, sebelum preview ditampilkan.
  useEffect(() => {
    if (
      !visible ||
      !permission ||
      permission.granted ||
      !permission.canAskAgain ||
      hasRequestedRef.current
    ) {
      return;
    }
    hasRequestedRef.current = true;
    void requestPermission();
  }, [visible, permission, requestPermission]);

  const handleCapture = async (): Promise<void> => {
    const camera = cameraRef.current;
    if (!camera || !cameraReady || isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await camera.takePictureAsync({ quality: 0.85 });
      setCapturedUri(
        Platform.OS === 'web' && !photo.uri.startsWith('data:')
          ? `data:image/jpeg;base64,${photo.uri}`
          : photo.uri,
      );
    } catch (error) {
      console.warn('[profile] gagal mengambil foto', error);
      Alert.alert('Gagal Ambil Foto', 'Kamera belum siap. Coba lagi.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!capturedUri || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const savedUri = saveProfilePhoto(capturedUri, userId);
      const savedToGallery = await savePhotoToLibrary(savedUri);
      onSaved(savedUri);
      handleClose();
      Alert.alert(
        'Foto Tersimpan',
        savedToGallery
          ? 'Foto profil dipasang dan salinannya masuk ke galeri.'
          : 'Foto profil dipasang. Salinan ke galeri tidak tersedia.',
      );
    } catch (error) {
      console.warn('[profile] gagal menyimpan foto', error);
      Alert.alert('Gagal Menyimpan Foto', 'Coba ambil foto sekali lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionAction = (): void => {
    if (permission?.canAskAgain || Platform.OS === 'web') {
      void requestPermission();
      return;
    }
    void Linking.openSettings();
  };

  const permissionActionLabel = permission?.canAskAgain
    ? 'Izinkan Kamera'
    : Platform.OS === 'web'
      ? 'Coba Lagi'
      : 'Buka Pengaturan';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.onPrimary} />
            <Text style={styles.permissionMessage}>Menyiapkan kamera…</Text>
          </View>
        ) : !permission.granted ? (
          <View
            style={[
              styles.centered,
              { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}>
            <View style={styles.permissionIcon}>
              <MaterialIcons
                name="no-photography"
                size={40}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.permissionTitle}>Izin Kamera Dibutuhkan</Text>
            <Text style={styles.permissionMessage}>
              {permission.canAskAgain
                ? 'Flowera perlu akses kamera untuk mengambil foto profil.'
                : 'Izin kamera ditolak. Aktifkan lewat pengaturan perangkat.'}
            </Text>

            <TouchableOpacity
              style={styles.primaryAction}
              activeOpacity={0.85}
              onPress={handlePermissionAction}>
              <MaterialIcons
                name={permission.canAskAgain ? 'photo-camera' : 'settings'}
                size={20}
                color={Colors.onPrimary}
              />
              <Text style={styles.actionText}>{permissionActionLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={handleClose}>
              <Text style={styles.cancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        ) : capturedUri ? (
          <View style={styles.preview}>
            <Image
              source={{ uri: capturedUri }}
              style={styles.previewImage}
              contentFit="contain"
              transition={150}
            />
            <View
              style={[
                styles.previewActions,
                { paddingBottom: insets.bottom + Spacing.five },
              ]}>
              <TouchableOpacity
                style={styles.secondaryAction}
                activeOpacity={0.85}
                disabled={isSaving}
                onPress={() => {
                  setCameraReady(false);
                  setCapturedUri(null);
                }}>
                <MaterialIcons
                  name="replay"
                  size={20}
                  color={Colors.onPrimary}
                />
                <Text style={styles.actionText}>Ambil Ulang</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryAction}
                activeOpacity={0.85}
                disabled={isSaving}
                onPress={handleSave}>
                {isSaving ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <MaterialIcons
                    name="save"
                    size={20}
                    color={Colors.onPrimary}
                  />
                )}
                <Text style={styles.actionText}>
                  {isSaving ? 'Menyimpan…' : 'Simpan Foto'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              key={cameraSession}
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              onCameraReady={() => setCameraReady(true)}
            />

            <View
              style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Tutup kamera"
                onPress={handleClose}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={Colors.onPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Balik kamera"
                onPress={() => {
                  setCameraReady(false);
                  setFacing((current) =>
                    current === 'back' ? 'front' : 'back',
                  );
                }}>
                <MaterialIcons
                  name="flip-camera-ios"
                  size={24}
                  color={Colors.onPrimary}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.shutterBar,
                { paddingBottom: insets.bottom + Spacing.five },
              ]}>
              <TouchableOpacity
                style={[
                  styles.shutter,
                  (!cameraReady || isCapturing) && styles.shutterDisabled,
                ]}
                activeOpacity={0.85}
                disabled={!cameraReady || isCapturing}
                accessibilityRole="button"
                accessibilityLabel="Ambil foto"
                onPress={handleCapture}>
                {isCapturing ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginBottom: Spacing.two,
  },
  permissionTitle: {
    fontFamily: Fonts.headline,
    fontSize: 24,
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  permissionMessage: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.onPrimary,
    opacity: 0.75,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  cancelText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.onPrimary,
    opacity: 0.7,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.onPrimary,
  },
  actionText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  cameraContainer: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  shutterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.onPrimary,
  },
  preview: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
});
