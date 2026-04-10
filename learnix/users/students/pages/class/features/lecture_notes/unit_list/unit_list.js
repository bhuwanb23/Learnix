import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { UNIT_COLORS, SUBJECT_HERO, UNITS, RESOURCES } from './constants/unitListData';
import UnitListHeader from './components/UnitListHeader';
import SubjectHeroBanner from './components/SubjectHeroBanner';
import UnitCard from './components/UnitCard';
import QuickResources from './components/QuickResources';

export default function UnitListPage({ navigation, subject }) {
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleUnitPress = (unit) => {
    if (unit.status === 'locked') {
      Alert.alert('Locked', 'Complete previous units to unlock this content');
      return;
    }
    Alert.alert(
      'Open Unit',
      `Open ${unit.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => console.log('Open unit:', unit.id) },
      ]
    );
  };

  const handleResourcePress = (resource) => {
    Alert.alert(resource.title, resource.description);
  };

  return (
    <View style={styles.container}>
      <UnitListHeader onBack={handleBack} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SubjectHeroBanner subject={subject || SUBJECT_HERO} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Curriculum Modules</Text>
            <Text style={styles.sectionSubtitle}>{UNITS.length} Units Total</Text>
          </View>

          <View style={styles.unitsList}>
            {UNITS.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onPress={() => handleUnitPress(unit)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <QuickResources 
            resources={RESOURCES} 
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UNIT_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 80, 212, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_COLORS.primary,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  unitsList: {
    marginTop: 8,
  },
  bottomPadding: {
    height: 24,
  },
});
