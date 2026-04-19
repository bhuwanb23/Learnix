import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { APPLICATION_DATA } from '../constants/applicationData';

export default function BasicDetails() {
  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="person-outline" size={22} color="#0050d4" />
          </View>
          <Text style={styles.sectionTitle}>Basic Details</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={APPLICATION_DATA.fullName}
            editable={false}
            selectable
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            value={APPLICATION_DATA.email}
            editable={false}
            keyboardType="email-address"
            selectable
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#eef1f3',
    borderRadius: 16,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#595c5e',
    marginLeft: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
    color: '#2c2f31',
  },
});
