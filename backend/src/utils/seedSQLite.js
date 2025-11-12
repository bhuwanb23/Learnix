const { sequelize } = require('../config/db');
// Import all models to ensure they're registered
require('../models/Course');
require('../models/Subject');
require('../models/Class');
require('../models/User');
require('../models/SyllabusProgress');

async function seedDatabase() {
  try {
    console.log('Seeding SQLite database with test data...');
    
    // Sync all models to ensure tables exist
    await sequelize.sync({ force: false }); // Don't force to avoid dropping existing data
    
    // Create a sample course first
    const [course] = await sequelize.models.course.findOrCreate({
      where: { code: 'CS101' },
      defaults: {
        name: 'Computer Science',
        code: 'CS101',
        description: 'Introduction to Computer Science',
        department: 'Computer Science Department',
        duration: 4, // 4 years
        credits: 3,
        is_active: true
      }
    });
    
    console.log('Created/Found course:', course.toJSON());
    
    // Create a sample subject
    const [subject] = await sequelize.models.subject.findOrCreate({
      where: { code: 'CS201' },
      defaults: {
        name: 'Data Structures',
        code: 'CS201',
        description: 'Introduction to Data Structures',
        course_id: course.id,
        semester: 1,
        credits: 3,
        syllabus: {
          chapters: [
            {
              id: 'chapter1',
              title: 'Introduction',
              topics: [
                { id: 'topic1', title: 'What is Data Structure?' },
                { id: 'topic2', title: 'Types of Data Structures' }
              ]
            },
            {
              id: 'chapter2',
              title: 'Arrays',
              topics: [
                { id: 'topic3', title: 'One Dimensional Arrays' },
                { id: 'topic4', title: 'Multi Dimensional Arrays' }
              ]
            }
          ]
        },
        is_active: true
      }
    });
    
    console.log('Created/Found subject:', subject.toJSON());
    
    // Create a sample teacher user
    const [teacher] = await sequelize.models.user.findOrCreate({
      where: { email: 'john.doe@learnix.edu' },
      defaults: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@learnix.edu',
        password: 'password123',
        role: 'teacher',
        employee_id: 'EMP001',
        department: 'Computer Science',
        is_active: true
      }
    });
    
    console.log('Created/Found teacher:', teacher.toJSON());
    
    // Create a sample class
    const [classRecord] = await sequelize.models.class.findOrCreate({
      where: { code: 'CS201-A' },
      defaults: {
        name: 'CS201-A',
        code: 'CS201-A',
        course_id: course.id,
        semester: 1,
        section: 'A',
        academic_year: '2023-2024',
        teacher_id: teacher.id,
        student_count: 30,
        is_active: true
      }
    });
    
    console.log('Created/Found class:', classRecord.toJSON());
    
    console.log('✅ Database seeding completed successfully!');
    console.log('Subject ID:', subject.id);
    console.log('Class ID:', classRecord.id);
    console.log('Teacher ID:', teacher.id);
    
    return {
      subjectId: subject.id,
      classId: classRecord.id,
      teacherId: teacher.id
    };
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;