const assignmentService = require('../services/assignmentService');
const { Assignment, AssignmentSubmission } = require('../models');
const logger = require('../config/logger');

// Create a new assignment
const createAssignment = async (req, res) => {
  try {
    const assignmentData = {
      ...req.body,
      assigned_by: req.user.id
    };

    const assignment = await assignmentService.createAssignment(assignmentData);
    res.status(201).json(assignment);
  } catch (error) {
    logger.error('Error in createAssignment controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get assignment by ID
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await assignmentService.getAssignmentById(id);
    
    // Check permissions - teachers can always view, students only if assigned
    if (req.user.role === 'student') {
      const assignedTo = assignment.assigned_to || [];
      if (!assignedTo.includes(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(assignment);
  } catch (error) {
    if (error.message === 'Assignment not found') {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    logger.error('Error in getAssignmentById controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get assignments for a course
const getAssignmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const assignments = await assignmentService.getAssignmentsByCourse(courseId);
    res.json(assignments);
  } catch (error) {
    logger.error('Error in getAssignmentsByCourse controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update assignment
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await assignmentService.getAssignmentById(id);
    
    // Check if user is the creator of the assignment
    if (assignment.assigned_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedAssignment = await assignmentService.updateAssignment(id, req.body);
    res.json(updatedAssignment);
  } catch (error) {
    if (error.message === 'Assignment not found') {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    logger.error('Error in updateAssignment controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete assignment
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await assignmentService.getAssignmentById(id);
    
    // Check if user is the creator of the assignment
    if (assignment.assigned_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await assignmentService.deleteAssignment(id);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    if (error.message === 'Assignment not found') {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    logger.error('Error in deleteAssignment controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit assignment
const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    // Validate that student is submitting their own assignment
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit assignments' });
    }
    
    const submissionData = {
      assignment_id: assignmentId,
      student_id: req.user.id,
      submission_content: req.body.content,
      submission_files: req.body.files || []
    };

    const submission = await assignmentService.submitAssignment(submissionData);
    res.status(201).json(submission);
  } catch (error) {
    logger.error('Error in submitAssignment controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get submission by ID
const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await assignmentService.getSubmissionById(id);
    
    // Check permissions
    if (req.user.role === 'student' && submission.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Teachers can view submissions for their assignments
    if (req.user.role === 'teacher') {
      const assignment = await assignmentService.getAssignmentById(submission.assignment_id);
      if (assignment.assigned_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json(submission);
  } catch (error) {
    if (error.message === 'Submission not found') {
      return res.status(404).json({ error: 'Submission not found' });
    }
    logger.error('Error in getSubmissionById controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get submissions for an assignment
const getSubmissionsByAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    // Check if user is authorized to view submissions
    const assignment = await assignmentService.getAssignmentById(assignmentId);
    if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (req.user.role === 'teacher' && assignment.assigned_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const submissions = await assignmentService.getSubmissionsByAssignment(assignmentId);
    res.json(submissions);
  } catch (error) {
    logger.error('Error in getSubmissionsByAssignment controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Grade submission
const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Check if user is authorized to grade
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const gradeData = {
      grade: req.body.grade,
      feedback: req.body.feedback
    };

    const submission = await assignmentService.gradeSubmission(submissionId, gradeData, req.user.id);
    res.json(submission);
  } catch (error) {
    logger.error('Error in gradeSubmission controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check plagiarism for submission
const checkPlagiarism = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Check if user is authorized
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const plagiarismResult = await assignmentService.checkSubmissionPlagiarism(submissionId);
    res.json(plagiarismResult);
  } catch (error) {
    logger.error('Error in checkPlagiarism controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get assignment analytics
const getAssignmentAnalytics = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    // Check if user is authorized
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const analytics = await assignmentService.getAssignmentAnalytics(assignmentId);
    res.json(analytics);
  } catch (error) {
    logger.error('Error in getAssignmentAnalytics controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Automated grading for objective questions
const autoGradeObjective = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { answerKey } = req.body;
    
    // Check if user is authorized
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await assignmentService.autoGradeObjectiveQuestions(submissionId, answerKey);
    res.json(result);
  } catch (error) {
    logger.error('Error in autoGradeObjective controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createAssignment,
  getAssignmentById,
  getAssignmentsByCourse,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getSubmissionById,
  getSubmissionsByAssignment,
  gradeSubmission,
  checkPlagiarism,
  getAssignmentAnalytics,
  autoGradeObjective
};