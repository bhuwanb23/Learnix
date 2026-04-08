import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  FlatList,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import data
import { EVENT_CATEGORIES, DISCOVERY_EVENTS, MY_REGISTRATIONS, EVENT_STATS, TRENDING_TAGS } from './constants/eventData';

export default function EventsPage() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Header Component
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHpU7BHJtm65cEhg1279OcQrP4QlI3qwNncJH1iaKrXqQtXeAvJKVaGnOZvmQ9lxLIXwQfoYBnqXdHm3Cea3MO1WXZR1QslbbsukiLB_zvVoTT4dAH4m4aL6t6QrI0VUYN-3xmKWb1ZQ-LbdXOhpzMvjl2zXMRarvuaTy2YoOaemBEvLvePPTD0fKQeuDuugSSgKr5VXCzeCpW2KFEM2xKhDpezq8ZRZOST5E97oFM8BAeLwb3JinQp-uPyuj88ZaWN9YUCqDqgzk' }} 
          style={styles.headerAvatar} 
        />
        <Text style={styles.headerTitle}>Campus Curator</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="notifications" size={24} color="#64748b" />
        </TouchableOpacity>
        {isTablet && (
          <View style={styles.desktopNav}>
            <Text style={styles.navLink}>Explore</Text>
            <Text style={styles.navLinkActive}>Events</Text>
            <Text style={styles.navLink}>Community</Text>
          </View>
        )}
      </View>
    </View>
  );

  // 2. Hero Section
  const renderHero = () => (
    <View style={[styles.heroContainer, { height: isTablet ? 618 : 530 }]}>
      <Image 
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7YuFWevwcsyOM-rgIzJrYkxQq-Vtq9fETdgjJrpCBRvJcvFDi8v7HermZbPc46BD90XjxQcHSGyk0d6Ajd-UqasKRd4R6DgHmkXYc2CBptQAxidMSd5rssKWoKGTsWtMSCWJoWyFQQaSFmpjm9KnFLnm8Aqk1ApXfQC-RqUfbAT_iAKwpXPTtxKu7Zc0i0RjZjkWQW2BJdnpSJwxoJtb2FwvZYaqpxhwvXwtGAuhKeJx9VNxvYD4hpaOx0E6dN7f5tJsxHg5VKlY' }} 
        style={styles.heroImage} 
      />
      <LinearGradient 
        colors={['rgba(0, 30, 90, 0.8)', 'transparent']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 0 }} 
        style={styles.heroGradient} 
      />
      <View style={[styles.heroContent, { paddingHorizontal: isTablet ? 80 : 32 }]}>
        <View style={styles.heroTag}>
          <Text style={styles.heroTagText}>FEATURED EVENT</Text>
        </View>
        <Text style={[styles.heroTitle, { fontSize: isTablet ? 72 : 36 }]}>
          Innovate-X: 2024 Tech Symposium
        </Text>
        <Text style={[styles.heroDescription, { fontSize: isTablet ? 20 : 18 }]}>
          Join the brightest minds on campus for three days of AI workshops, hardware hacks, and keynote speeches from industry giants.
        </Text>
        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.registerBtn} activeOpacity={0.9}>
            <Text style={styles.registerBtnText}>Register Now</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.scheduleBtn} activeOpacity={0.9}>
            <Text style={styles.scheduleBtnText}>View Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // 3. Search & Filter Bar
  const renderSearchFilter = () => (
    <View style={styles.searchFilterWrapper}>
      <View style={[styles.searchFilterContainer, { flexDirection: isTablet ? 'row' : 'column' }]}>
        <View style={[styles.searchInputContainer, isTablet && { flex: 1 }]}>
          <MaterialIcons name="search" size={24} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, workshops, or clubs..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScroll}
          style={[styles.filterScrollWrapper, isTablet && { width: 'auto', flex: 0 }]}
        >
          {EVENT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterPill,
                activeCategory === cat.id ? styles.filterPillActive : styles.filterPillInactive
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[
                styles.filterPillText,
                activeCategory === cat.id ? styles.filterPillTextActive : styles.filterPillTextInactive
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  // 4. Event Card Component
  const renderEventCard = ({ item }) => {
    const cardWidth = isTablet ? (width > 1280 ? 1280 : width) * 0.66 * 0.48 : '100%';
    return (
      <TouchableOpacity style={[styles.eventCard, { width: isDesktop ? '48%' : '100%' }]} activeOpacity={0.9}>
        <View style={styles.eventCardImageContainer}>
          <Image source={{ uri: item.image }} style={styles.eventCardImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.eventCardGradient} />
          <View style={styles.eventCardDate}>
            <Text style={styles.eventCardDateDay}>{item.date.day}</Text>
            <Text style={styles.eventCardDateMonth}>{item.date.month}</Text>
          </View>
          <TouchableOpacity style={styles.eventCardFavorite}>
            <MaterialIcons name="favorite" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.eventCardContent}>
          <View style={styles.eventCardMeta}>
            <View style={[styles.eventCardCategory, { backgroundColor: item.categoryColor }]}>
              <Text style={[styles.eventCardCategoryText, { color: item.categoryTextColor }]}>{item.category}</Text>
            </View>
            <View style={styles.eventCardTime}>
              <MaterialIcons name="schedule" size={14} color="#595c5e" />
              <Text style={styles.eventCardTimeText}>{item.time}</Text>
            </View>
          </View>
          <Text style={styles.eventCardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.eventCardDescription} numberOfLines={2}>{item.description}</Text>
          <View style={styles.eventCardFooter}>
            <View style={styles.eventCardAvatars}>
              {item.avatars.map((avatar, idx) => (
                <Image key={idx} source={{ uri: avatar }} style={[styles.eventCardAvatar, { marginLeft: idx > 0 ? -10 : 0 }]} />
              ))}
              <View style={[styles.eventCardAvatarCount, { marginLeft: -10 }]}>
                <Text style={styles.eventCardAvatarCountText}>+{item.attendees - item.avatars.length}</Text>
              </View>
            </View>
            <View style={styles.eventCardLocation}>
              <MaterialIcons name="location-on" size={14} color="#595c5e" />
              <Text style={styles.eventCardLocationText}>{item.location}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 5. Sidebar Component (Registrations & Stats)
  const renderSidebar = () => (
    <View style={styles.sidebar}>
      {/* My Registrations */}
      <View style={styles.sidebarSection}>
        <View style={styles.sidebarHeader}>
          <MaterialIcons name="confirmation-number" size={24} color="#0050d4" />
          <Text style={styles.sidebarTitle}>My Registrations</Text>
        </View>
        {MY_REGISTRATIONS.map((reg) => (
          <View key={reg.id} style={[styles.registrationCard, { borderLeftColor: reg.borderColor }]}>
            <View style={styles.registrationHeader}>
              <View>
                <Text style={styles.registrationTitle}>{reg.title}</Text>
                <Text style={styles.registrationDate}>{reg.datetime}</Text>
              </View>
              <TouchableOpacity>
                <MaterialIcons name="more-vert" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={styles.registrationBody}>
              <View style={styles.qrContainer}>
                <Image source={{ uri: reg.qrCode }} style={styles.qrImage} />
              </View>
              <View style={styles.registrationInfo}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.reminderLabel}>REMINDER</Text>
                  <View style={[styles.toggleTrack, reg.reminderActive ? styles.toggleActive : styles.toggleInactive]}>
                    <View style={[styles.toggleThumb, reg.reminderActive ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
                  </View>
                </View>
                <Text style={[styles.reminderText, { color: reg.reminderColor }]}>{reg.reminderText}</Text>
              </View>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.viewAllBtn}>
          <Text style={styles.viewAllBtnText}>View All Tickets</Text>
        </TouchableOpacity>
      </View>

      {/* Bento Stats */}
      <View style={styles.bentoGrid}>
        <View style={styles.bentoCard1}>
          <MaterialIcons name="calendar-month" size={24} color="#0050d4" style={styles.bentoIcon} />
          <Text style={styles.bentoValue1}>{EVENT_STATS.upcoming}</Text>
          <Text style={styles.bentoLabel1}>UPCOMING</Text>
        </View>
        <View style={styles.bentoCard2}>
          <MaterialIcons name="stars" size={24} color="#702ae1" style={styles.bentoIcon} />
          <Text style={styles.bentoValue2}>{EVENT_STATS.xpEarned}</Text>
          <Text style={styles.bentoLabel2}>XP EARNED</Text>
        </View>
      </View>

      {/* Trending Tags */}
      <View style={styles.trendingSection}>
        <Text style={styles.trendingTitle}>Trending Tags</Text>
        <View style={styles.tagsContainer}>
          {TRENDING_TAGS.map((tag, idx) => (
            <TouchableOpacity key={idx} style={styles.tagBtn}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // 6. List Header Component
  const ListHeader = () => (
    <>
      {renderHero()}
      {renderSearchFilter()}
      <View style={styles.discoverHeader}>
        <View>
          <Text style={styles.discoverTitle}>Upcoming Discoveries</Text>
          <Text style={styles.discoverSubtitle}>Selected curated events based on your interests</Text>
        </View>
        <TouchableOpacity style={styles.viewMapBtn}>
          <Text style={styles.viewMapText}>View Map</Text>
          <MaterialIcons name="map" size={16} color="#0050d4" />
        </TouchableOpacity>
      </View>
    </>
  );

  // 7. Desktop Layout Wrapper
  const renderDesktopLayout = () => (
    <View style={styles.desktopGrid}>
      <View style={styles.desktopLeft}>
        <View style={styles.eventsGrid}>
          {DISCOVERY_EVENTS.map(event => renderEventCard({ item: event }))}
        </View>
      </View>
      <View style={styles.desktopRight}>
        {renderSidebar()}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {renderHeader()}
      
      <FlatList
        data={isDesktop ? [{ id: 'desktop' }] : DISCOVERY_EVENTS}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={isDesktop ? renderDesktopLayout : renderEventCard}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={!isDesktop ? renderSidebar : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Nav Bar */}
      <View style={styles.bottomNav}>
        <View style={styles.bottomNavInner}>
          <TouchableOpacity style={styles.navItem}>
            <MaterialIcons name="grid-view" size={24} color="#94a3b8" />
            <Text style={styles.navItemText}>DASHBOARD</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <MaterialIcons name="menu-book" size={24} color="#94a3b8" />
            <Text style={styles.navItemText}>CLASSES</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <MaterialIcons name="assignment" size={24} color="#94a3b8" />
            <Text style={styles.navItemText}>ASSIGNMENTS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItemActive}>
            <MaterialIcons name="event" size={24} color="#0050d4" />
            <Text style={styles.navItemTextActive}>EVENTS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <MaterialIcons name="person" size={24} color="#94a3b8" />
            <Text style={styles.navItemText}>PROFILE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: 112 }]} activeOpacity={0.9}>
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1d4ed8',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginLeft: 16,
  },
  navLink: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
  },
  navLinkActive: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
  listContent: {
    paddingBottom: 140, // Space for bottom nav + FAB
  },
  heroContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 1024,
  },
  heroTag: {
    backgroundColor: 'rgba(162, 56, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  heroTagText: {
    color: '#5a1c00',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Manrope-Bold',
  },
  heroTitle: {
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    marginBottom: 24,
    lineHeight: Platform.OS === 'ios' ? 0 : undefined, // specific fix if needed
  },
  heroDescription: {
    color: '#f1f2ff',
    fontFamily: 'Manrope-Medium',
    marginBottom: 32,
    opacity: 0.9,
    maxWidth: 672,
    lineHeight: 28,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  registerBtn: {
    backgroundColor: '#0050d4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
  scheduleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  scheduleBtnText: {
    color: '#2c2f31',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
  searchFilterWrapper: {
    paddingHorizontal: 24,
    marginTop: -40,
    zIndex: 20,
    alignItems: 'center',
  },
  searchFilterContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    gap: 16,
    width: '100%',
    maxWidth: 1152,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef1f3',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c2f31',
    fontFamily: 'Manrope-Medium',
  },
  filterScrollWrapper: {
    width: '100%',
  },
  filterScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: '#0050d4',
  },
  filterPillInactive: {
    backgroundColor: '#eef1f3',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  filterPillTextActive: {
    color: '#f1f2ff',
  },
  filterPillTextInactive: {
    color: '#595c5e',
  },
  discoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginTop: 64,
    marginBottom: 32,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  discoverTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  discoverSubtitle: {
    fontSize: 16,
    color: '#595c5e',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  viewMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewMapText: {
    color: '#0050d4',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    paddingHorizontal: 24,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  eventCardImageContainer: {
    height: 224,
    position: 'relative',
    overflow: 'hidden',
  },
  eventCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventCardGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
  },
  eventCardDate: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  eventCardDateDay: {
    color: '#0050d4',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    lineHeight: 20,
  },
  eventCardDateMonth: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  eventCardFavorite: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  eventCardContent: {
    padding: 24,
  },
  eventCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eventCardCategory: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventCardCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase',
  },
  eventCardTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventCardTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#595c5e',
    fontFamily: 'Manrope-Medium',
  },
  eventCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 8,
  },
  eventCardDescription: {
    fontSize: 14,
    color: '#595c5e',
    fontFamily: 'Manrope-Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCardAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCardAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  eventCardAvatarCount: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dfe3e6',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardAvatarCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    fontFamily: 'Manrope-Bold',
  },
  eventCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventCardLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#595c5e',
    fontFamily: 'Manrope-SemiBold',
  },
  sidebar: {
    paddingHorizontal: 24,
    gap: 32,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 32,
  },
  sidebarSection: {
    backgroundColor: '#eef1f3',
    padding: 24,
    borderRadius: 16,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  registrationCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  registrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  registrationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Manrope-Bold',
  },
  registrationDate: {
    fontSize: 10,
    color: '#595c5e',
    fontFamily: 'Manrope-Regular',
  },
  registrationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrContainer: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  qrImage: {
    width: 40,
    height: 40,
    opacity: 0.5,
  },
  registrationInfo: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    fontFamily: 'Manrope-Bold',
  },
  toggleTrack: {
    width: 32,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#0050d4',
  },
  toggleInactive: {
    backgroundColor: '#e2e8f0',
  },
  toggleThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    position: 'absolute',
  },
  toggleThumbActive: {
    right: 2,
  },
  toggleThumbInactive: {
    left: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  reminderText: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
  },
  viewAllBtn: {
    width: '100%',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 80, 212, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllBtnText: {
    color: '#0050d4',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  bentoCard1: {
    flex: 1,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    padding: 16,
    borderRadius: 16,
  },
  bentoCard2: {
    flex: 1,
    backgroundColor: 'rgba(112, 42, 225, 0.1)',
    padding: 16,
    borderRadius: 16,
  },
  bentoIcon: {
    marginBottom: 8,
  },
  bentoValue1: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0050d4',
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  bentoLabel1: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(0, 80, 212, 0.6)',
    fontFamily: 'Manrope-Bold',
  },
  bentoValue2: {
    fontSize: 24,
    fontWeight: '900',
    color: '#702ae1',
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  bentoLabel2: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(112, 42, 225, 0.6)',
    fontFamily: 'Manrope-Bold',
  },
  trendingSection: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.1)',
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Manrope-Bold',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBtn: {
    backgroundColor: '#eef1f3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#595c5e',
    fontFamily: 'Manrope-SemiBold',
  },
  desktopGrid: {
    flexDirection: 'row',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    gap: 32,
    paddingHorizontal: 24,
  },
  desktopLeft: {
    flex: 8,
  },
  desktopRight: {
    flex: 4,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 999,
    height: 80,
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 50,
  },
  bottomNavInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  navItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 999,
  },
  navItemText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    fontFamily: 'Manrope-SemiBold',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  navItemTextActive: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1d4ed8',
    fontFamily: 'Manrope-SemiBold',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 32,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0050d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 40,
  },
});
