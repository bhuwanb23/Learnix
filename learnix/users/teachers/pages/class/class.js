import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClassHeader from './components/ClassHeader';
import ClassCard from './components/ClassCard';
import { HEADER, CLASSES } from './constants/classData';

export default function TeacherClassPage({ navigation }) {
  const handleViewClass = (classItem) => {
    navigation.navigate('ClassDashboard', { classData: classItem });
  };

  const handleUpload = (classItem) => {
    console.log('Upload notes for:', classItem.id);
    navigation.navigate('UploadNotes');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ClassHeader header={HEADER} />

        {/* Class Cards Grid */}
        <View style={styles.grid}>
          {CLASSES.map((classItem) => (
            <ClassCard
              key={classItem.id}
              classData={classItem}
              onViewPress={() => handleViewClass(classItem)}
              onUploadPress={() => handleUpload(classItem)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  grid: {
    paddingHorizontal: 24,
    gap: 16,
  },
});

