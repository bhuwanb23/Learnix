import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ResumeUpload() {
  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="cloud-upload" size={22} color="#702ae1" />
          </View>
          <Text style={styles.sectionTitle}>Resume Upload</Text>
        </View>

        <TouchableOpacity style={styles.uploadArea} activeOpacity={0.7}>
          <View style={styles.uploadIconContainer}>
            <MaterialIcons name="description" size={40} color="#a23800" />
          </View>
          <Text style={styles.uploadTitle}>Upload your resume</Text>
          <Text style={styles.uploadSubtitle}>PDF, DOCX up to 10MB</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
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
    backgroundColor: 'rgba(112, 42, 225, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(171, 173, 175, 0.4)',
    borderRadius: 14,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 247, 249, 0.5)',
  },
  uploadIconContainer: {
    width: 72,
    height: 72,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 6,
  },
  uploadSubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
});
