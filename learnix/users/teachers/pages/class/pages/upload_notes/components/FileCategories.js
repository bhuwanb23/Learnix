import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

const FileCategories = ({ 
  subjects, 
  fileTypes, 
  uploadForm, 
  onFormChange 
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categorize Your Upload</Text>
      
      <View style={styles.formContainer}>
        {/* Subject Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Subject</Text>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownText}>{uploadForm.subject}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </View>
        </View>

        {/* Date and Type Row */}
        <View style={styles.rowContainer}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputText}>{uploadForm.date}</Text>
            </View>
          </View>
          
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownText}>{uploadForm.type}</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  formContainer: {
    gap: 12
  },
  fieldContainer: {
    marginBottom: 4
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF'
  },
  dropdownText: {
    fontSize: 14,
    color: '#111827'
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6B7280'
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12
  },
  halfField: {
    flex: 1
  },
  inputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF'
  },
  inputText: {
    fontSize: 14,
    color: '#111827'
  }
});

export default FileCategories;
