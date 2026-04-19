import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssignmentHeader from './components/AssignmentHeader';
import SubmissionHeatmap from './components/SubmissionHeatmap';
import ModuleCard from './components/ModuleCard';
import QuickTool from './components/QuickTool';
import PriorityAlerts from './components/PriorityAlerts';
import { HEADER, HERO, MODULES, QUICK_TOOLS, ALERTS } from './constants/data';

export default function AssignmentExamsPage({ navigation }) {
  const handleToolPress = (toolId) => {
    console.log('Tool pressed:', toolId);
    if (toolId === 'create') {
      // Navigate to create assignment
    } else if (toolId === 'export') {
      // Export grades functionality
    }
  };

  const handleModulePress = (moduleId) => {
    console.log('Module pressed:', moduleId);
    // Navigate to module details
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <AssignmentHeader header={HEADER} />

        {/* Submission Heatmap */}
        <SubmissionHeatmap hero={HERO} />

        {/* Academic Modules Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Modules</Text>
          <View style={styles.modulesGrid}>
            {MODULES.map((module) => (
              <View key={module.id} style={styles.moduleWrapper}>
                <ModuleCard
                  module={module}
                  onPress={() => handleModulePress(module.id)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Quick Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tools</Text>
          <View style={styles.toolsContainer}>
            {QUICK_TOOLS.map((tool) => (
              <QuickTool
                key={tool.id}
                tool={tool}
                onPress={() => handleToolPress(tool.id)}
              />
            ))}

            {/* Priority Alerts */}
            <PriorityAlerts alerts={ALERTS} />
          </View>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2f31',
    marginBottom: 16,
    paddingHorizontal: 24,
    letterSpacing: -0.3,
  },
  modulesGrid: {
    paddingHorizontal: 24,
    gap: 16,
  },
  moduleWrapper: {
    marginBottom: 16,
  },
  toolsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
});

