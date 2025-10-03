import { useState, useEffect } from 'react';
import { MOCK_ASSIGNMENTS, ASSIGNMENT_STATUS } from '../constants/assignmentData';

export default function useAssignments() {
  const [assignments, setAssignments] = useState(MOCK_ASSIGNMENTS);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
  };

  const handleAssignmentPress = (assignment) => {
    if (assignment.status === ASSIGNMENT_STATUS.NOT_STARTED || 
        assignment.status === ASSIGNMENT_STATUS.IN_PROGRESS ||
        assignment.status === ASSIGNMENT_STATUS.READY_TO_SUBMIT) {
      setSelectedAssignment(assignment);
      setIsModalVisible(true);
    } else {
      // For submitted and graded assignments, just log for now
      console.log('Viewing assignment:', assignment.title);
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedAssignment(null);
  };

  const handleSubmitAssignment = async (assignmentId, files) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update assignment status
      setAssignments(prevAssignments => ({
        ...prevAssignments,
        pending: prevAssignments.pending.filter(a => a.id !== assignmentId),
        submitted: [
          ...prevAssignments.submitted,
          {
            id: assignmentId,
            title: assignments.pending.find(a => a.id === assignmentId)?.title,
            course: assignments.pending.find(a => a._id === assignmentId)?.course,
            courseCode: assignments.pending.find(a => a.id === assignmentId)?.courseCode,
            submittedDate: new Date().toISOString().split('T')[0],
            status: ASSIGNMENT_STATUS.SUBMITTED,
            fileName: files.join(', '),
            description: assignments.pending.find(a => a.id === assignmentId)?.description,
          }
        ]
      }));
      
      console.log('Assignment submitted successfully:', { assignmentId, files });
    } catch (err) {
      setError(err.message || 'Failed to submit assignment');
    } finally {
      setLoading(false);
    }
  };

  const refreshAssignments = async () => {
    setLoading(true);
    try {
      // Simulate API refresh
      await new Promise(resolve => setTimeout(resolve, 800));
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to refresh assignments');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentAssignments = () => {
    return assignments[activeTab] || [];
  };

  const getAssignmentsCount = () => {
    return {
      pending: assignments.pending.length,
      submitted: assignments.submitted.length,
      graded: assignments.graded.length,
    };
  };

  useEffect(() => {
    // Simulate initial data loading
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  return {
    assignments: getCurrentAssignments(),
    activeTab,
    selectedAssignment,
    isModalVisible,
    loading,
    error,
    counts: getAssignmentsCount(),
    handleTabPress,
    handleAssignmentPress,
    handleCloseModal,
    handleSubmitAssignment,
    refreshAssignments,
  };
}
