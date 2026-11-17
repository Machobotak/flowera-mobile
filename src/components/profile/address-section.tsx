/**
 * Tab "Alamat" — daftar alamat user + aksi tambah/ubah/hapus.
 * Format tampilan mengikuti web:
 *   alamat, Kel. kelurahan, Kec. kecamatan, kota, Prov. provinsi, kode pos
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AddressFormModal from '@/components/profile/address-form-modal';
import { Colors, Fonts, Radius, ShadowSoft, Spacing } from '@/constants/theme';
import { deleteAddress, listAddresses } from '@/data/address/address-api';
import type { UserAddress } from '@/data/address/types';

function formatAddress(address: UserAddress): string {
  return [
    address.address,
    address.subdistrict_name ? `Kel. ${address.subdistrict_name}` : null,
    address.district_name ? `Kec. ${address.district_name}` : null,
    address.city_name,
    address.province_name ? `Prov. ${address.province_name}` : null,
    address.zip_code,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ');
}

export default function AddressSection(): React.JSX.Element {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /** Dipakai setelah simpan/hapus: status loading boleh diset sinkron karena
     dipanggil dari event handler, bukan effect. */
  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setAddresses(await listAddresses());
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Gagal memuat alamat.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listAddresses()
      .then((data) => {
        if (active) setAddresses(data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Gagal memuat alamat.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openCreate = (): void => {
    setEditing(null);
    setFormVisible(true);
  };

  const openEdit = (address: UserAddress): void => {
    setEditing(address);
    setFormVisible(true);
  };

  const closeForm = (): void => {
    setFormVisible(false);
    setEditing(null);
  };

  const handleDelete = (address: UserAddress): void => {
    Alert.alert(
      'Hapus Alamat',
      `Hapus alamat untuk ${address.nama_penerima}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            setDeletingId(address.id);
            deleteAddress(address.id)
              .then(() => reload())
              .catch((deleteError: unknown) => {
                Alert.alert(
                  'Gagal Menghapus Alamat',
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Coba lagi.',
                );
              })
              .finally(() => setDeletingId(null));
          },
        },
      ],
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.sectionTitle}>Alamat Saya</Text>
            <Text style={styles.sectionDesc}>
              Alamat pengiriman yang tersimpan di akun kamu
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={openCreate}
            accessibilityRole="button">
            <MaterialIcons name="add" size={18} color={Colors.onPrimary} />
            <Text style={styles.addText}>Tambah</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.stateText}>Memuat alamat...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void reload()}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.stateBox}>
            <MaterialIcons
              name="location-off"
              size={36}
              color={Colors.outlineVariant}
            />
            <Text style={styles.stateText}>
              Belum ada alamat tersimpan. Tambahkan alamat pengiriman pertama
              kamu.
            </Text>
            <TouchableOpacity style={styles.outlineButton} onPress={openCreate}>
              <Text style={styles.outlineText}>Tambah Alamat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.addressNameRow}>
                  <MaterialIcons
                    name="location-on"
                    size={18}
                    color={Colors.primary}
                  />
                  <Text style={styles.addressName}>{address.nama_penerima}</Text>
                </View>
                <Text style={styles.addressPhone}>{address.no_hp}</Text>
              </View>

              <Text style={styles.addressText}>{formatAddress(address)}</Text>

              {address.note ? (
                <Text style={styles.noteText}>Catatan: {address.note}</Text>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEdit(address)}
                  disabled={deletingId === address.id}>
                  <MaterialIcons name="edit" size={16} color={Colors.primary} />
                  <Text style={styles.actionText}>Ubah</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(address)}
                  disabled={deletingId === address.id}>
                  {deletingId === address.id ? (
                    <ActivityIndicator size="small" color={Colors.error} />
                  ) : (
                    <MaterialIcons
                      name="delete-outline"
                      size={16}
                      color={Colors.error}
                    />
                  )}
                  <Text style={[styles.actionText, styles.deleteText]}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {formVisible ? (
        <AddressFormModal
          address={editing}
          onClose={closeForm}
          onSaved={() => void reload()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
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
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two,
  },
  addText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onPrimary,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    ...ShadowSoft,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flex: 1,
  },
  addressName: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  addressPhone: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  addressText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
  },
  noteText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.outline,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.five,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.half,
  },
  actionText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  deleteText: {
    color: Colors.error,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.six,
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
  outlineButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  outlineText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});
