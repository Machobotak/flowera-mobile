/**
 * Modal pemilih wilayah — pengganti `<select>` web.
 *
 * Daftar provinsi/kota/kecamatan/kelurahan bisa panjang (kelurahan per
 * kecamatan ratusan), jadi selalu ada kolom pencarian. Hasil pencarian
 * dibatasi 300 baris agar render tetap ringan; user mempersempit dengan kata
 * kunci.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Radius, ShadowFloat, Spacing } from '@/constants/theme';
import type { Region } from '@/data/regions/regions-api';

const MAX_RESULTS = 300;

interface RegionPickerModalProps {
  visible: boolean;
  title: string;
  items: Region[];
  loading: boolean;
  selectedId: string;
  onClose: () => void;
  onSelect: (region: Region) => void;
}

export default function RegionPickerModal({
  visible,
  title,
  items,
  loading,
  selectedId,
  onClose,
  onSelect,
}: RegionPickerModalProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items.slice(0, MAX_RESULTS);

    return items
      .filter((item) => item.name.toLowerCase().includes(needle))
      .slice(0, MAX_RESULTS);
  }, [items, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup daftar wilayah">
              <MaterialIcons name="close" size={20} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrapper}>
            <MaterialIcons name="search" size={20} color={Colors.outline} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cari wilayah..."
              placeholderTextColor={Colors.outline}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <MaterialIcons name="cancel" size={18} color={Colors.outline} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.stateText}>Memuat data wilayah...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.stateBox}>
              <MaterialIcons
                name="search-off"
                size={32}
                color={Colors.outlineVariant}
              />
              <Text style={styles.stateText}>
                {items.length === 0
                  ? 'Wilayah belum tersedia.'
                  : 'Wilayah tidak ditemukan.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              initialNumToRender={16}
              windowSize={7}
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    style={[styles.item, selected && styles.itemSelected]}
                    activeOpacity={0.75}
                    onPress={() => onSelect(item)}>
                    <Text
                      style={[styles.itemText, selected && styles.itemTextSelected]}>
                      {item.name}
                    </Text>
                    {selected ? (
                      <MaterialIcons
                        name="check"
                        size={18}
                        color={Colors.primary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(32, 26, 27, 0.45)',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    ...ShadowFloat,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.outlineVariant,
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  title: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 20,
    color: Colors.onSurface,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    marginBottom: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.onSurface,
    paddingVertical: Spacing.two + 2,
  },
  list: {
    flexGrow: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
  },
  itemSelected: {
    backgroundColor: Colors.primaryFixed,
  },
  itemText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.onSurface,
    paddingRight: Spacing.two,
  },
  itemTextSelected: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.onPrimaryContainer,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.seven,
  },
  stateText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
