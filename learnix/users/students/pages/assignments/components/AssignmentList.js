import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import ActiveAssignmentCard from './ActiveAssignmentCard';
import UpcomingAssignmentCard from './UpcomingAssignmentCard';
import CompletedUnderReviewCard from './CompletedUnderReviewCard';
import CompletedPublishedCard from './CompletedPublishedCard';

export default function AssignmentList({ assignments, onAssignmentPress, activeTab }) {
  const renderCard = (assignment) => {
    const tab = activeTab?.toLowerCase() || 'active';
    
    switch (tab) {
      case 'active':
        return (
          <ActiveAssignmentCard
            key={assignment.id}
            assignment={assignment}
            onPress={onAssignmentPress}
          />
        );
      case 'upcoming':
        return (
          <UpcomingAssignmentCard
            key={assignment.id}
            assignment={assignment}
            onPress={onAssignmentPress}
          />
        );
      case 'completed':
        // Check if assignment is under review or published
        if (assignment.underReview) {
          return (
            <CompletedUnderReviewCard
              key={assignment.id}
              assignment={assignment}
              onPress={onAssignmentPress}
            />
          );
        }
        return (
          <CompletedPublishedCard
            key={assignment.id}
            assignment={assignment}
            onPress={onAssignmentPress}
          />
        );
      default:
        return (
          <ActiveAssignmentCard
            key={assignment.id}
            assignment={assignment}
            onPress={onAssignmentPress}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {assignments.map((assignment) => renderCard(assignment))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
});
