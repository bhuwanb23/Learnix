import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Modern gradient icon components
const ClassIcon = () => (
  <LinearGradient
    colors={['#667eea', '#764ba2']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.gradientIcon}
  >
    <View style={styles.iconInner}>
      <View style={styles.classIcon}>
        <View style={styles.classBoard} />
        <View style={styles.classDesk} />
      </View>
    </View>
  </LinearGradient>
);

const AssignmentIcon = () => (
  <LinearGradient
    colors={['#f093fb', '#f5576c']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.gradientIcon}
  >
    <View style={styles.iconInner}>
      <View style={styles.assignmentIcon}>
        <View style={styles.docLines}>
          <View style={styles.docLine} />
          <View style={styles.docLine} />
          <View style={[styles.docLine, styles.docLineShort]} />
        </View>
      </View>
    </View>
  </LinearGradient>
);

const EventIcon = () => (
  <LinearGradient
    colors={['#4facfe', '#00f2fe']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.gradientIcon}
  >
    <View style={styles.iconInner}>
      <View style={styles.eventIcon}>
        <View style={styles.calendarFrame}>
          <View style={styles.calendarHeader} />
          <View style={styles.calendarBody}>
            <View style={styles.calendarDot} />
          </View>
        </View>
      </View>
    </View>
  </LinearGradient>
);

const ProfileIcon = () => (
  <LinearGradient
    colors={['#43e97b', '#38f9d7']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.gradientIcon}
  >
    <View style={styles.iconInner}>
      <View style={styles.profileIcon}>
        <View style={styles.profileHead} />
        <View style={styles.profileBody} />
      </View>
    </View>
  </LinearGradient>
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
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Access your most used features</Text>
        </View>
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
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={styles.iconContainer}>
            <IconComponent />
          </View>
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
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    display: 'flex',
    width: 150, // Calculate exact width for 2 columns with margins
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 8,
  },
  gradientIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconInner: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Class Icon Styles
  classIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classBoard: {
    width: 12,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 1,
    marginBottom: 1,
  },
  classDesk: {
    width: 8,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  // Assignment Icon Styles
  assignmentIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docLines: {
    width: 12,
    height: 12,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  docLine: {
    height: 1.5,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  docLineShort: {
    width: '70%',
  },
  // Event Icon Styles
  eventIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarFrame: {
    width: 12,
    height: 12,
    backgroundColor: 'transparent',
  },
  calendarHeader: {
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1,
    marginBottom: 1,
  },
  calendarBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDot: {
    width: 3,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  // Profile Icon Styles
  profileIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHead: {
    width: 8,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 4,
    marginBottom: 1,
  },
  profileBody: {
    width: 10,
    height: 6,
    backgroundColor: 'white',
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 2,
    fontFamily: 'Inter-SemiBold',
  },
  description: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
});

