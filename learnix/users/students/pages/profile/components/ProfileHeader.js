import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileHeader({ user }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        {/* Title and Edit Button Row */}
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Student Profile</Text>
          <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
            <MaterialIcons name="edit" size={16} color="#0050d4" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* User Info Row */}
        <View style={styles.userRow}>
          <Image
            source={{ uri: user.avatar }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            
            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <MaterialIcons name="badge" size={16} color="#595c5e" />
                <Text style={styles.metaText}>{user.rollNo}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="email" size={16} color="#595c5e" />
                <Text style={styles.metaText}>{user.email}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="domain" size={16} color="#595c5e" />
                <Text style={styles.metaText}>{user.department}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    borderBottomWidth: 1, // border-b
    borderBottomColor: 'rgba(171, 173, 175, 0.3)', // border-outline-variant/30
    paddingTop: 32, // pt-8
    paddingBottom: 32, // pb-8
    paddingHorizontal: 24, // px-6
  },
  headerContent: {
    maxWidth: 1280, // max-w-7xl
    alignSelf: 'center',
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32, // mb-8
  },
  pageTitle: {
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5, // tracking-tight
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // gap-2
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    backgroundColor: 'rgba(0, 80, 212, 0.1)', // bg-primary/10
    borderRadius: 999, // rounded-full
  },
  editButtonText: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#0050d4', // text-primary
    fontFamily: 'Manrope-Bold',
  },
  userRow: {
    flexDirection: 'column', // flex-col md:flex-row (mobile first)
    alignItems: 'flex-start', // md:items-center
    gap: 24, // gap-6
  },
  avatar: {
    width: 96, // w-24
    height: 96, // h-24
    borderRadius: 48, // rounded-full
    borderWidth: 4, // border-4
    borderColor: '#ffffff', // border-surface-container-lowest
    shadowColor: '#000', // shadow-md
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 30, // text-3xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 16, // mb-4
  },
  metaInfo: {
    flexDirection: 'column', // flex-col md:flex-row
    flexWrap: 'wrap',
    gap: 16, // gap-4 md:gap-6
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // gap-2
  },
  metaText: {
    fontSize: 14, // text-sm
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
  },
});
