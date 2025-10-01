import { useState, useEffect } from 'react';
import { mockAssignments } from '../constants/assignmentData';

export const useAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate API call
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAssignments(mockAssignments);
        setError(null);
      } catch (err) {
        setError('Failed to fetch assignments');
        console.error('Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  const updateAssignment = (assignmentId, updates) => {
    setAssignments(prevAssignments =>
      prevAssignments.map(assignment =>
        assignment.id === assignmentId
          ? { ...assignment, ...updates }
          : assignment
      )
    );
  };

  const addAssignment = (newAssignment) => {
    setAssignments(prevAssignments => [...prevAssignments, newAssignment]);
  };

  const deleteAssignment = (assignmentId) => {
    setAssignments(prevAssignments =>
      prevAssignments.filter(assignment => assignment.id !== assignmentId)
    );
  };

  const getAssignmentById = (assignmentId) => {
    return assignments.find(assignment => assignment.id === assignmentId);
  };

  const getAssignmentsByStatus = (status) => {
    return assignments.filter(assignment => assignment.status === status);
  };

  const getOverdueAssignments = () => {
    const now = new Date();
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.dueDate);
      return dueDate < now && assignment.status !== 'submitted';
    });
  };

  const getUpcomingAssignments = (days = 7) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.dueDate);
      return dueDate > now && dueDate <= futureDate;
    });
  };

  return {
    assignments,
    loading,
    error,
    updateAssignment,
    addAssignment,
    deleteAssignment,
    getAssignmentById,
    getAssignmentsByStatus,
    getOverdueAssignments,
    getUpcomingAssignments,
  };
};
