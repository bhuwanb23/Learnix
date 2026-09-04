import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { QUIZZES, HEADER } from '../topic_detail/constants/topicDetailData';

export default function Quizzes({ route, navigation }) {
  const topicData = route?.params?.topicData || null;

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleOpen = (quiz) => {
    if (navigation?.navigate) {
      navigation.navigate('QuizPreview', { quizData: quiz });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>All Quizzes</Text>
          <Text style={styles.subtitle}>{topicData?.title || 'Quiz module'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {QUIZZES.map((quiz) => (
          <TouchableOpacity key={quiz.id} style={styles.card} onPress={() => handleOpen(quiz)} activeOpacity={0.85}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.quizName}>{quiz.name}</Text>
                <Text style={styles.quizModified}>{quiz.modified}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: quiz.statusBg }]}>
                <Text style={[styles.statusText, { color: quiz.statusTextColor }]}>{quiz.status}</Text>
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.metaItem}>
                <MaterialIcons name="group" size={14} color="#8a8f94" />
                <Text style={styles.metaText}>{quiz.submissions}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="trending-up" size={14} color="#8a8f94" />
                <Text style={styles.metaText}>
                  {quiz.avgScore !== null ? `${quiz.avgScore}% avg` : 'No results yet'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
            </View>
          </TouchableOpacity>
        ))}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e9eb',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
  },
  subtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#8a8f94',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e8ec',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  cardInfo: {
    flex: 1,
  },
  quizName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 3,
  },
  quizModified: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#8a8f94',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f4',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: '#595c5e',
  },
});