import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

// Professional clock icon component
const ClockIcon = () => (
  <View style={styles.clockIcon}>
    <View style={styles.clockFace}>
      <View style={styles.clockHands}>
        <View style={styles.hourHand} />
        <View style={styles.minuteHand} />
      </View>
      <View style={styles.clockCenter} />
    </View>
  </View>
);

export default function ScheduleWidget({ scheduleData }) {
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
        <Text style={styles.title}>Today's Schedule</Text>
        <ClockIcon />
      </View>

      <View style={styles.scheduleList}>
        {scheduleData.map((classItem, index) => (
          <ScheduleItem
            key={classItem.id}
            classItem={classItem}
            isLast={index === scheduleData.length - 1}
            delay={index * 100}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function ScheduleItem({ classItem, isLast, delay = 0 }) {
  const isActive = classItem.isActive;
  const isNext = classItem.status === 'next';
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
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
    <Animated.View style={[
      styles.scheduleItem,
      isActive && styles.activeScheduleItem,
      !isLast && styles.scheduleItemBorder,
      { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }
    ]}>
      <View style={[
        styles.leftBorder,
        isActive && styles.activeLeftBorder,
      ]} />
      
      <View style={styles.content}>
        <View style={styles.classInfo}>
          <Text style={[
            styles.className,
            isActive && styles.activeClassName,
          ]}>
            {classItem.subject}
          </Text>
          <Text style={styles.classDetails}>
            {classItem.room} • {classItem.professor}
          </Text>
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={[
            styles.time,
            isActive && styles.activeTime,
          ]}>
            {classItem.time}
          </Text>
          {isNext && (
            <View style={styles.nextBadge}>
              <Text style={styles.nextLabel}>Next</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  clockIcon: {
    width: 20,
    height: 20,
  },
  clockFace: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    position: 'relative',
    backgroundColor: 'white',
  },
  clockHands: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    right: 1.5,
    bottom: 1.5,
  },
  hourHand: {
    position: 'absolute',
    top: 5,
    left: 8.5,
    width: 1.5,
    height: 5,
    backgroundColor: '#2563eb',
    borderRadius: 0.75,
  },
  minuteHand: {
    position: 'absolute',
    top: 3,
    left: 8.5,
    width: 1,
    height: 7,
    backgroundColor: '#2563eb',
    borderRadius: 0.5,
  },
  clockCenter: {
    position: 'absolute',
    top: 8.5,
    left: 8.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#2563eb',
  },
  scheduleList: {
    gap: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeScheduleItem: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  scheduleItemBorder: {
    marginBottom: 8,
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  activeLeftBorder: {
    backgroundColor: '#2563eb',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 6,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  activeClassName: {
    color: '#1f2937',
    fontWeight: '700',
  },
  classDetails: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTime: {
    color: '#2563eb',
    fontWeight: '700',
  },
  nextBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  nextLabel: {
    fontSize: 8,
    color: 'white',
    fontWeight: '600',
  },
});
