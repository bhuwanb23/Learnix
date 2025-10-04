import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// Simple icon components with solid colors
const ClassIcon = () => (
  <View style={[styles.iconContainer, { backgroundColor: '#667eea' }]}>
    <View style={styles.classIcon}>
      <View style={styles.classBoard} />
      <View style={styles.classDesk} />
    </View>
  </View>
);

const AssignmentIcon = () => (
  <View style={[styles.iconContainer, { backgroundColor: '#f093fb' }]}>
    <View style={styles.assignmentIcon}>
      <View style={styles.docLines}>
        <View style={styles.docLine} />
        <View style={styles.docLine} />
        <View style={[styles.docLine, styles.docLineShort]} />
      </View>
    </View>
  </View>
);

const EventIcon = () => (
  <View style={[styles.iconContainer, { backgroundColor: '#4facfe' }]}>
    <View style={styles.eventIcon}>
      <View style={styles.calendarFrame}>
        <View style={styles.calendarHeader} />
        <View style={styles.calendarBody}>
          <View style={styles.calendarDot} />
        </View>
      </View>
    </View>
  </View>
);

const ProfileIcon = () => (
  <View style={[styles.iconContainer, { backgroundColor: '#43e97b' }]}>
    <View style={styles.profileIcon}>
      <View style={styles.profileHead} />
      <View style={styles.profileBody} />
    </View>
  </View>
);

const getIconComponent = (actionId) => {
  const iconMap = {
    classes: ClassIcon,
    assignments: AssignmentIcon,
    events: EventIcon,
    profile: ProfileIcon,
  };
  return iconMap[actionId] || ClassIcon;
};

export default function QuickActions({ actions, onActionPress }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Actions</Text>
        <Text style={styles.subtitle}>Access your most used features</Text>
      </View>
      
      <View style={styles.grid}>
        {actions.map((action, index) => {
          const IconComponent = getIconComponent(action.id);
          return (
            <ActionButton
              key={action.id}
              action={action}
              IconComponent={IconComponent}
              onPress={() => onActionPress(action.id)}
              delay={index * 100}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function ActionButton({ action, IconComponent, onPress, delay = 0 }) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View 
      style={[
        styles.actionButtonWrapper,
        { 
          opacity: opacityAnim, 
          transform: [{ translateY: slideAnim }] 
        }
      ]}
    >
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.buttonContent, { transform: [{ scale: scaleAnim }] }]}>
          <IconComponent />
          <Text style={styles.label}>{action.label}</Text>
          <Text style={styles.description}>{action.description || 'Tap to access'}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtonWrapper: {
    width: '48%', // 2 items per row with gap
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    height: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  // Class Icon Styles
  classIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classBoard: {
    width: 14,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 1,
    marginBottom: 2,
  },
  classDesk: {
    width: 10,
    height: 4,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  // Assignment Icon Styles
  assignmentIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docLines: {
    width: 14,
    height: 14,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  docLine: {
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  docLineShort: {
    width: '70%',
  },
  // Event Icon Styles
  eventIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarFrame: {
    width: 14,
    height: 14,
    backgroundColor: 'transparent',
  },
  calendarHeader: {
    height: 4,
    backgroundColor: 'white',
    borderRadius: 1,
    marginBottom: 2,
  },
  calendarBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDot: {
    width: 4,
    height: 4,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  // Profile Icon Styles
  profileIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHead: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 2,
  },
  profileBody: {
    width: 12,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
  },
});

