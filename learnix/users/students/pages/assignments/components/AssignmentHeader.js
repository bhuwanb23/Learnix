import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function AssignmentHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNajYZF0IjC_4iAKdhpxkCHNIeeHudzh95LbOHyzFvDJ3sO4ZuocbNazFcfwLkmp0yimgBGXoJ9BnJ_Cw2AuS_wxuoJUoKN5EBxi2twywuZQB9pa667OYvDLGKaDpDmg9goPdBI_NxvCP_pz8d2IMdbwO9G-SvmXMouuS4u1iAxuz-GD35ZqdRiuHfSCueI1HZMNpmWub9Pxa2sCt1sL4VhfAOqxaw8x8OdVAuo_06n_ku6U_Q7E4_Rc7NxbJ2mJG7BIL8_RsZ6hA',
              }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.title}>Assignments</Text>
        </View>

        <TouchableOpacity style={styles.calendarButton} activeOpacity={0.7}>
          <MaterialIcons name="calendar-today" size={24} color="#2c2f31" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f7f9',
    paddingTop: 24, // pt-6
    paddingBottom: 8, // pb-2
    paddingHorizontal: 24, // px-6
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 1280, // max-w-7xl roughly
    alignSelf: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // gap-4
  },
  avatarContainer: {
    width: 48, // w-12
    height: 48, // h-12
    borderRadius: 24, // rounded-full
    overflow: 'hidden',
    borderWidth: 2, // border-2
    borderColor: '#7b9cff', // border-primary-container
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 20, // text-xl
    fontWeight: '700', // font-bold
    color: '#0050d4', // text-[#0050d4]
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5, // tracking-tight
  },
  calendarButton: {
    padding: 8, // p-2
  },
});
