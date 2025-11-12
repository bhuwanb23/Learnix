const { Exam, ExamResult, User, Class } = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');

class ExamService {
  // Create a new exam
  async createExam(examData) {
    try {
      const exam = await Exam.create(examData);
      logger.info('Exam created successfully', { examId: exam.id });
      return exam;
    } catch (error) {
      logger.error('Error creating exam:', error);
      throw error;
    }
  }

  // Get exam by ID
  async getExamById(id) {
    try {
      const exam = await Exam.findByPk(id);
      if (!exam) {
        throw new Error('Exam not found');
      }
      return exam;
    } catch (error) {
      logger.error('Error fetching exam:', error);
      throw error;
    }
  }

  // Get exams by class
  async getExamsByClass(classId, filters = {}) {
    try {
      const whereClause = { class_id: classId };
      
      // Apply filters
      if (filters.exam_type) {
        whereClause.exam_type = filters.exam_type;
      }
      
      if (filters.is_published !== undefined) {
        whereClause.is_published = filters.is_published;
      }
      
      const exams = await Exam.findAll({
        where: whereClause,
        order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
      });
      return exams;
    } catch (error) {
      logger.error('Error fetching exams by class:', error);
      throw error;
    }
  }

  // Update exam
  async updateExam(id, updateData) {
    try {
      const exam = await this.getExamById(id);
      await exam.update(updateData);
      logger.info('Exam updated successfully', { examId: id });
      return exam;
    } catch (error) {
      logger.error('Error updating exam:', error);
      throw error;
    }
  }

  // Delete exam
  async deleteExam(id) {
    try {
      const exam = await this.getExamById(id);
      await exam.destroy();
      logger.info('Exam deleted successfully', { examId: id });
      return true;
    } catch (error) {
      logger.error('Error deleting exam:', error);
      throw error;
    }
  }

  // Publish exam
  async publishExam(id) {
    try {
      const exam = await this.getExamById(id);
      await exam.update({ is_published: true });
      logger.info('Exam published successfully', { examId: id });
      return exam;
    } catch (error) {
      logger.error('Error publishing exam:', error);
      throw error;
    }
  }

  // Create exam result
  async createExamResult(resultData) {
    try {
      const result = await ExamResult.create(resultData);
      logger.info('Exam result created successfully', { resultId: result.id });
      return result;
    } catch (error) {
      logger.error('Error creating exam result:', error);
      throw error;
    }
  }

  // Get exam results by exam
  async getExamResultsByExam(examId) {
    try {
      const results = await ExamResult.findAll({
        where: { exam_id: examId },
        include: [{
          model: User,
          as: 'student',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }]
      });
      return results;
    } catch (error) {
      logger.error('Error fetching exam results by exam:', error);
      throw error;
    }
  }

  // Get exam results by student
  async getExamResultsByStudent(studentId, filters = {}) {
    try {
      const whereClause = { student_id: studentId };
      
      // Apply filters
      if (filters.exam_id) {
        whereClause.exam_id = filters.exam_id;
      }
      
      const results = await ExamResult.findAll({
        where: whereClause,
        include: [{
          model: Exam,
          as: 'exam',
          attributes: ['id', 'title', 'exam_date', 'exam_type']
        }]
      });
      return results;
    } catch (error) {
      logger.error('Error fetching exam results by student:', error);
      throw error;
    }
  }

  // Update exam result
  async updateExamResult(id, updateData, evaluatorId) {
    try {
      const result = await ExamResult.findByPk(id);
      if (!result) {
        throw new Error('Exam result not found');
      }
      
      // Add evaluator and evaluation date
      updateData.evaluated_by = evaluatorId;
      updateData.evaluated_date = new Date();
      
      // Calculate percentage if marks are provided
      if (updateData.marks_obtained !== undefined && result.max_marks) {
        updateData.percentage = (updateData.marks_obtained / result.max_marks) * 100;
      }
      
      // Determine status based on marks
      if (updateData.marks_obtained !== undefined && result.max_marks) {
        const percentage = (updateData.marks_obtained / result.max_marks) * 100;
        updateData.status = percentage >= 40 ? 'pass' : 'fail'; // Assuming 40% is pass
      }
      
      await result.update(updateData);
      
      // Add to audit trail
      const auditTrail = result.audit_trail || [];
      auditTrail.push({
        action: 'update',
        by: evaluatorId,
        date: new Date(),
        changes: updateData
      });
      await result.update({ audit_trail: auditTrail });
      
      logger.info('Exam result updated successfully', { resultId: id });
      return result;
    } catch (error) {
      logger.error('Error updating exam result:', error);
      throw error;
    }
  }

