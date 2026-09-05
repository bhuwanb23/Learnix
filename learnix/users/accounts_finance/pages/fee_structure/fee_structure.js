import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FEE_STRUCTURE } from './constants/feeStructureData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function FeeStructureModule({ navigation }) {
  const [expandedId, setExpandedId] = useState(null);

  const handleEdit = (program) => {
    Alert.alert(
      'Edit Fee Structure',
      `Update fee components for ${program.program}? Changes apply from the next academic year and require admin approval.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => Alert.alert('Draft Saved', 'Fee revision draft saved for admin approval.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>Annual fee structure per program. Tap a card to see the component breakdown. Changes need admin approval and apply from the next academic year.</Text>

      {FEE_STRUCTURE.map((program) => {
        const expanded = expandedId === program.id;
        return (
          <View key={program.id} style={styles.programCard}>
            <TouchableOpacity
              style={styles.programHeader}
              activeOpacity={0.8}
              onPress={() => setExpandedId(expanded ? null : program.id)}
            >
              <View style={[styles.programIcon, { backgroundColor: program.color + '14' }]}>
                <Ionicons name="school-outline" size={18} color={program.color} />
              </View>
              <View style={styles.programInfo}>
                <Text style={styles.programName}>{program.program}</Text>
                <Text style={styles.programTotal}>{program.total} / year</Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
            </TouchableOpacity>

            {expanded ? (
              <>
                <View style={styles.componentsBox}>
                  {program.components.map((comp) => (
                    <View key={comp.label} style={styles.compRow}>
                      <Text style={styles.compLabel}>{comp.label}</Text>
                      <Text style={styles.compAmount}>{comp.amount}</Text>
                    </View>
                  ))}
                  <View style={styles.compTotalRow}>
                    <Text style={styles.compTotalLabel}>Total per year</Text>
                    <Text style={[styles.compTotalAmount, { color: program.color }]}>{program.total}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(program)} activeOpacity={0.85}>
                  <Ionicons name="create-outline" size={15} color="#2563eb" />
                  <Text style={styles.editBtnText}>Edit Structure</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  programCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  programTotal: {
    fontSize: 12,
    color: '#2563eb',
    fontFamily: 'Manrope-Bold',
    marginTop: 1,
  },
  componentsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  compLabel: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Manrope-Regular',
  },
  compAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  compTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 4,
  },
  compTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Manrope-Bold',
  },
  compTotalAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  editBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Manrope-Bold',
  },
});