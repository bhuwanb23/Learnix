import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClassHeader from './components/ClassHeader';
import ClassCard from './components/ClassCard';
import { api } from '../../../../services/api';

const HEADER = {
  title: 'Management Grid',
  subtitle: 'Curate and oversee your academic portfolio with surgical precision.',
};

const COLORS = ['#0050d4', '#702ae1', '#a23800', '#059669', '#dc2626', '#d97706'];

export default function TeacherClassPage({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchClasses = useCallback(async () => {
    try {
      const data = await api.teacherApi.classes();
      setClasses((data || []).map((c, i) => ({
        ...c,
        id: c.id,
        code: c.code,
        title: c.title,
        students: c.students,
        schedule: c.schedule,
        color: COLORS[i % COLORS.length],
        hoverColor: COLORS[i % COLORS.length],
      })));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchClasses().finally(() => setLoading(false));
  }, [fetchClasses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchClasses();
    setRefreshing(false);
  };

  const handleViewClass = (classItem) => {
    navigation.navigate('ClassDashboard', { classData: classItem });
  };

  const handleUpload = (classItem) => {
    navigation.navigate('LectureNotes', { classData: classItem });
  };

  const handleMore = (classItem) => {
    navigation.navigate('ClassDashboard', { classData: classItem });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0050d4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0050d4']} />}
      >
        <ClassHeader header={HEADER} />

        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {classes.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classData={classItem}
                onViewPress={() => handleViewClass(classItem)}
                onUploadPress={() => handleUpload(classItem)}
                onMorePress={() => handleMore(classItem)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scrollView: { flex: 1 },
  content: { paddingBottom: 32 },
  grid: { paddingHorizontal: 24, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#dc2626', fontSize: 14, fontFamily: 'Manrope-Medium' },
});
