import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function CampusWallet({ walletInfo }) {
  return (
    <LinearGradient
      colors={['#0050d4', '#0046bb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.walletTitle}>Scholar Wallet</Text>
            <Text style={styles.walletSubtitle}>ID: **** 8842</Text>
          </View>
          <MaterialIcons name="contactless" size={24} color="#ffffff" style={{ opacity: 0.8 }} />
        </View>

        {/* Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>${walletInfo.balance.toFixed(2)}</Text>
        </View>

        {/* Pending Dues Section */}
        <View style={styles.duesContainer}>
          {walletInfo.dues.map((due, index) => (
            <View key={index} style={styles.dueItem}>
              <Text style={styles.dueTitle}>{due.title}</Text>
              <Text style={styles.dueAmount}>${due.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.addFundsBtn]} activeOpacity={0.8}>
            <MaterialIcons name="add" size={16} color="#0050d4" />
            <Text style={styles.addFundsText}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.payDuesBtn]} activeOpacity={0.8}>
            <Text style={styles.payDuesText}>Pay Dues</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12, // rounded-xl
    padding: 32, // p-8
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  bgShape1: {
    position: 'absolute',
    top: -80, // -top-20
    right: -80, // -right-20
    width: 256, // w-64
    height: 256, // h-64
    borderRadius: 128, // rounded-full
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // bg-white/10
  },
  bgShape2: {
    position: 'absolute',
    bottom: -64, // -bottom-16
    left: -64, // -left-16
    width: 192, // w-48
    height: 192, // h-48
    borderRadius: 96, // rounded-full
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // bg-white/10
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32, // mb-8
  },
  walletTitle: {
    fontSize: 16, // text-base
    fontWeight: '700', // font-bold
    color: '#ffffff', // text-white
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 4, // mb-1
  },
  walletSubtitle: {
    fontSize: 12, // text-xs
    color: 'rgba(255, 255, 255, 0.7)', // text-white/70
    fontFamily: 'Manrope-Medium',
  },
  balanceSection: {
    marginBottom: 32, // mb-8
  },
  balanceLabel: {
    fontSize: 12, // text-xs
    color: 'rgba(255, 255, 255, 0.8)', // text-white/80
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
    marginBottom: 4, // mb-1
  },
  balanceAmount: {
    fontSize: 36, // text-4xl
    fontWeight: '800', // font-extrabold
    color: '#ffffff', // text-white
    fontFamily: 'PlusJakartaSans-ExtraBold',
    letterSpacing: -0.5, // tracking-tight
  },
  duesContainer: {
    gap: 12, // space-y-3
    marginBottom: 32, // mb-8
  },
  dueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8, // py-2
    borderBottomWidth: 1, // border-b
    borderBottomColor: 'rgba(255, 255, 255, 0.1)', // border-white/10
  },
  dueTitle: {
    fontSize: 14, // text-sm
    color: 'rgba(255, 255, 255, 0.9)', // text-white/90
    fontFamily: 'Manrope-Medium',
  },
  dueAmount: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#ffffff', // text-white
    fontFamily: 'Manrope-Bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 16, // gap-4
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // py-3
    borderRadius: 8, // rounded-lg
    gap: 8, // gap-2
  },
  addFundsBtn: {
    backgroundColor: '#ffffff', // bg-white
  },
  addFundsText: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#0050d4', // text-primary
    fontFamily: 'Manrope-Bold',
  },
  payDuesBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // bg-white/20
  },
  payDuesText: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#ffffff', // text-white
    fontFamily: 'Manrope-Bold',
  },
});
