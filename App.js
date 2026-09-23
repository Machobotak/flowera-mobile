import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// --- DUMMY DATA ---
const CATEGORIES = [
  { id: '1', name: 'Wisuda', icon: 'school-outline', emoji: '🎓' },
  { id: '2', name: 'Ulang Tahun', icon: 'cake-variant-outline', emoji: '🎂', iconType: 'material' },
  { id: '3', name: 'Anniversary', icon: 'heart-outline', emoji: '💖' },
  { id: '4', name: 'Minta Maaf', icon: 'flower-outline', emoji: '🌸' },
  { id: '5', name: 'Pernikahan', icon: 'ring', emoji: '💍', iconType: 'material' },
  { id: '6', name: 'Lainnya', icon: 'grid-outline', emoji: '✨' },
];

const RECOMMENDED_BOUQUETS = [
  {
    id: 'b1',
    name: 'Sweet Pink Bouquet',
    florist: 'Bloom House',
    price: 'Rp85.000',
    rating: 4.8,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop',
    tag: 'Terlaris',
  },
  {
    id: 'b2',
    name: 'Elegance Rose Box',
    florist: 'Flora Artistry',
    price: 'Rp150.000',
    rating: 4.9,
    reviews: 98,
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600&auto=format&fit=crop',
    tag: 'Premium',
  },
  {
    id: 'b3',
    name: 'Pastel Sunbeam',
    florist: 'Rosy Dreams',
    price: 'Rp120.000',
    rating: 4.7,
    reviews: 65,
    image: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?q=80&w=600&auto=format&fit=crop',
    tag: 'Baru',
  },
  {
    id: 'b4',
    name: 'Blossom Grace Bloom',
    florist: 'Petal & Co.',
    price: 'Rp95.000',
    rating: 4.8,
    reviews: 142,
    image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=600&auto=format&fit=crop',
    tag: 'Favorit',
  },
];

const TOP_FLORISTS = [
  {
    id: 'f1',
    name: 'Bloom House',
    rating: 4.9,
    location: 'Jakarta Selatan',
    productsCount: '45+ Buket',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    badge: 'Official Store',
  },
  {
    id: 'f2',
    name: 'Flora Artistry Studio',
    rating: 4.8,
    location: 'Bandung',
    productsCount: '32+ Buket',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    badge: 'Star Florist',
  },
  {
    id: 'f3',
    name: 'Rosy Dreams Craft',
    rating: 4.9,
    location: 'Surabaya',
    productsCount: '50+ Buket',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop',
    badge: 'Star Florist',
  },
];

