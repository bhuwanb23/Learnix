import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function QuickActions({ categories, honors }) {
  return (
    <View style={styles.container}>
      {/* Profile Categories Grid */}
      <View style={styles.categoriesGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryCard}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: category.bgColor }]}>
              <MaterialIcons name={category.icon} size={24} color={category.color} />
            </View>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <MaterialIcons name="chevron-right" size={20} color="#abadaf" style={styles.chevron} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Honors & Recognitions */}
      <View style={styles.honorsSection}>
        <View style={styles.honorsHeader}>
          <Text style={styles.sectionTitle}>Honors & Recognitions</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.honorsGrid}>
          {honors.map((honor) => (
            <View key={honor.id} style={styles.honorCard}>
              <View style={[styles.honorIconContainer, { backgroundColor: honor.bgColor }]}>
                <MaterialIcons name={honor.icon} size={24} color={honor.color} />
              </View>
              <View>
                <Text style={styles.honorTitle}>{honor.title}</Text>
                <Text style={styles.honorSubtitle}>{honor.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 32, // space-y-8
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap', // grid-cols-2
    gap: 16, // gap-4
  },
  categoryCard: {
    width: '47%', // half minus gap for mobile
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    padding: 16, // p-4
    borderRadius: 12, // rounded-xl
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.1)', // border-outline-variant/10
  },
  iconContainer: {
    width: 40, // w-10
    height: 40, // h-10
    borderRadius: 8, // rounded-lg
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // mr-3
  },
  categoryTitle: {
    flex: 1,
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'Manrope-Bold',
  },
  chevron: {
    marginLeft: 'auto',
  },
  honorsSection: {
    // container for honors
  },
  honorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24, // mb-6
  },
  sectionTitle: {
    fontSize: 20, // text-xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
  },
  viewAllText: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#0050d4', // text-primary
    fontFamily: 'Manrope-Bold',
  },
  honorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap', // grid-cols-2
    gap: 16, // gap-4
  },
  honorCard: {
    width: '47%', // half minus gap
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // gap-4
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    padding: 16, // p-4
    borderRadius: 12, // rounded-xl
    borderWidth: 1, // border
    borderColor: 'rgba(171, 173, 175, 0.1)', // border-outline-variant/10
  },
  honorIconContainer: {
    width: 48, // w-12
    height: 48, // h-12
    borderRadius: 24, // rounded-full
    justifyContent: 'center',
    alignItems: 'center',
  },
  honorTitle: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'Manrope-Bold',
  },
  honorSubtitle: {
    fontSize: 12, // text-xs
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
  },
});
