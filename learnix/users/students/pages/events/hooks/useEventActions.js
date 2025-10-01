import { useState } from 'react';
import { Alert } from 'react-native';

export const useEventActions = () => {
  const [loading, setLoading] = useState(false);

  const handleJoinEvent = async (event) => {
    try {
      setLoading(true);
      
      if (event.price === 'Free') {
        Alert.alert(
          'Join Event',
          `Are you sure you want to join "${event.title}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Join',
              onPress: () => {
                console.log('Joining event:', event.id);
                // Handle join logic
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Purchase Required',
          `This event costs ${event.price}. Would you like to proceed with payment?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Purchase',
              onPress: () => {
                console.log('Purchasing event:', event.id);
                // Handle purchase logic
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error joining event:', error);
      Alert.alert('Error', 'Failed to join event');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (group) => {
    try {
      setLoading(true);
      
      Alert.alert(
        'Join Group',
        `Are you sure you want to join "${group.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: () => {
              console.log('Joining group:', group.id);
              // Handle join logic
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleEventPress = (event) => {
    console.log('Event pressed:', event.id);
    // Navigate to event details
  };

  const handleGroupPress = (group) => {
    console.log('Group pressed:', group.id);
    // Navigate to group details
  };

  const handleFilterChange = (filterId) => {
    console.log('Filter changed:', filterId);
    // Handle filter change
  };

  const handleSearch = (query) => {
    console.log('Search query:', query);
    // Handle search
  };

  const handleShareEvent = (event) => {
    console.log('Sharing event:', event.id);
    // Handle share
  };

  const handleBookmarkEvent = (event) => {
    console.log('Bookmarking event:', event.id);
    // Handle bookmark
  };

  const handleReportEvent = (event) => {
    Alert.alert(
      'Report Event',
      'Are you sure you want to report this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            console.log('Reporting event:', event.id);
            // Handle report
          },
        },
      ]
    );
  };

  return {
    loading,
    handleJoinEvent,
    handleJoinGroup,
    handleEventPress,
    handleGroupPress,
    handleFilterChange,
    handleSearch,
    handleShareEvent,
    handleBookmarkEvent,
    handleReportEvent,
  };
};
