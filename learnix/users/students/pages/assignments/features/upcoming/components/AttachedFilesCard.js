import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UPCOMING_ASSIGNMENT_COLORS } from '../constants/upcomingAssignmentData';

export default function AttachedFilesCard({ files }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="attachment" size={20} color={UPCOMING_ASSIGNMENT_COLORS.primary} />
        <Text style={styles.title}>Attached Files</Text>
      </View>

      <View style={styles.filesList}>
        {files.map((file) => (
          <TouchableOpacity
            key={file.id}
            style={styles.fileItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Download', `Downloading ${file.name}…`)}
          >
            <View style={styles.fileInfo}>
              <MaterialIcons name="picture-as-pdf" size={20} color={UPCOMING_ASSIGNMENT_COLORS.error} />
              <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            </View>
            <MaterialIcons name="download" size={18} color={UPCOMING_ASSIGNMENT_COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: UPCOMING_ASSIGNMENT_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
  },
  filesList: {
    gap: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: UPCOMING_ASSIGNMENT_COLORS.surfaceContainerLow,
    padding: 10,
    borderRadius: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
  },
});
