import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import OverviewInsightsPage from './overview_insights/overview_insights';
import { WEAK_TOPICS_COLORS } from './overview_insights/constants/weakTopicsData';

export default function WeakTopicsPage({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2563eb" />
      <OverviewInsightsPage navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WEAK_TOPICS_COLORS.surface,
  },
});
