import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_DIRECTORY_COLORS, SUBJECT_DETAIL_DATA, UNITS_DATA, STATS_DATA } from './constants/unitDirectoryData';
import HeroBanner from './components/HeroBanner';
import UnitCard from './components/UnitCard';
import StatsBento from './components/StatsBento';

export default function UnitDirectoryPage({ navigation, route }) {
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleUnitPress = (unit) => {
    console.log('Unit pressed:', unit.title);
  };

  const handleFullTest = () => {
    console.log('Full subject test started');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2563eb" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={UNIT_DIRECTORY_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Practice Hub</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <HeroBanner 
          subject={SUBJECT_DETAIL_DATA} 
          onPress={handleFullTest}
        />

        {/* Units Section */}
        <View style={styles.unitsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Curriculum</Text>
            <Text style={styles.sectionSubtitle}>{UNITS_DATA.length} Units Total</Text>
          </View>

          {UNITS_DATA.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              onPress={() => handleUnitPress(unit)}
            />
          ))}
        </View>

        {/* Stats Section */}
        <StatsBento stats={STATS_DATA} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UNIT_DIRECTORY_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    backgroundColor: UNIT_DIRECTORY_COLORS.surface,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurface,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  unitsSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurface,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: UNIT_DIRECTORY_COLORS.onSurfaceVariant,
  },
});
