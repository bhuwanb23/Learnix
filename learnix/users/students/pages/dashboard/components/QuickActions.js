import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

// Professional icon components
const ClassIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.iconShape}>
      <View style={styles.iconInner} />
    </View>
  </View>
);

const AssignmentIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.iconShape}>
      <View style={styles.iconLines}>
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={[styles.line, styles.lineShort]} />
      </View>
    </View>
  </View>
);

const EventIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.iconShape}>
      <View style={styles.calendarGrid}>
        <View style={styles.calendarHeader} />
        <View style={styles.calendarBody}>
          <View style={styles.calendarDot} />
        </View>
      </View>
    </View>
  </View>
);

const ProfileIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.iconShape}>
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
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((action) => {
          const IconComponent = getIconComponent(action.id);
          return (
            <ActionButton
              key={action.id}
              action={action}
              IconComponent={IconComponent}
              onPress={() => onActionPress(action.id)}
            />
          );
        })}
      </View>
    </View>
  );
}

function ActionButton({ action, IconComponent, onPress }) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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
    <Animated.View style={{ opacity: opacityAnim }}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <IconComponent />
          <Text style={styles.label}>{action.label}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 70,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconShape: {
    width: 24,
    height: 24,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 12,
    height: 12,
    backgroundColor: 'white',
    borderRadius: 3,
  },
  iconLines: {
    width: 16,
    height: 16,
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  line: {
    height: 1.5,
    backgroundColor: 'white',
    borderRadius: 0.75,
  },
  lineShort: {
    width: '60%',
  },
  calendarGrid: {
    width: 16,
    height: 16,
    backgroundColor: 'transparent',
  },
  calendarHeader: {
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
    marginBottom: 1.5,
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
  profileHead: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 1.5,
  },
  profileBody: {
    width: 12,
    height: 6,
    backgroundColor: 'white',
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
    numberOfLines: 1,
  },
});
