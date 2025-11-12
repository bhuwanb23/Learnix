const SyllabusProgress = require('../models/SyllabusProgress');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const logger = require('../config/logger');

class SyllabusService {
  // Get syllabus progress for a specific subject and class
  async getSyllabusProgress(subjectId, classId) {
    try {
      const progress = await SyllabusProgress.findOne({
        where: {
          subject_id: subjectId,
          class_id: classId
        }
      });
      
      return progress;
    } catch (error) {
      logger.error('Error fetching syllabus progress:', error);
      throw error;
    }
  }
  
  // Create or update syllabus progress
  async updateSyllabusProgress(subjectId, classId, teacherId, progressData) {
    try {
      console.log('DEBUG: updateSyllabusProgress called with:', { subjectId, classId, teacherId });
      
      // First, check if a progress record already exists
      let progress = await SyllabusProgress.findOne({
        where: {
          subject_id: subjectId,
          class_id: classId
        }
      });
      
      console.log('DEBUG: Existing progress record:', progress);
      
      // Get the subject to access its syllabus structure
      const subject = await Subject.findByPk(subjectId);
      console.log('DEBUG: Subject lookup result:', subject);
      
      // Prepare progress data
      const progressDetails = progressData.progress_details || {};
      const overallProgress = this.calculateOverallProgress(progressDetails);
      const status = this.determineStatus(overallProgress, progressData.expected_end_date);
      
      console.log('DEBUG: Calculated progress:', { overallProgress, status });
      
      const syllabusData = {
        subject_id: subjectId,
        class_id: classId,
        teacher_id: teacherId,
        syllabus_structure: subject ? subject.syllabus : {},
        overall_progress: overallProgress,
        progress_details: progressDetails,
        start_date: progressData.start_date,
        expected_end_date: progressData.expected_end_date,
        actual_end_date: overallProgress === 100 ? new Date() : null,
        status: status,
        notes: progressData.notes,
        is_active: progressData.is_active !== undefined ? progressData.is_active : true
      };
      
      console.log('DEBUG: Syllabus data to save:', syllabusData);
      
      if (progress) {
        // Update existing record
        console.log('DEBUG: Updating existing progress record');
        await progress.update(syllabusData);
      } else {
        // Create new record
        console.log('DEBUG: Creating new progress record');
        progress = await SyllabusProgress.create(syllabusData);
      }
      
      console.log('DEBUG: Progress record saved successfully');
      return progress;
    } catch (error) {
      console.log('DEBUG: Error in updateSyllabusProgress:', error);
      logger.error('Error updating syllabus progress:', error);
      throw error;
    }
  }
  
  // Calculate overall progress percentage
  calculateOverallProgress(progressDetails) {
    if (!progressDetails || Object.keys(progressDetails).length === 0) {
      return 0.00;
    }
    
    // Simple calculation: average of all chapter/topic progress
    const totalItems = Object.keys(progressDetails).length;
    const completedItems = Object.values(progressDetails).filter(item => item.completed).length;
    
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0.00;
  }
  
  // Determine status based on progress and expected end date
  determineStatus(overallProgress, expectedEndDate) {
    if (overallProgress === 0) {
      return 'not_started';
    } else if (overallProgress === 100) {
      return 'completed';
    } else {
      // Check if behind schedule
      if (expectedEndDate && new Date() > new Date(expectedEndDate)) {
        return 'behind_schedule';
      }
      return 'in_progress';
    }
  }
  
  // Get analytics data for a class
  async getClassAnalytics(classId) {
    try {
      const progressRecords = await SyllabusProgress.findAll({
        where: {
          class_id: classId,
          is_active: true
        },
        include: [{
          model: Subject,
          attributes: ['name', 'code']
        }]
      });
      
      // Calculate overall class statistics
      const totalSubjects = progressRecords.length;
      const completedSubjects = progressRecords.filter(p => p.status === 'completed').length;
      const inProgressSubjects = progressRecords.filter(p => p.status === 'in_progress').length;
      const behindScheduleSubjects = progressRecords.filter(p => p.status === 'behind_schedule').length;
      
      const averageProgress = totalSubjects > 0 
        ? progressRecords.reduce((sum, p) => sum + parseFloat(p.overall_progress), 0) / totalSubjects
        : 0;
      
      return {
        totalSubjects,
        completedSubjects,
        inProgressSubjects,
        behindScheduleSubjects,
        averageProgress: parseFloat(averageProgress.toFixed(2)),
        subjects: progressRecords.map(record => ({
          subjectId: record.subject_id,
          subjectName: record.Subject ? record.Subject.name : 'Unknown',
          subjectCode: record.Subject ? record.Subject.code : 'Unknown',
          progress: parseFloat(record.overall_progress),
          status: record.status,
          expectedEndDate: record.expected_end_date
        }))
      };
    } catch (error) {
      logger.error('Error fetching class analytics:', error);
      throw error;
    }
  }
  
  // Get comparison data between classes or time periods
  async getComparisonData(filters = {}) {
    try {
      const whereClause = {};
      if (filters.classId) whereClause.class_id = filters.classId;
      if (filters.subjectId) whereClause.subject_id = filters.subjectId;
      
      const progressRecords = await SyllabusProgress.findAll({
        where: whereClause,
        include: [{
          model: Subject,
          attributes: ['name', 'code']
        }, {
          model: Class,
          attributes: ['name', 'code']
        }],
        order: [['updated_at', 'DESC']]
      });
      
      return progressRecords.map(record => ({
        id: record.id,
        subjectId: record.subject_id,
        subjectName: record.Subject ? record.Subject.name : 'Unknown',
        className: record.Class ? record.Class.name : 'Unknown',
        progress: parseFloat(record.overall_progress),
        status: record.status,
        startDate: record.start_date,
        expectedEndDate: record.expected_end_date,
        actualEndDate: record.actual_end_date,
        updatedAt: record.updated_at
      }));
    } catch (error) {
      logger.error('Error fetching comparison data:', error);
      throw error;
    }
  }
  
  // Generate progress report
  async generateProgressReport(classId, options = {}) {
    try {
      const analytics = await this.getClassAnalytics(classId);
      
      // Add additional report data
      const report = {
        generatedAt: new Date(),
        classId,
        ...analytics,
        // Add trend analysis
        trend: this.analyzeTrend(analytics)
      };
      
      return report;
    } catch (error) {
      logger.error('Error generating progress report:', error);
      throw error;
    }
  }
  
  // Simple trend analysis
  analyzeTrend(analytics) {
    // This is a simplified trend analysis
    // In a real implementation, this would compare with historical data
    if (analytics.averageProgress >= 80) {
      return 'excellent';
    } else if (analytics.averageProgress >= 60) {
      return 'good';
    } else if (analytics.averageProgress >= 40) {
      return 'fair';
    } else {
      return 'poor';
    }
  }
}

module.exports = new SyllabusService();