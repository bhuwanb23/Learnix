import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const RecentUploads = ({ recentUploads, onUploadAction }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Uploads</Text>
      
      <View style={styles.uploadsList}>
        {recentUploads.map((upload) => (
          <View key={upload.id} style={styles.uploadItem}>
            <View style={[styles.fileIcon, { backgroundColor: upload.color + '20' }]}>
              <Text style={styles.fileIconText}>{upload.icon}</Text>
            </View>
            
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {upload.name}
              </Text>
              <Text style={styles.fileDetails}>
                {upload.timeAgo} • {upload.size}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onUploadAction(upload.id, 'menu')}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>⋮</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  uploadsList: {
    gap: 12
  },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  fileIconText: {
    fontSize: 16
  },
  fileInfo: {
    flex: 1,
    minWidth: 0
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2
  },
  fileDetails: {
    fontSize: 12,
    color: '#6B7280'
  },
  actionButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionIcon: {
    fontSize: 16,
    color: '#9CA3AF'
  }
});

export default RecentUploads;
