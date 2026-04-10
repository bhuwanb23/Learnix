const { Assignment, AssignmentSubmission, User, Class } = require('../models');
const { checkPlagiarism } = require('../utils/aiService');
const logger = require('../config/logger');

class AssignmentService {
  // Create a new assignment
  async createAssignment(assignmentData) {
    try {
      // Ensure required fields are present
      if (!assignmentData.course_id) {
        throw new Error('Course ID is required');
      }
      
      const assignment = await Assignment.create(assignmentData);
      logger.info('Assignment created successfully', { assignmentId: assignment.id });
      return assignment;
    } catch (error) {
      logger.error('Error creating assignment:', error);
      throw error;
    }
  }

  // Get assignment by ID
  async getAssignmentById(id) {
    try {
      const assignment = await Assignment.findByPk(id);
      if (!assignment) {
        throw new Error('Assignment not found');
      }
      return assignment;
    } catch (error) {
      logger.error('Error fetching assignment:', error);
      throw error;
    }
  }

  // Get assignments for a course
  async getAssignmentsByCourse(courseId) {
    try {
      const assignments = await Assignment.findAll({
        where: { course_id: courseId },
        order: [['created_at', 'DESC']]
      });
      return assignments;
    } catch (error) {
      logger.error('Error fetching assignments by course:', error);
      throw error;
    }
  }

  // Update assignment
  async updateAssignment(id, updateData) {
    try {
      const assignment = await this.getAssignmentById(id);
      await assignment.update(updateData);
      logger.info('Assignment updated successfully', { assignmentId: id });
      return assignment;
    } catch (error) {
      logger.error('Error updating assignment:', error);
      throw error;
    }
  }

  // Delete assignment
  async deleteAssignment(id) {
    try {
      const assignment = await this.getAssignmentById(id);
      await assignment.destroy();
      logger.info('Assignment deleted successfully', { assignmentId: id });
      return true;
    } catch (error) {
      logger.error('Error deleting assignment:', error);
      throw error;
    }
  }

  // Submit assignment
  async submitAssignment(submissionData) {
    try {
      // Check if submission already exists
      let submission = await AssignmentSubmission.findOne({
        where: {
          assignment_id: submissionData.assignment_id,
          student_id: submissionData.student_id
        }
      });

      if (submission) {
        // Update existing submission
        await submission.update({
          ...submissionData,
          is_submitted: true,
          submission_date: new Date()
        });
      } else {
        // Create new submission
        submission = await AssignmentSubmission.create({
          ...submissionData,
          is_submitted: true,
          submission_date: new Date()
        });
      }

      // Check if assignment is late
      const assignment = await this.getAssignmentById(submissionData.assignment_id);
      if (assignment.due_date && new Date() > new Date(assignment.due_date)) {
        await submission.update({ is_late: true });
      }

      logger.info('Assignment submitted successfully', { submissionId: submission.id });
      return submission;
    } catch (error) {
      logger.error('Error submitting assignment:', error);
      throw error;
    }
  }

  // Get submission by ID
  async getSubmissionById(id) {
    try {
      const submission = await AssignmentSubmission.findByPk(id);
      if (!submission) {
        throw new Error('Submission not found');
      }
      return submission;
    } catch (error) {
      logger.error('Error fetching submission:', error);
      throw error;
    }
  }

  // Get submissions for an assignment
  async getSubmissionsByAssignment(assignmentId) {
    try {
      const submissions = await AssignmentSubmission.findAll({
        where: { assignment_id: assignmentId },
        include: [{
          model: User,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }]
      });
      return submissions;
    } catch (error) {
      logger.error('Error fetching submissions by assignment:', error);
      throw error;
    }
  }

  // Get submissions for a student
  async getSubmissionsByStudent(studentId) {
    try {
      const submissions = await AssignmentSubmission.findAll({
        where: { student_id: studentId },
        include: [{
          model: Assignment,
          attributes: ['id', 'title', 'due_date']
        }]
      });
      return submissions;
    } catch (error) {
      logger.error('Error fetching submissions by student:', error);
      throw error;
    }
  }

