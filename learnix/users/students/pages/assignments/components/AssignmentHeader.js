import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';

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
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f7f9',
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#7b9cff',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  calendarButton: {
    padding: 8,
  },
  calendarIcon: {
    fontSize: 24,
  },
});
