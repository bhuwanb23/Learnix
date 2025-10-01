import { useState, useEffect } from 'react';
import { PROFILE_STATS, HABITS, ACHIEVEMENTS, WALLET_TRANSACTIONS } from '../constants/profileData';

export const useProfile = () => {
  const [stats, setStats] = useState(PROFILE_STATS);
  const [habits, setHabits] = useState(HABITS);
  const [achievements, setAchievements] = useState(ACHIEVEMENTS);
  const [transactions, setTransactions] = useState(WALLET_TRANSACTIONS);
  const [loading, setLoading] = useState(false);

  const toggleHabit = (habitId) => {
    setHabits(prevHabits =>
      prevHabits.map(habit =>
        habit.id === habitId
          ? { ...habit, completed: !habit.completed }
          : habit
      )
    );
  };

  const getCompletedHabitsCount = () => {
    return habits.filter(habit => habit.completed).length;
  };

  const getTotalHabitsCount = () => {
    return habits.length;
  };

  const getTotalPoints = () => {
    return habits
      .filter(habit => habit.completed)
      .reduce((total, habit) => total + habit.points, 0);
  };

  const getWellBeingScore = () => {
    const completedCount = getCompletedHabitsCount();
    const totalCount = getTotalHabitsCount();
    return Math.round((completedCount / totalCount) * 100);
  };

  const updateStats = () => {
    setStats(prevStats => ({
      ...prevStats,
      wellBeingScore: getWellBeingScore(),
    }));
  };

  useEffect(() => {
    updateStats();
  }, [habits]);

  return {
    stats,
    habits,
    achievements,
    transactions,
    loading,
    toggleHabit,
    getCompletedHabitsCount,
    getTotalHabitsCount,
    getTotalPoints,
    getWellBeingScore,
  };
};