  // Grade submission
  async gradeSubmission(submissionId, gradeData, graderId) {
    try {
      const submission = await this.getSubmissionById(submissionId);
      
      // Update submission with grade and feedback
      await submission.update({
        ...gradeData,
        graded_by: graderId,
        graded_date: new Date(),
        is_graded: true
      });

      logger.info('Submission graded successfully', { submissionId });
      return submission;
    } catch (error) {
      logger.error('Error grading submission:', error);
      throw error;
    }
  }

  // Check plagiarism for submission
  async checkSubmissionPlagiarism(submissionId) {
    try {
      const submission = await this.getSubmissionById(submissionId);
      
      if (!submission.submission_content) {
        throw new Error('No content to check for plagiarism');
      }

      // Use AI service to check plagiarism
      const plagiarismResult = await checkPlagiarism(submission.submission_content);
      
      // Update submission with plagiarism results
      await submission.update({
        plagiarism_score: plagiarismResult.score,
        plagiarism_report: plagiarismResult.sources
      });

      logger.info('Plagiarism check completed', { submissionId, score: plagiarismResult.score });
      return plagiarismResult;
    } catch (error) {
      logger.error('Error checking plagiarism:', error);
      throw error;
    }
  }

  // Get assignment analytics
  async getAssignmentAnalytics(assignmentId) {
    try {
      const assignment = await this.getAssignmentById(assignmentId);
      const submissions = await this.getSubmissionsByAssignment(assignmentId);
      
      const totalSubmissions = submissions.length;
      const gradedSubmissions = submissions.filter(s => s.is_graded).length;
      const lateSubmissions = submissions.filter(s => s.is_late).length;
      
      // Calculate average grade
      const gradedScores = submissions
        .filter(s => s.is_graded && s.grade !== null)
        .map(s => parseFloat(s.grade));
      
      const averageGrade = gradedScores.length > 0 
        ? gradedScores.reduce((sum, grade) => sum + grade, 0) / gradedScores.length
        : 0;
      
      // Calculate plagiarism statistics
      const plagiarismChecked = submissions.filter(s => s.plagiarism_score !== null).length;
      const highPlagiarism = submissions.filter(s => s.plagiarism_score > 80).length;
      
      // Get assigned students count
      const assignedStudents = assignment.assigned_to ? assignment.assigned_to.length : 0;
      
      return {
        assignmentId,
        title: assignment.title,
        totalSubmissions,
        gradedSubmissions,
        lateSubmissions,
        averageGrade: parseFloat(averageGrade.toFixed(2)),
        plagiarismChecked,
        highPlagiarism,
        submissionRate: assignedStudents > 0 
          ? parseFloat(((totalSubmissions / assignedStudents) * 100).toFixed(2))
          : 0
      };
    } catch (error) {
      logger.error('Error generating assignment analytics:', error);
      throw error;
    }
  }

  // Automated grading for objective questions
  async autoGradeObjectiveQuestions(submissionId, answerKey) {
    try {
      const submission = await this.getSubmissionById(submissionId);
      
      // Parse submission content as JSON if it's an objective test
      let studentAnswers;
      try {
        studentAnswers = JSON.parse(submission.submission_content);
      } catch (parseError) {
        throw new Error('Submission content is not in valid JSON format for auto-grading');
      }
      
      // Calculate score based on answer key
      let correctAnswers = 0;
      let totalQuestions = Object.keys(answerKey).length;
      
      for (const [questionId, correctAnswer] of Object.entries(answerKey)) {
        if (studentAnswers[questionId] && studentAnswers[questionId] === correctAnswer) {
          correctAnswers++;
        }
      }
      
      const score = (correctAnswers / totalQuestions) * 100;
      
      // Update submission with auto-grade
      await submission.update({
        grade: score,
        is_graded: true,
        graded_by: null, // System graded
        graded_date: new Date(),
        feedback: `Auto-graded: ${correctAnswers} out of ${totalQuestions} questions correct`
      });
      
      logger.info('Objective questions auto-graded', { submissionId, score });
      return { score, correctAnswers, totalQuestions };
    } catch (error) {
      logger.error('Error auto-grading objective questions:', error);
      throw error;
    }
  }
}

module.exports = new AssignmentService();