const ORDER_STATUS_STEPS = [
  { label: 'Pesanan Diproses', icon: 'document-text-outline', completed: true },
  { label: 'Sedang Dibuat', icon: 'flower-outline', completed: true, active: true },
  { label: 'Siap Dikirim', icon: 'gift-outline', completed: false },
  { label: 'Dalam Pengiriman', icon: 'bicycle-outline', completed: false },
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState('1');
  const [wishlist, setWishlist] = useState({});
  const [activeTab, setActiveTab] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleWishlist = (id, name) => {
    setWishlist((prev) => {
      const isFav = !prev[id];
      Alert.alert(
        isFav ? 'Ditambahkan ke Wishlist' : 'Dihapus dari Wishlist',
        `${name} ${isFav ? 'telah disimpan ke favorit Anda.' : 'dihapus dari favorit.'}`
      );
      return { ...prev, [id]: isFav };
    });
  };

  const handlePressItem = (title, message) => {
    console.log(`[Interaction] ${title}: ${message}`);
    Alert.alert(title, message);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />
      
      {/* MAIN CONTAINER */}
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. HEADER / GREETING SECTION */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.brandContainer}>
                <Ionicons name="flower" size={24} color="#E85D75" />
                <Text style={styles.brandTitle}>Flowera</Text>
              </View>
              <Text style={styles.greetingTitle}>Mau kasih hadiah untuk momen spesial?</Text>
              <Text style={styles.tagline}>"Temani Setiap Momen Bermaknamu"</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.7}
              onPress={() => handlePressItem('Notifikasi', 'Anda memiliki 2 notifikasi baru.')}
            >
              <Ionicons name="notifications-outline" size={22} color="#1B4D3E" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* 2. SEARCH BAR */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#6E7D75" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari buket, florist, atau momen..."
                placeholderTextColor="#9EA8A2"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => console.log('Search bar focused')}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9EA8A2" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterButton}
              activeOpacity={0.8}
              onPress={() => handlePressItem('Filter Search', 'Membuka opsi filter pencarian.')}
            >
              <Ionicons name="options-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* 3. KATEGORI MOMEN */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Pilih Momenmu</Text>
              <Text style={styles.sectionSubtitle}>Temukan buket pas untuk suasana hatimu</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveCategory(cat.id);
                    handlePressItem('Kategori Momen', `Kategori terpilih: ${cat.name}`);
                  }}
                >
                  <View style={[styles.categoryIconCircle, isActive && styles.categoryIconCircleActive]}>
                    {cat.iconType === 'material' ? (
                      <MaterialCommunityIcons
                        name={cat.icon}
                        size={22}
                        color={isActive ? '#FFFFFF' : '#1B4D3E'}
                      />
                    ) : (
                      <Ionicons
                        name={cat.icon}
                        size={22}
                        color={isActive ? '#FFFFFF' : '#1B4D3E'}
                      />
                    )}
                  </View>
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 5. CUSTOM BOUQUET CTA (Placed prominently) */}
          <View style={styles.ctaSection}>
            <View style={styles.ctaCard}>
              <View style={styles.ctaDecorCircle1} />
              <View style={styles.ctaDecorCircle2} />
              <View style={styles.ctaContent}>
                <View style={styles.ctaBadge}>
                  <Ionicons name="sparkles" size={14} color="#E85D75" />
                  <Text style={styles.ctaBadgeText}>Fitur Unggulan</Text>
                </View>
                <Text style={styles.ctaTitle}>Buat Buket Sesuai Keinginanmu</Text>
                <Text style={styles.ctaDescription}>
                  Pilih bunga, warna wrapping, dan detail buket sesuai momen spesialmu.
                </Text>
                <TouchableOpacity
                  style={styles.ctaButton}
                  activeOpacity={0.85}
                  onPress={() => handlePressItem('Custom Bouquet', 'Membuka Studio Custom Buket Flowera.')}
                >
                  <Text style={styles.ctaButtonText}>Custom Sekarang</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 6. ORDER TRACKING SECTION */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Lacak Pesananmu</Text>
              <Text style={styles.sectionSubtitle}>Pantau pembuatan buket secara real-time</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.trackingCard}
            activeOpacity={0.9}
            onPress={() => handlePressItem('Lacak Pesanan', 'Detail Pelacakan Pesanan #FLW-88291')}
          >
            <View style={styles.trackingCardHeader}>
              <View style={styles.trackingInfoLeft}>
                <Ionicons name="cube-outline" size={18} color="#E85D75" />
                <Text style={styles.orderIdText}>Pesanan #FLW-88291</Text>
              </View>
              <View style={styles.activeStatusBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeStatusText}>Sedang Dibuat</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Stepper Progress */}
            <View style={styles.stepperContainer}>
              {ORDER_STATUS_STEPS.map((step, idx) => (
                <View key={idx} style={styles.stepItem}>
                  <View style={styles.stepIconRow}>
                    <View
                      style={[
                        styles.stepNodeCircle,
                        step.completed && styles.stepNodeCompleted,
                        step.active && styles.stepNodeActive,
                      ]}
                    >
                      <Ionicons
                        name={step.icon}
                        size={14}
                        color={step.completed || step.active ? '#FFFFFF' : '#A4B0A9'}
                      />
                    </View>
                    {idx < ORDER_STATUS_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          step.completed && styles.stepLineCompleted,
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step.active && styles.stepLabelActive,
                    ]}
                    numberOfLines={2}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* 4. FEATURED / RECOMMENDED BOUQUET */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View>
              <Text style={styles.sectionTitle}>Rekomendasi Untukmu</Text>
              <Text style={styles.sectionSubtitle}>Koleksi terfavorit dari berbagai florist</Text>
            </View>
            <TouchableOpacity onPress={() => handlePressItem('Lihat Semua Rekomendasi', 'Membuka katalog lengkap rekomendasi buket.')}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsScroll}
          >
            {RECOMMENDED_BOUQUETS.map((item) => {
              const isFav = !!wishlist[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.productCard}
                  activeOpacity={0.9}
                  onPress={() => handlePressItem('Detail Produk', `Melihat detail dari ${item.name}`)}
                >
                  <View style={styles.productImageContainer}>
                    <Image source={{ uri: item.image }} style={styles.productImage} />
                    <View style={styles.productTagBadge}>
                      <Text style={styles.productTagText}>{item.tag}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.wishlistButton}
                      activeOpacity={0.8}
                      onPress={() => toggleWishlist(item.id, item.name)}
                    >
                      <Ionicons
                        name={isFav ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isFav ? '#E85D75' : '#1B4D3E'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    
                    <View style={styles.floristRow}>
                      <Ionicons name="storefront-outline" size={13} color="#6E7D75" />
                      <Text style={styles.productFlorist} numberOfLines={1}>
                        {item.florist}
                      </Text>
                    </View>

                    <View style={styles.priceRatingRow}>
                      <Text style={styles.productPrice}>{item.price}</Text>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#FFB800" />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 7. FLORIST SECTION */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View>
              <Text style={styles.sectionTitle}>Florist Pilihan</Text>
              <Text style={styles.sectionSubtitle}>Mitra terpercaya dengan rating tertinggi</Text>
            </View>
            <TouchableOpacity onPress={() => handlePressItem('Lihat Semua Florist', 'Membuka daftar semua florist mitra.')}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.floristsScroll}
          >
            {TOP_FLORISTS.map((florist) => (
              <TouchableOpacity
                key={florist.id}
                style={styles.floristCard}
                activeOpacity={0.9}
                onPress={() => handlePressItem('Profil Florist', `Membuka toko ${florist.name}`)}
              >
                <View style={styles.floristTopRow}>
                  <Image source={{ uri: florist.avatar }} style={styles.floristAvatar} />
                  <View style={styles.floristMetaLeft}>
                    <Text style={styles.floristName} numberOfLines={1}>
                      {florist.name}
                    </Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={12} color="#6E7D75" />
                      <Text style={styles.locationText}>{florist.location}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.floristCardFooter}>
                  <View style={styles.floristStat}>
                    <Ionicons name="star" size={12} color="#FFB800" />
                    <Text style={styles.floristRating}>{florist.rating}</Text>
                  </View>
                  <Text style={styles.floristProductsCount}>{florist.productsCount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ height: 30 }} />
        </ScrollView>

        {/* 8. BOTTOM NAVIGATION */}
        <View style={styles.bottomNav}>
          {[
            { name: 'Home', icon: 'home', iconOutline: 'home-outline' },
            { name: 'Explore', icon: 'compass', iconOutline: 'compass-outline' },
            { name: 'Pesanan', icon: 'receipt', iconOutline: 'receipt-outline' },
            { name: 'Profil', icon: 'person', iconOutline: 'person-outline' },
          ].map((tab) => {
            const isSelected = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.navItem}
                activeOpacity={0.7}
                onPress={() => {
                  setActiveTab(tab.name);
                  handlePressItem('Navigasi Utama', `Pindah ke tab ${tab.name}`);
                }}
              >
                <Ionicons
                  name={isSelected ? tab.icon : tab.iconOutline}
                  size={22}
                  color={isSelected ? '#E85D75' : '#8E9C94'}
                />
                <Text style={[styles.navLabel, isSelected && styles.navLabelActive]}>
                  {tab.name}
                </Text>
                {isSelected && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 10 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  scrollContent: {
    paddingBottom: 90,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B4D3E',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2A23',
    marginBottom: 2,
  },
  tagline: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#E85D75',
    fontWeight: '500',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E6DF',
    ...Platform.select({
      ios: {
        shadowColor: '#1B4D3E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E85D75',
  },

  /* SEARCH BAR */
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    ...Platform.select({
      ios: {
        shadowColor: '#1B4D3E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#1C2A23',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1B4D3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  /* SECTION GENERAL */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1B4D3E',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#6E7D75',
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#E85D75',
  },

  /* CATEGORIES */
  categoriesScroll: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingBottom: 6,
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    minWidth: 90,
    ...Platform.select({
      ios: {
        shadowColor: '#1B4D3E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  categoryCardActive: {
    backgroundColor: '#FFF0F3',
    borderColor: '#E85D75',
  },
  categoryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F3EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconCircleActive: {
    backgroundColor: '#E85D75',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C2A23',
  },
  categoryTextActive: {
    color: '#E85D75',
    fontWeight: '700',
  },

  /* CUSTOM CTA */
  ctaSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  ctaCard: {
    backgroundColor: '#1B4D3E',
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1B4D3E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ctaDecorCircle1: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(232, 93, 117, 0.18)',
  },
  ctaDecorCircle2: {
    position: 'absolute',
    right: 40,
    bottom: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  ctaContent: {
    alignItems: 'flex-start',
  },
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  ctaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E85D75',
    marginLeft: 4,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    maxWidth: '85%',
  },
  ctaDescription: {
    fontSize: 12.5,
    color: '#D1E3DA',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: '90%',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E85D75',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ORDER TRACKING */
  trackingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    ...Platform.select({
      ios: {
        shadowColor: '#1B4D3E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  trackingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C2A23',
    marginLeft: 8,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E85D75',
    marginRight: 6,
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E85D75',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5EFE9',
    marginVertical: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepNodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0F4F2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepNodeCompleted: {
    backgroundColor: '#1B4D3E',
  },
  stepNodeActive: {
    backgroundColor: '#E85D75',
    borderWidth: 2,
    borderColor: '#FFF0F3',
  },
  stepLine: {
    position: 'absolute',
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E4ECE8',
    top: 12,
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: '#1B4D3E',
  },
  stepLabel: {
    fontSize: 10,
    color: '#8E9C94',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 13,
  },
  stepLabelActive: {
    color: '#E85D75',
    fontWeight: '700',
  },

  /* RECOMMENDED PRODUCTS */
  productsScroll: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingBottom: 6,
  },
  productCard: {
    width: width * 0.44,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E6DF',
    ...Platform.select({
      ios: {
        shadowColor: '#1B4D3E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  productImageContainer: {
    width: '100%',
    height: 135,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productTagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(27, 77, 62, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  productTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1C2A23',
    marginBottom: 4,
  },
  floristRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productFlorist: {
    fontSize: 11,
    color: '#6E7D75',
    marginLeft: 4,
  },
  priceRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E85D75',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B88600',
    marginLeft: 3,
  },

  /* FLORISTS */
  floristsScroll: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingBottom: 6,
  },
  floristCard: {
    width: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F0E6DF',
    ...Platform.select({
      ios: {
        shadowColor: '#1B4D3E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  floristTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  floristAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F3EE',
  },
  floristMetaLeft: {
    flex: 1,
    marginLeft: 10,
  },
  floristName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C2A23',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 11,
    color: '#6E7D75',
    marginLeft: 2,
  },
  floristCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  floristStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floristRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C2A23',
    marginLeft: 4,
  },
  floristProductsCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1B4D3E',
  },

  /* BOTTOM NAVIGATION */
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0E6DF',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  navLabel: {
    fontSize: 10.5,
    color: '#8E9C94',
    fontWeight: '500',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#E85D75',
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    backgroundColor: '#E85D75',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
