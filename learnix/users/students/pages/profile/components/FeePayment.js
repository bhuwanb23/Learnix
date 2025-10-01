import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FeePayment({ fees, visible, onClose, onPay }) {
  const [selectedPayment, setSelectedPayment] = useState('wallet');
  const [selectedFees, setSelectedFees] = useState([]);

  const paymentMethods = [
    {
      id: 'wallet',
      title: 'Campus Wallet',
      subtitle: 'Balance: $245.80',
      icon: 'wallet-outline',
      color: '#06b6d4',
    },
    {
      id: 'card',
      title: 'Credit/Debit Card',
      subtitle: 'Secure payment',
      icon: 'card-outline',
      color: '#2563eb',
    },
  ];

  const toggleFeeSelection = (feeId) => {
    setSelectedFees(prev => 
      prev.includes(feeId) 
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    );
  };

  const getTotalAmount = () => {
    return selectedFees.reduce((total, feeId) => {
      const fee = fees.find(f => f.id === feeId);
      return total + (fee ? fee.amount : 0);
    }, 0);
  };

  const handlePay = () => {
    if (selectedFees.length > 0) {
      onPay({
        fees: selectedFees,
        paymentMethod: selectedPayment,
        totalAmount: getTotalAmount(),
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fee Payment</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outstanding Fees</Text>
            {fees.map((fee) => (
              <TouchableOpacity
                key={fee.id}
                style={[
                  styles.feeCard,
                  { backgroundColor: fee.backgroundColor, borderColor: fee.color + '40' },
                  selectedFees.includes(fee.id) && styles.selectedFeeCard,
                ]}
                onPress={() => toggleFeeSelection(fee.id)}
                activeOpacity={0.7}
              >
                <View style={styles.feeInfo}>
                  <Text style={styles.feeTitle}>{fee.title}</Text>
                  <Text style={styles.feeDueDate}>Due: {fee.dueDate}</Text>
                </View>
                <View style={styles.feeAmountContainer}>
                  <Text style={[styles.feeAmount, { color: fee.color }]}>
                    ${fee.amount}
                  </Text>
                  <Text style={[styles.feeStatus, { color: fee.color }]}>
                    {fee.status === 'overdue' ? 'Overdue' : 
                     fee.status === 'due_soon' ? 'Due Soon' : 'Upcoming'}
                  </Text>
                </View>
                {selectedFees.includes(fee.id) && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark" size={16} color="#2563eb" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  selectedPayment === method.id && styles.selectedPaymentCard,
                ]}
                onPress={() => setSelectedPayment(method.id)}
                activeOpacity={0.7}
              >
                <View style={styles.paymentMethodInfo}>
                  <View style={[styles.paymentIcon, { backgroundColor: method.color + '20' }]}>
                    <Ionicons name={method.icon} size={20} color={method.color} />
                  </View>
                  <View style={styles.paymentMethodDetails}>
                    <Text style={styles.paymentMethodTitle}>{method.title}</Text>
                    <Text style={styles.paymentMethodSubtitle}>{method.subtitle}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedPayment === method.id && styles.selectedRadioButton,
                ]}>
                  {selectedPayment === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {selectedFees.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>${getTotalAmount()}</Text>
            </View>
            <TouchableOpacity style={styles.payButton} onPress={handlePay}>
              <Text style={styles.payButtonText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  feeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    position: 'relative',
  },
  selectedFeeCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  feeInfo: {
    flex: 1,
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  feeDueDate: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.1,
  },
  feeAmountContainer: {
    alignItems: 'flex-end',
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  feeStatus: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  selectedPaymentCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  paymentMethodSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioButton: {
    borderColor: '#2563eb',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  payButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
});
