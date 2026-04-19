import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ProfileHero({ profile }) {
  return (
    <View style={styles.container}>
      <View style={styles.photoSection}>
        <View style={styles.photoContainer}>
          <View style={styles.photo}>
            <MaterialIcons name="person" size={80} color="#595c5e" />
          </View>
          {profile.verified && (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={24} color="#ffffff" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.titleText}>{profile.title}</Text>

        <View style={styles.contactRow}>
          <View style={styles.contactBadge}>
            <MaterialIcons name="mail" size={16} color="#0050d4" />
            <Text style={styles.contactText}>{profile.email}</Text>
          </View>
          <View style={styles.contactBadge}>
            <MaterialIcons name="location-on" size={16} color="#0050d4" />
            <Text style={styles.contactText}>{profile.office}</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cvButton} activeOpacity={0.85}>
            <Text style={styles.cvButtonText}>Download Curriculum Vitae</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} activeOpacity={0.85}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 48,
    gap: 24,
  },
  photoSection: {
    position: 'relative',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#eef1f3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0050d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  infoSection: {
    flex: 1,
  },
  name: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  titleText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#0050d4',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  contactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef1f3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  contactText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#595c5e',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cvButton: {
    flex: 1,
    backgroundColor: '#0050d4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cvButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#dfe3e6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
  },
});
