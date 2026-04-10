import React from 'react';
import { View, StyleSheet } from 'react-native';
import OverviewInsightsPage from './overview_insights/overview_insights';
import { WEAK_TOPICS_COLORS } from './overview_insights/constants/weakTopicsData';

export default function WeakTopicsPage({ navigation }) {
  return (
    <View style={styles.container}>
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
