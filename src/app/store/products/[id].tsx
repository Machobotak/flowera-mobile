/**
 * Form produk seller (tambah & ubah) + pengelolaan gambar, varian, add-on.
 *
 * Kontrak backend:
 *   - `POST /seller/product/create` body `{name,description,isLifeFlower,price,
 *     sub_product_categories_id,weight}` → `{data:{id}}`
 *   - `PUT /seller/product/update?product=<id>` — backend hanya memakai
 *     name/slug/description/price/isLifeFlower; kategori & berat diabaikan.
 *   - `POST /seller/product/:id/images` multipart field `files`
 *   - `POST /seller/product/images/default/:imageId`
 *   - Varian: `/seller/product-variant/*` (multipart field `variants`)
 *   - Add-on: `/seller/addon-product/*` (multipart field `addon`)
 *
 * Parameter `id` = `new` untuk produk baru, selain itu numerik. Kategori hanya
 * diminta saat membuat produk karena `GET /seller/product` tidak
 * mengembalikan kategori dan update mengabaikannya.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PhotoCaptureModal from '@/components/media/photo-capture-modal';
import LabeledInput from '@/components/profile/labeled-input';
import {
  SellerAccessGate,
  SellerHeader,
  SellerState,
} from '@/components/seller/seller-ui';
import {
  Colors,
  Fonts,
  MarginMobile,
  Radius,
  Spacing,
} from '@/constants/theme';
import {
  createSellerAddon,
  createSellerProduct,
  createSellerVariant,
  deleteSellerAddon,
  deleteSellerVariant,
  fetchProductVariantAddon,
  fetchSellerProducts,
  fetchSubCategories,
  setSellerProductDefaultImage,
  updateSellerAddon,
  updateSellerProduct,
  updateSellerVariant,
  uploadSellerProductImages,
  type ProductCategory,
  type SellerAddon,
  type SellerProduct,
  type SellerVariant,
} from '@/data/seller/seller-product-api';
import { formatRupiah } from '@/utils/format';

type ItemEditorState =
  | { kind: 'variant'; item: SellerVariant | null }
  | { kind: 'addon'; item: SellerAddon | null };

export default function SellerProductFormScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const parsedId = Number(params.id);
  const productId =
    params.id && params.id !== 'new' && Number.isFinite(parsedId)
      ? parsedId
      : null;
  const isNew = productId === null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [isLifeFlower, setIsLifeFlower] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [images, setImages] = useState<SellerProduct['images']>([]);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<SellerVariant[]>([]);
  const [addons, setAddons] = useState<SellerAddon[]>([]);

  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editor, setEditor] = useState<ItemEditorState | null>(null);
  const [relatedWarning, setRelatedWarning] = useState<string | null>(null);

  /* ─────────────── Muat data awal ─────────────── */

  useEffect(() => {
    let active = true;

    fetchSubCategories()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        /* Kategori hanya wajib saat create; error ditampilkan di form. */
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isNew || productId === null) return undefined;

    let active = true;
    Promise.all([
      fetchSellerProducts(),
      fetchProductVariantAddon(productId).catch((relatedError) => {
        if (active) {
          setRelatedWarning(
            relatedError instanceof Error
              ? relatedError.message
              : 'Gagal memuat varian & add-on.',
          );
        }
        return { variants: [], addons: [] };
      }),
    ])
      .then(([products, related]) => {
        if (!active) return;
        const found = products.find((product) => product.id === productId);
        if (!found) throw new Error('Produk tidak ditemukan di toko ini.');

        setName(found.name);
        setDescription(found.description);
        setPrice(String(found.price));
        setWeight(found.weight > 0 ? String(found.weight) : '');
        setIsLifeFlower(found.isLifeFlower);
        setImages(found.images);
        setVariants(related.variants);
        setAddons(related.addons);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Gagal memuat produk.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isNew, productId, reloadToken]);

  const retryLoad = useCallback((): void => {
    setLoading(true);
    setError(null);
    setRelatedWarning(null);
    setReloadToken((token) => token + 1);
  }, []);

  const refreshImages = useCallback(async () => {
    if (productId === null) return;
    try {
      const products = await fetchSellerProducts();
      const found = products.find((product) => product.id === productId);
      if (found) setImages(found.images);
    } catch (refreshError) {
      Alert.alert(
        'Gagal Memuat Gambar',
        refreshError instanceof Error ? refreshError.message : 'Coba lagi.',
      );
    }
  }, [productId]);

  const refreshRelated = useCallback(async () => {
    if (productId === null) return;
    try {
      const related = await fetchProductVariantAddon(productId);
      setVariants(related.variants);
      setAddons(related.addons);
      setRelatedWarning(null);
    } catch (refreshError) {
      setRelatedWarning(
        refreshError instanceof Error
          ? refreshError.message
          : 'Gagal memuat varian & add-on.',
      );
    }
  }, [productId]);

  /* ─────────────── Gambar ─────────────── */

  const handleCaptured = async (uri: string): Promise<void> => {
    if (isNew) {
      setPendingImages((prev) => [...prev, uri]);
      return;
    }
    if (productId === null) return;

    setUploading(true);
    try {
      await uploadSellerProductImages(productId, [uri]);
      await refreshImages();
    } finally {
      setUploading(false);
    }
  };

  const handleSetDefault = (imageId: number): void => {
    if (productId === null) return;
    setSellerProductDefaultImage(imageId, productId)
      .then(refreshImages)
      .catch((defaultError) => {
        Alert.alert(
          'Gagal Menjadikan Foto Utama',
          defaultError instanceof Error ? defaultError.message : 'Coba lagi.',
        );
      });
  };

  /* ─────────────── Simpan produk ─────────────── */

  const handleSave = async (): Promise<void> => {
    const trimmedName = name.trim();
    const priceValue = Number(price.replace(/[^\d]/g, ''));
    const weightValue = Number(weight.replace(/[^\d]/g, '')) || 0;

    if (trimmedName.length < 3) {
      Alert.alert('Nama Produk', 'Nama produk minimal 3 karakter.');
      return;
    }
    if (!priceValue || priceValue <= 0) {
      Alert.alert('Harga Produk', 'Isi harga produk lebih dari 0.');
      return;
    }
    if (isNew && categoryId === null) {
      Alert.alert('Kategori', 'Pilih kategori produk terlebih dahulu.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const newId = await createSellerProduct({
          name: trimmedName,
          description: description.trim(),
          price: priceValue,
          weight: weightValue,
          isLifeFlower,
          subCategoryId: categoryId ?? undefined,
        });

        let uploadFailed = false;
        if (pendingImages.length > 0) {
          try {
            await uploadSellerProductImages(newId, pendingImages);
          } catch {
            uploadFailed = true;
          }
        }

        Alert.alert(
          'Produk Dibuat',
          uploadFailed
            ? 'Produk tersimpan, tetapi foto gagal diunggah. Coba unggah lagi dari halaman produk.'
            : 'Produk berhasil ditambahkan ke toko.',
        );
        router.replace({
          pathname: '/store/products/[id]',
          params: { id: String(newId) },
        });
        return;
      }

      if (productId === null) return;
      await updateSellerProduct(productId, {
        name: trimmedName,
        description: description.trim(),
        price: priceValue,
        weight: weightValue,
        isLifeFlower,
      });
      await refreshImages();
      Alert.alert('Produk Diperbarui', 'Perubahan produk sudah disimpan.');
    } catch (saveError) {
      Alert.alert(
        'Gagal Menyimpan',
        saveError instanceof Error ? saveError.message : 'Coba lagi.',
      );
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────── Varian & add-on ─────────────── */

  const handleSubmitItem = async (
    payload: {
      title: string;
      subTitle: string;
      price: number;
      imageUri: string | null;
    },
    target: ItemEditorState,
  ): Promise<void> => {
    if (productId === null) return;

    if (target.kind === 'variant') {
      if (target.item) {
        await updateSellerVariant(target.item.id, productId, payload);
      } else {
        await createSellerVariant(productId, payload);
      }
    } else if (target.item) {
      await updateSellerAddon(target.item.id, productId, {
        title: payload.title,
        price: payload.price,
        imageUri: payload.imageUri,
      });
    } else {
      await createSellerAddon(productId, {
        title: payload.title,
        price: payload.price,
        imageUri: payload.imageUri,
      });
    }

    setEditor(null);
    await refreshRelated();
  };

  const handleDeleteItem = (target: ItemEditorState): void => {
    const isVariant = target.kind === 'variant';
    const item = target.item;
    if (!item) return;

    Alert.alert(
      `Hapus ${isVariant ? 'Varian' : 'Add-on'}`,
      `Hapus "${item.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            const request = isVariant
              ? deleteSellerVariant(item.id)
              : deleteSellerAddon(item.id);

            request
              .then(refreshRelated)
              .catch((deleteError) => {
                Alert.alert(
                  'Gagal Menghapus',
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Coba lagi.',
                );
              });
          },
        },
      ],
    );
  };

  const priceValue = Number(price.replace(/[^\d]/g, ''));
  const imageCount = isNew ? pendingImages.length : images.length;

  return (
    <SellerAccessGate title={isNew ? 'Tambah Produk' : 'Ubah Produk'}>
      <View style={styles.screen}>
        <SellerHeader
          title={isNew ? 'Tambah Produk' : 'Ubah Produk'}
          subtitle={
            isNew
              ? 'Lengkapi detail buket atau tanamanmu'
              : 'Perbarui informasi dan foto produk'
          }
        />

        {loading ? (
          <SellerState loading message="Memuat produk…" />
        ) : error ? (
          <SellerState
            icon="error-outline"
            title="Gagal Memuat"
            message={error}
            actionLabel="Coba Lagi"
            onAction={retryLoad}
          />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.seven },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <LabeledInput
                label="Nama Produk"
                value={name}
                onChangeText={setName}
                placeholder="mis. Buket Mawar Merah"
                maxLength={120}
                required
              />
              <LabeledInput
                label="Deskripsi"
                value={description}
                onChangeText={setDescription}
                placeholder="Ceritakan keunikan produkmu"
                multiline
                maxLength={500}
              />
              <LabeledInput
                label="Harga (Rp)"
                value={price}
                onChangeText={setPrice}
                placeholder="150000"
                keyboardType="number-pad"
                required
              />
              {priceValue > 0 ? (
                <Text style={styles.helper}>{formatRupiah(priceValue)}</Text>
              ) : null}
              <LabeledInput
                label="Berat (gram)"
                value={weight}
                onChangeText={setWeight}
                placeholder="1000"
                keyboardType="number-pad"
              />
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchLabel}>Bunga Segar</Text>
                  <Text style={styles.switchHint}>
                    Tandai bila produk dibuat dari bunga asli.
                  </Text>
                </View>
                <Switch
                  value={isLifeFlower}
                  onValueChange={setIsLifeFlower}
                  trackColor={{
                    false: Colors.surfaceVariant,
                    true: Colors.primaryContainer,
                  }}
                  thumbColor={isLifeFlower ? Colors.primary : Colors.surface}
                />
              </View>
            </View>

            {isNew ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Kategori <Text style={styles.required}>*</Text>
                </Text>
                {categories.length === 0 ? (
                  <Text style={styles.helper}>Memuat kategori…</Text>
                ) : (
                  <View style={styles.chipWrap}>
                    {categories.map((category) => {
                      const active = categoryId === category.id;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          activeOpacity={0.8}
                          style={[
                            styles.chip,
                            active && styles.chipActive,
                          ]}
                          onPress={() => setCategoryId(category.id)}>
                          <Text
                            style={[
                              styles.chipLabel,
                              active && styles.chipLabelActive,
                            ]}>
                            {category.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Foto Produk</Text>
                <Text style={styles.helper}>{imageCount} foto</Text>
              </View>

              <View style={styles.imageGrid}>
                {isNew
                  ? pendingImages.map((uri, index) => (
                      <View key={`${uri}-${index}`} style={styles.imageWrap}>
                        <Image
                          source={{ uri }}
                          style={styles.image}
                          contentFit="cover"
                          transition={150}
                        />
                        {index === 0 ? (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>
                              Utama
                            </Text>
                          </View>
                        ) : null}
                        <TouchableOpacity
                          style={styles.removeBadge}
                          activeOpacity={0.8}
                          accessibilityLabel="Hapus foto"
                          onPress={() =>
                            setPendingImages((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }>
                          <MaterialIcons
                            name="close"
                            size={14}
                            color={Colors.onPrimary}
                          />
                        </TouchableOpacity>
                      </View>
                    ))
                  : images.map((image) => (
                      <TouchableOpacity
                        key={image.id}
                        style={styles.imageWrap}
                        activeOpacity={0.85}
                        onPress={() =>
                          image.isDefault
                            ? undefined
                            : handleSetDefault(image.id)
                        }>
                        {image.url ? (
                          <Image
                            source={{ uri: image.url }}
                            style={styles.image}
                            contentFit="cover"
                            transition={150}
                          />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <MaterialIcons
                              name="broken-image"
                              size={22}
                              color={Colors.outline}
                            />
                          </View>
                        )}
                        {image.isDefault ? (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>
                              Utama
                            </Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    ))}

                <TouchableOpacity
                  style={styles.addImage}
                  activeOpacity={0.8}
                  accessibilityLabel="Ambil foto produk"
                  disabled={uploading}
                  onPress={() => setCameraOpen(true)}>
                  {uploading ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <>
                      <MaterialIcons
                        name="add-a-photo"
                        size={22}
                        color={Colors.primary}
                      />
                      <Text style={styles.addImageLabel}>Ambil Foto</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.helper}>
                {isNew
                  ? 'Foto pertama otomatis menjadi foto utama; unggahan dikirim setelah produk dibuat.'
                  : 'Ketuk foto untuk menjadikannya foto utama.'}
              </Text>
            </View>

            {!isNew ? (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Varian Produk</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      accessibilityLabel="Tambah varian"
                      onPress={() =>
                        setEditor({ kind: 'variant', item: null })
                      }>
                      <MaterialIcons
                        name="add-circle-outline"
                        size={22}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                  {variants.length === 0 ? (
                    <Text style={styles.helper}>
                      Belum ada varian. Tambahkan bila produk punya pilihan
                      ukuran/warna.
                    </Text>
                  ) : (
                    variants.map((variant) => (
                      <View key={variant.id} style={styles.itemRow}>
                        {variant.image ? (
                          <Image
                            source={{ uri: variant.image }}
                            style={styles.itemThumb}
                            contentFit="cover"
                            transition={150}
                          />
                        ) : (
                          <View style={styles.itemThumbPlaceholder}>
                            <MaterialIcons
                              name="local-florist"
                              size={18}
                              color={Colors.outline}
                            />
                          </View>
                        )}
                        <View style={styles.itemBody}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {variant.title}
                          </Text>
                          {variant.subTitle ? (
                            <Text style={styles.itemMeta} numberOfLines={1}>
                              {variant.subTitle}
                            </Text>
                          ) : null}
                          <Text style={styles.itemPrice}>
                            {formatRupiah(variant.price)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.itemIconButton}
                          accessibilityLabel="Ubah varian"
                          onPress={() =>
                            setEditor({ kind: 'variant', item: variant })
                          }>
                          <MaterialIcons
                            name="edit"
                            size={18}
                            color={Colors.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.itemIconButton}
                          accessibilityLabel="Hapus varian"
                          onPress={() =>
                            handleDeleteItem({ kind: 'variant', item: variant })
                          }>
                          <MaterialIcons
                            name="delete-outline"
                            size={18}
                            color={Colors.error}
                          />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Add-on</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      accessibilityLabel="Tambah add-on"
                      onPress={() => setEditor({ kind: 'addon', item: null })}>
                      <MaterialIcons
                        name="add-circle-outline"
                        size={22}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                  {addons.length === 0 ? (
                    <Text style={styles.helper}>
                      Belum ada add-on. Contoh: kartu ucapan atau cokelat.
                    </Text>
                  ) : (
                    addons.map((addon) => (
                      <View key={addon.id} style={styles.itemRow}>
                        {addon.image ? (
                          <Image
                            source={{ uri: addon.image }}
                            style={styles.itemThumb}
                            contentFit="cover"
                            transition={150}
                          />
                        ) : (
                          <View style={styles.itemThumbPlaceholder}>
                            <MaterialIcons
                              name="card-giftcard"
                              size={18}
                              color={Colors.outline}
                            />
                          </View>
                        )}
                        <View style={styles.itemBody}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {addon.title}
                          </Text>
                          <Text style={styles.itemPrice}>
                            {formatRupiah(addon.price)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.itemIconButton}
                          accessibilityLabel="Ubah add-on"
                          onPress={() =>
                            setEditor({ kind: 'addon', item: addon })
                          }>
                          <MaterialIcons
                            name="edit"
                            size={18}
                            color={Colors.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.itemIconButton}
                          accessibilityLabel="Hapus add-on"
                          onPress={() =>
                            handleDeleteItem({ kind: 'addon', item: addon })
                          }>
                          <MaterialIcons
                            name="delete-outline"
                            size={18}
                            color={Colors.error}
                          />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                  {relatedWarning ? (
                    <Text style={styles.warning}>{relatedWarning}</Text>
                  ) : null}
                </View>
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              activeOpacity={0.85}
              disabled={saving}
              onPress={() => void handleSave()}>
              {saving ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <MaterialIcons
                  name="save"
                  size={18}
                  color={Colors.onPrimary}
                />
              )}
              <Text style={styles.primaryButtonLabel}>
                {isNew ? 'Simpan Produk' : 'Simpan Perubahan'}
              </Text>
            </TouchableOpacity>

            {!isNew ? (
              <Text style={styles.footnote}>
                Kategori dan berat tidak dapat diubah lewat endpoint update
                backend; hubungi admin bila perlu menyesuaikannya.
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>

      <PhotoCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={handleCaptured}
      />

      {editor ? (
        <ItemEditorModal
          key={`${editor.kind}-${editor.item?.id ?? 'new'}`}
          state={editor}
          onSubmit={(payload) => handleSubmitItem(payload, editor)}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </SellerAccessGate>
  );
}

/* ──────────────────────────── Modal varian/add-on ──────────────────────────── */

interface ItemEditorModalProps {
  state: ItemEditorState;
  onSubmit: (payload: {
    title: string;
    subTitle: string;
    price: number;
    imageUri: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

function ItemEditorModal({
  state,
  onSubmit,
  onClose,
}: ItemEditorModalProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const isVariant = state.kind === 'variant';
  const [title, setTitle] = useState(state.item?.title ?? '');
  const [subTitle, setSubTitle] = useState(
    isVariant ? ((state.item as SellerVariant | null)?.subTitle ?? '') : '',
  );
  const [price, setPrice] = useState(
    state.item ? String(state.item.price) : '',
  );
  const [imageUri, setImageUri] = useState<string | null>(
    state.item?.image ?? null,
  );
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    const trimmedTitle = title.trim();
    const priceValue = Number(price.replace(/[^\d]/g, ''));

    if (trimmedTitle.length < 2) {
      Alert.alert('Nama', `Nama ${isVariant ? 'varian' : 'add-on'} wajib diisi.`);
      return;
    }
    if (!priceValue || priceValue <= 0) {
      Alert.alert('Harga', 'Isi harga lebih dari 0.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        subTitle: subTitle.trim(),
        price: priceValue,
        imageUri,
      });
    } catch (submitError) {
      Alert.alert(
        'Gagal Menyimpan',
        submitError instanceof Error ? submitError.message : 'Coba lagi.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.screen}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.two }]}>
          <TouchableOpacity
            style={styles.modalIconButton}
            accessibilityLabel="Tutup"
            onPress={onClose}>
            <MaterialIcons name="close" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {state.item ? 'Ubah' : 'Tambah'}{' '}
            {isVariant ? 'Varian' : 'Add-on'}
          </Text>
          <View style={styles.modalIconButton} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.seven },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <LabeledInput
              label={isVariant ? 'Nama Varian' : 'Nama Add-on'}
              value={title}
              onChangeText={setTitle}
              placeholder={isVariant ? 'mis. Ukuran Besar' : 'mis. Kartu Ucapan'}
              maxLength={120}
              required
            />
            {isVariant ? (
              <LabeledInput
                label="Keterangan Varian"
                value={subTitle}
                onChangeText={setSubTitle}
                placeholder="mis. 20 tangkai mawar"
                maxLength={120}
              />
            ) : null}
            <LabeledInput
              label="Harga (Rp)"
              value={price}
              onChangeText={setPrice}
              placeholder="50000"
              keyboardType="number-pad"
              required
            />

            <Text style={styles.label}>Foto (opsional)</Text>
            <View style={styles.editorImageRow}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.editorImage}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={styles.editorImagePlaceholder}>
                  <MaterialIcons
                    name="image"
                    size={22}
                    color={Colors.outline}
                  />
                </View>
              )}
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.85}
                onPress={() => setCameraOpen(true)}>
                <MaterialIcons
                  name="photo-camera"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.secondaryButtonLabel}>
                  {imageUri ? 'Ganti Foto' : 'Ambil Foto'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            activeOpacity={0.85}
            disabled={saving}
            onPress={() => void handleSubmit()}>
            {saving ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <MaterialIcons name="save" size={18} color={Colors.onPrimary} />
            )}
            <Text style={styles.primaryButtonLabel}>Simpan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <PhotoCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={(uri) => setImageUri(uri)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: MarginMobile,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onSurface,
  },
  required: {
    color: Colors.error,
  },
  helper: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.onSurfaceVariant,
  },
  warning: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.error,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.onSurface,
  },
  switchHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  chipLabelActive: {
    color: Colors.onPrimary,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  imageWrap: {
    width: 92,
    height: 92,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainer,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  defaultBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    backgroundColor: Colors.primary,
  },
  defaultBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.onPrimary,
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
  },
  addImage: {
    width: 92,
    height: 92,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  addImageLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    color: Colors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: Spacing.two,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceContainer,
  },
  itemThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  itemBody: {
    flex: 1,
    gap: 1,
  },
  itemTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  itemMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  itemPrice: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.primary,
  },
  itemIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 42,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryButtonLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footnote: {
    fontFamily: Fonts.body,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.outline,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: MarginMobile,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  modalIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  editorImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  editorImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainer,
  },
  editorImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
});
