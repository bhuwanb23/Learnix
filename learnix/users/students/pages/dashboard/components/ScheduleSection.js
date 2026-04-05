import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

export default function ScheduleSection({ scheduleData }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

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
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <Text style={styles.title}>Upcoming Classes</Text>
      
      <View style={styles.scheduleList}>
        {scheduleData.map((classItem, index) => (
          <ScheduleCard
            key={classItem.id}
            classItem={classItem}
            delay={index * 100}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function ScheduleCard({ classItem, delay = 0 }) {
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View 
      style={[
        styles.card,
        { opacity: opacityAnim, transform: [{ translateX: slideAnim }] }
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: classItem.bgColor }]}>
        <Text style={styles.icon}>{getIconEmoji(classItem.icon)}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.subjectName}>{classItem.subject}</Text>
        <Text style={styles.details}>{classItem.professor} • {classItem.room}</Text>
      </View>
      
      <View style={styles.timeSection}>
        <Text style={styles.time}>{classItem.time}</Text>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{classItem.duration}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function getIconEmoji(iconName) {
  const iconMap = {
    'functions': '📐',
    'psychology': '🧠',
    'book': '📚',
    'science': '🔬',
  };
  return iconMap[iconName] || '📖';
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  scheduleList: {
    gap: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 3,
  },
  details: {
    fontSize: 11,
    color: '#595c5e',
    fontWeight: '500',
  },
  timeSection: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0050d4',
    marginBottom: 3,
  },
  durationBadge: {
    backgroundColor: '#e5e9eb',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  durationText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#595c5e',
  },
});
