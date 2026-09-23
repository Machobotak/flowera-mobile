import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FloristCard from '@/components/cards/florist-card';
import ProductCard from '@/components/cards/product-card';
import BuyerNavbar from '@/components/layout/navbar/buyer-navbar';
import {
  Colors,
  Fonts,
  MarginMobile,
  MaxContentWidth,
  Radius,
  ShadowFloat,
  ShadowSoft,
  Spacing,
  StackLg,
  StackMd,
} from '@/constants/theme';
import {
  HERO_SLIDES,
  PRODUCT_CATEGORIES,
  PRODUCTS,
  STORES,
  type HeroSlide,
} from '@/data/home';

/* ──────────────────────────── Helpers ──────────────────────────── */

/** Padanan `toLocaleString("id-ID")` di web, aman di semua platform. */
const formatRupiah = (value: number) =>
  `Rp ${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/**
 * Versi lokal dari `getImageUrl` web — dulu tugasnya menyusun URL file dari
 * backend, sekarang cuma mengambil gambar pertama yang tersedia.
 */
const getImageUrl = (images: { image_url: string; isDefault: boolean }[]) => {
  if (images && images.length > 0) {
    const img = images.find((i) => i.isDefault) || images[0];
    if (img.image_url) return img.image_url;
  }
  return 'https://ui-avatars.com/api/?name=P&background=8c4a5c&color=fff';
};

/* ──────────────────────────── Hero Carousel ──────────────────────────── */

function HeroCarousel({ width }: { width: number }) {
  const listRef = useRef<FlatList<HeroSlide>>(null);
  const currentRef = useRef(0);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Web: aspect-[4/3] untuk mobile, aspect-[21/9] untuk desktop.
  const height = (width * 3) / 4;

  // Auto-advance tiap 15 detik, sama seperti web.
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentRef.current + 1) % HERO_SLIDES.length;
      currentRef.current = next;
      setCurrentSlide(next);
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }, 15000);

    return () => clearInterval(timer);
  }, [width]);

  // Kalau user menggeser manual, indikator ikut menyesuaikan.
  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    currentRef.current = index;
    setCurrentSlide(index);
  };

  const goToSlide = useCallback(
    (index: number) => {
      currentRef.current = index;
      setCurrentSlide(index);
      listRef.current?.scrollToOffset({ offset: index * width, animated: true });
    },
    [width],
  );

  return (
    <View style={[styles.heroWrapper, { height }]}>
      <FlatList
        ref={listRef}
        data={HERO_SLIDES}
        keyExtractor={(_, idx) => `hero-${idx}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <Image
              source={{ uri: item.image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel={`${item.title} ${item.subtitle}`}
              transition={300}
            />
            {/* Web: bg-gradient-to-r from-on-surface/60 to-transparent */}
            <LinearGradient
              colors={['rgba(32, 26, 27, 0.6)', 'rgba(32, 26, 27, 0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>
                {item.title}
                {'\n'}
                <Text style={styles.heroSubtitle}>{item.subtitle}</Text>
              </Text>
              <Text style={styles.heroDesc}>{item.desc}</Text>
              <TouchableOpacity style={styles.heroButton} activeOpacity={0.85}>
                <Text style={styles.heroButtonText}>Shop The Collection</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Indicators */}
      <View style={styles.dots}>
        {HERO_SLIDES.map((_, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => goToSlide(idx)}
            activeOpacity={0.8}
            style={[styles.dot, currentSlide === idx && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

/* ──────────────────────────── Explore Section ──────────────────────────── */

function ExploreSection({ contentWidth }: { contentWidth: number }) {
  const [activeTab, setActiveTab] = useState<'products' | 'florists'>('products');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  /**
   * Di web, memilih kategori memicu request `/api/user/product/categories/:id`.
   * Karena versi ini static, filternya dilakukan langsung di memori.
   */
  const displayProducts = (
    selectedCategory === null
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category_id === selectedCategory)
  ).filter((p) => p.name && p.name !== 'Unknown');

  // Dua kolom dengan gutter, dihitung supaya tidak pernah meluber.
  const cardWidth = (contentWidth - Spacing.three) / 2;

  return (
    <View style={styles.explore}>
      {/* Category chips — hanya untuk tab produk */}
      {activeTab === 'products' && (
        <View style={styles.categoryBlock}>
          <View style={styles.categoryHeader}>
            <Text style={styles.sectionTitle}>Belanja Sesuai Kebutuhan</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}>
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.8}
              style={[styles.chip, selectedCategory === null && styles.chipActive]}>
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === null && styles.chipTextActive,
                ]}>
                Semua
              </Text>
            </TouchableOpacity>

            {PRODUCT_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                  style={[styles.chip, isActive && styles.chipActive]}>
                  <Text
                    style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.chip, styles.chipCustom]}>
              <MaterialIcons name="brush" size={16} color={Colors.onPrimary} />
              <Text style={[styles.chipText, styles.chipTextActive]}>
                Custom Bouquet
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('products')}
          activeOpacity={0.8}
          style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive]}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'products' && styles.tabTextActive,
            ]}>
            Trending Bouquets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('florists')}
          activeOpacity={0.8}
          style={[styles.tabItem, activeTab === 'florists' && styles.tabItemActive]}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'florists' && styles.tabTextActive,
            ]}>
            Nearby Florists
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'products' ? (
        displayProducts.length > 0 ? (
          <View style={styles.grid}>
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                style={{ width: cardWidth }}
                name={product.name}
                florist={product.store?.name || 'Unknown Florist'}
                price={formatRupiah(product.price)}
                rating={product.rating > 0 ? product.rating.toString() : 'Baru'}
                location={product.store?.city || 'Unknown'}
                sold={`${product.sold} terjual`}
                image={getImageUrl(product.product_image)}
                imageAlt={product.name}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="search-off"
              size={64}
              color={Colors.outline}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>
              Belum ada produk di kategori ini
            </Text>
            <Text style={styles.emptyDesc}>
              Coba pilih kategori lain atau lihat semua produk.
            </Text>
          </View>
        )
      ) : (
        <View style={styles.floristList}>
          {STORES.map((florist) => (
            <FloristCard
              key={florist.id}
              name={florist.name}
              location={florist.city || 'Unknown City'}
              distance="Dekat Anda"
              avatar={florist.logo}
              avatarAlt={florist.name}
            />
          ))}
        </View>
      )}

      {/* Load more — di web muncul kalau data yang dimuat sudah 50 item */}
      {((activeTab === 'products' && displayProducts.length >= 50) ||
        (activeTab === 'florists' && STORES.length >= 50)) && (
        <View style={styles.loadMoreWrapper}>
          <TouchableOpacity style={styles.loadMoreButton} activeOpacity={0.8}>
            <Text style={styles.loadMoreText}>Muat Lebih Banyak</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ──────────────────────────── Page ──────────────────────────── */

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Web: max-w-container-max + px-margin-mobile, jadi konten dibatasi 800px.
  const contentWidth = Math.min(width, MaxContentWidth) - MarginMobile * 2;

  return (
    <View style={styles.screen}>
      <BuyerNavbar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + StackLg },
        ]}
        showsVerticalScrollIndicator={false}>
        <HeroCarousel width={contentWidth} />
        <ExploreSection contentWidth={contentWidth} />
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────── Styles ──────────────────────────── */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: MarginMobile,
    paddingTop: StackMd,
    gap: StackLg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },

  /* Hero */
  heroWrapper: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...ShadowFloat,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  heroTitle: {
    fontFamily: Fonts.headline,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.onPrimary,
    marginBottom: Spacing.two,
  },
  heroSubtitle: {
    color: Colors.primaryFixed,
  },
  heroDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.onPrimary,
    opacity: 0.9,
    marginBottom: Spacing.five,
  },
  heroButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.full,
    ...ShadowSoft,
  },
  heroButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.onPrimaryContainer,
  },
  dots: {
    position: 'absolute',
    bottom: StackMd,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    width: 32,
    backgroundColor: Colors.onPrimary,
  },

  /* Explore */
  explore: {
    gap: StackMd,
  },
  categoryBlock: {
    gap: Spacing.three,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.headlineMedium,
    fontSize: 20,
    color: Colors.onSurface,
  },
  linkText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipCustom: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  chipTextActive: {
    color: Colors.onPrimary,
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.outlineVariant,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: Colors.surfaceContainerLowest,
    ...ShadowSoft,
  },
  tabText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: Colors.primary,
  },

  /* Grid & list */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  floristList: {
    gap: Spacing.three,
  },

  /* Empty state */
  emptyState: {
    paddingVertical: 64,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.outlineVariant,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontFamily: Fonts.headline,
    fontSize: 16,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.one,
  },

  /* Load more */
  loadMoreWrapper: {
    alignItems: 'center',
    paddingTop: StackMd,
  },
  loadMoreButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  loadMoreText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});