  // Publish exam results
  async publishExamResults(examId) {
    try {
      const exam = await this.getExamById(examId);
      
      // Update exam to mark results as published
      await exam.update({ results_published: true });
      
      // Update all results for this exam to published
      await ExamResult.update(
        { 
          is_published: true, 
          published_date: new Date() 
        },
        { where: { exam_id: examId } }
      );
      
      logger.info('Exam results published successfully', { examId });
      return exam;
    } catch (error) {
      logger.error('Error publishing exam results:', error);
      throw error;
    }
  }

  // Get exam calendar for a class
  async getExamCalendar(classId, startDate, endDate) {
    try {
      const exams = await Exam.findAll({
        where: {
          class_id: classId,
          exam_date: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['exam_date', 'ASC'], ['start_time', 'ASC']]
      });
      return exams;
    } catch (error) {
      logger.error('Error fetching exam calendar:', error);
      throw error;
    }
  }

  // Calculate exam results statistics
  async calculateExamStatistics(examId) {
    try {
      const exam = await this.getExamById(examId);
      const results = await this.getExamResultsByExam(examId);
      
      if (results.length === 0) {
        return {
          examId,
          totalStudents: 0,
          averageMarks: 0,
          highestMarks: 0,
          lowestMarks: 0,
          passCount: 0,
          failCount: 0,
          absentCount: 0,
          passPercentage: 0
        };
      }
      
      // Filter out absent students
      const evaluatedResults = results.filter(r => r.status !== 'absent');
      
      if (evaluatedResults.length === 0) {
        return {
          examId,
          totalStudents: results.length,
          averageMarks: 0,
          highestMarks: 0,
          lowestMarks: 0,
          passCount: 0,
          failCount: 0,
          absentCount: results.length,
          passPercentage: 0
        };
      }
      
      const marks = evaluatedResults.map(r => r.marks_obtained).filter(m => m !== null);
      
      if (marks.length === 0) {
        return {
          examId,
          totalStudents: results.length,
          averageMarks: 0,
          highestMarks: 0,
          lowestMarks: 0,
          passCount: 0,
          failCount: 0,
          absentCount: results.length - evaluatedResults.length,
          passPercentage: 0
        };
      }
      
      const totalMarks = marks.reduce((sum, mark) => sum + mark, 0);
      const averageMarks = totalMarks / marks.length;
      const highestMarks = Math.max(...marks);
      const lowestMarks = Math.min(...marks);
      
      const passCount = evaluatedResults.filter(r => r.status === 'pass').length;
      const failCount = evaluatedResults.filter(r => r.status === 'fail').length;
      const absentCount = results.length - evaluatedResults.length;
      const passPercentage = (passCount / evaluatedResults.length) * 100;
      
      return {
        examId,
        totalStudents: results.length,
        evaluatedStudents: evaluatedResults.length,
        averageMarks: parseFloat(averageMarks.toFixed(2)),
        highestMarks,
        lowestMarks,
        passCount,
        failCount,
        absentCount,
        passPercentage: parseFloat(passPercentage.toFixed(2))
      };
    } catch (error) {
      logger.error('Error calculating exam statistics:', error);
      throw error;
    }
  }

  // Get result audit trail
  async getResultAuditTrail(resultId) {
    try {
      const result = await ExamResult.findByPk(resultId);
      if (!result) {
        throw new Error('Exam result not found');
      }
      
      return result.audit_trail || [];
    } catch (error) {
      logger.error('Error fetching result audit trail:', error);
      throw error;
    }
  }
}

module.exports = new ExamService();