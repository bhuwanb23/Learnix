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

export default function CounselorBooking({ counselors, visible, onClose, onBook }) {
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const availableTimes = [
    '9:00 AM', '10:00 AM', '11:00 AM',
    '2:00 PM', '3:00 PM', '4:00 PM'
  ];

  const handleBook = () => {
    if (selectedCounselor && selectedDate && selectedTime) {
      onBook({
        counselor: selectedCounselor,
        date: selectedDate,
        time: selectedTime,
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
          <Text style={styles.headerTitle}>Book Counselor</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Counselors</Text>
            {counselors.map((counselor) => (
              <TouchableOpacity
                key={counselor.id}
                style={[
                  styles.counselorCard,
                  selectedCounselor?.id === counselor.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedCounselor(counselor)}
              >
                <View style={styles.counselorInfo}>
                  <View style={styles.counselorAvatar}>
                    <Text style={styles.avatarText}>
                      {counselor.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.counselorDetails}>
                    <Text style={styles.counselorName}>{counselor.name}</Text>
                    <Text style={styles.counselorTitle}>{counselor.title}</Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={styles.rating}>{counselor.rating}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.bookButton,
                    selectedCounselor?.id === counselor.id && styles.selectedBookButton,
                  ]}
                  onPress={() => setSelectedCounselor(counselor)}
                >
                  <Text style={[
                    styles.bookButtonText,
                    selectedCounselor?.id === counselor.id && styles.selectedBookButtonText,
                  ]}>
                    {selectedCounselor?.id === counselor.id ? 'Selected' : 'Select'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>

          {selectedCounselor && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date & Time</Text>
              
              <View style={styles.dateSelector}>
                <Text style={styles.timeLabel}>Available Times</Text>
                <View style={styles.timeGrid}>
                  {availableTimes.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeButton,
                        selectedTime === time && styles.selectedTimeButton,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text style={[
                        styles.timeButtonText,
                        selectedTime === time && styles.selectedTimeButtonText,
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {selectedCounselor && selectedTime && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.confirmButton} onPress={handleBook}>
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
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
  counselorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  selectedCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  counselorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  counselorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  counselorDetails: {
    flex: 1,
  },
  counselorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  counselorTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.1,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  bookButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  selectedBookButton: {
    backgroundColor: '#2563eb',
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'Inter-SemiBold',
  },
  selectedBookButtonText: {
    color: '#FFFFFF',
  },
  dateSelector: {
    marginTop: 16,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
  },
  selectedTimeButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'Inter-SemiBold',
  },
  selectedTimeButtonText: {
    color: '#FFFFFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
});
