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
    marginHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 16,
    paddingHorizontal: 2,
    fontFamily: 'Plus Jakarta Sans',
  },
  scheduleList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 26,
  },
  content: {
    flex: 1,
  },
  subjectName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
    fontFamily: 'Plus Jakarta Sans',
  },
  details: {
    fontSize: 13,
    color: '#595c5e',
    fontWeight: '500',
    fontFamily: 'Manrope',
  },
  timeSection: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0050d4',
    marginBottom: 4,
    fontFamily: 'Plus Jakarta Sans',
  },
  durationBadge: {
    backgroundColor: '#e5e9eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#595c5e',
    fontFamily: 'Manrope',
  },
});
