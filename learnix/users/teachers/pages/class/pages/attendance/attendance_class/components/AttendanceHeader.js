import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const AttendanceHeader = ({ 
  searchQuery, 
  onSearchChange, 
  onClearSearch,
  onBackPress
}) => {
  return (
    <View style={styles.header}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navButton} onPress={onBackPress}>
          <Text style={styles.navIcon}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Class Attendance</Text>
        
        <View style={styles.placeholder} />
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search class or subject..."
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={onClearSearch}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  navIcon: {
    fontSize: 18,
    color: '#FFFFFF'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  placeholder: {
    width: 40,
    height: 40
  },
  searchSection: {
    position: 'relative'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  searchIcon: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  clearIcon: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 'bold'
  }
});

export default AttendanceHeader;
