import { useState, useEffect } from 'react';
import {
  MOCK_EXAMS,
  EXAM_TABS,
  STUDENT_STATS,
  CALENDAR_DATA,
  PRACTICE_CATEGORIES,
  EXAM_STATUS,
} from '../constants/examData';

export default function useExams() {
  const [activeTab, setActiveTab] = useState('overview');
  const [exams, setExams] = useState(MOCK_EXAMS);
  const [stats, setStats] = useState({
    upcomingCount: 0,
    completedCount: 0,
    averageScore: 0,
    totalExams: 0,
    topSubjects: [],
    improvementAreas: []
  });
  const [calendarData, setCalendarData] = useState(CALENDAR_DATA);
  const [practiceCategories, setPracticeCategories] = useState(PRACTICE_CATEGORIES);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading exams data
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // Calculate stats when exams data changes
  useEffect(() => {
    const upcomingExams = getUpcomingExams();
    const completedExams = getCompletedExams();
    const practiceExams = getPracticeExams();
    
    console.log('Upcoming exams:', upcomingExams);
    console.log('Completed exams:', completedExams);
    console.log('Practice exams:', practiceExams);
    
    const averageScore = completedExams.length > 0 
      ? completedExams.reduce((sum, exam) => sum + exam.score, 0) / completedExams.length 
      : 0;
    
    const subjects = [...upcomingExams, ...completedExams].map(exam => exam.subject);
    const uniqueSubjects = [...new Set(subjects)];
    
    const newStats = {
      upcomingCount: upcomingExams.length,
      completedCount: completedExams.length,
      averageScore: Math.round(averageScore * 10) / 10,
      totalExams: upcomingExams.length + completedExams.length + practiceExams.length,
      topSubjects: uniqueSubjects.slice(0, 3),
      improvementAreas: ['Mathematics', 'Calculus'] // Could be calculated from low scores
    };
    
    console.log('New stats:', newStats);
    setStats(newStats);
  }, [exams]);

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
  };

  const handleExamPress = (exam) => {
    setSelectedExam(exam);
    
    if (exam.status === EXAM_STATUS.UPCOMING) {
      if (exam.canStart) {
        // Start exam logic
        console.log('Starting exam:', exam.title);
        // Here you would navigate to exam interface
      } else {
        setIsModalVisible(true);
      }
    } else if (exam.status === EXAM_STATUS.COMPLETED) {
      setIsModalVisible(true);
    } else {
      // Practice exam logic
      console.log('Starting practice exam:', exam.title);
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedExam(null);
  };

  const handlePracticeExamStart = async (examType) => {
    setLoading(true);
    try {
      // Simulate starting practice exam
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`Starting ${examType} practice exam`);
      // Here you would navigate to the practice exam interface
      
    } catch (err) {
      setError(err.message || 'Failed to start practice exam');
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingExams = () => {
    return exams.upcoming
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getCompletedExams = () => {
    return exams.completed
      .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
  };

  const getPracticeExams = () => {
    return exams.practiceTests;
  };

  const refreshExams = async () => {
    setLoading(true);
    try {
      // Simulate API refresh
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update stats
      const updatedStats = {
        ...stats,
        upcomingCount: getUpcomingExams().length,
        completedCount: getCompletedExams().length,
      };
      setStats(updatedStats);
      setError(null);
      
    } catch (err) {
      setError(err.message || 'Failed to refresh exams');
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarDayPress = (day) => {
    console.log('Calendar day pressed:', day);
    // You could show a modal with events for that day
  };

  return {
    // State
    activeTab,
    exams: {
      upcoming: getUpcomingExams(),
      completed: getCompletedExams(),
      practice: getPracticeExams(),
      categories: practiceCategories,
    },
    stats,
    calendarData,
    tabs: EXAM_TABS,
    selectedExam,
    isModalVisible,
    loading,
    error,

    // Actions
    handleTabPress,
    handleExamPress,
    handleCloseModal,
    handlePracticeExamStart,
    refreshExams,
    handleCalendarDayPress,
  };
}
