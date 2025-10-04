import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const QuickActions = ({ 
  actions, 
  onActionPress 
}) => {
  const renderActionButton = (action) => {
    if (action.type === 'primary') {
      return (
        <TouchableOpacity
          key={action.id}
          style={styles.primaryButton}
          onPress={() => onActionPress(action.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonIcon}>{action.icon}</Text>
            <Text style={styles.primaryButtonText}>{action.label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={action.id}
        style={styles.secondaryButton}
        onPress={() => onActionPress(action.id)}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryButtonIcon}>{action.icon}</Text>
        <Text style={styles.secondaryButtonText}>{action.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        {actions.map(renderActionButton)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12
  },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden'
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  primaryButtonIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 8
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  secondaryButtonIcon: {
    fontSize: 14,
    color: '#2563EB',
    marginRight: 8
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB'
  }
});

export default QuickActions;
