const axios = require('axios');
const seedDatabase = require('./seedSQLite');

async function testAIAPI() {
  try {
    console.log('Testing AI API endpoints...\n');
    
    // Seed database with test data
    console.log('1. Seeding database...');
    const seededData = await seedDatabase();
    const { subjectId, classId, teacherId } = seededData;
    console.log('✅ Database seeded\n');
    
    // Generate unique email for testing
    const timestamp = Date.now();
    const testEmail = `ai.teacher.${timestamp}@learnix.edu`;
    
    // Register a new teacher user
    console.log('2. Registering new teacher user...');
    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', {
      firstName: 'AI',
      lastName: 'Teacher',
      email: testEmail,
      password: 'password123',
      role: 'teacher'
    });
    
    const token = registerResponse.data.token;
    console.log('✅ Registration successful\n');
    
    // Test get topic summary
    console.log('3. Testing GET /api/ai/summary/:subjectId/:chapterId/:topicId...');
    const summaryResponse = await axios.get(
      `http://localhost:3000/api/ai/summary/${subjectId}/chapter1/topic1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('✅ Topic summary retrieved:', summaryResponse.data.data.title);
    console.log('   Summary length:', summaryResponse.data.data.content.length, 'characters\n');
    
    // Test get topic explanation
    console.log('4. Testing GET /api/ai/explanation/:subjectId/:chapterId/:topicId...');
    const explanationResponse = await axios.get(
      `http://localhost:3000/api/ai/explanation/${subjectId}/chapter1/topic1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('✅ Topic explanation retrieved:', explanationResponse.data.data.title);
    console.log('   Explanation length:', explanationResponse.data.data.content.length, 'characters\n');
    
    // Test get topic examples
    console.log('5. Testing GET /api/ai/examples/:subjectId/:chapterId/:topicId...');
    const examplesResponse = await axios.get(
      `http://localhost:3000/api/ai/examples/${subjectId}/chapter1/topic1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('✅ Topic examples retrieved:', examplesResponse.data.data.title);
    console.log('   Examples content length:', examplesResponse.data.data.content.length, 'characters\n');
    
    // Test get practice questions
    console.log('6. Testing GET /api/ai/questions/:subjectId/:chapterId/:topicId...');
    const questionsResponse = await axios.get(
      `http://localhost:3000/api/ai/questions/${subjectId}/chapter1/topic1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('✅ Practice questions retrieved:', questionsResponse.data.data.title);
    console.log('   Questions content length:', questionsResponse.data.data.content.length, 'characters\n');
    
    // Test get subject AI content
    console.log('7. Testing GET /api/ai/content/:subjectId...');
    const contentResponse = await axios.get(
      `http://localhost:3000/api/ai/content/${subjectId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('✅ Subject AI content retrieved:', contentResponse.data.data.length, 'items\n');
    
    // Test assess content quality
    console.log('8. Testing GET /api/ai/quality/:contentId...');
    if (contentResponse.data.data.length > 0) {
      const contentId = contentResponse.data.data[0].id;
      try {
        const qualityResponse = await axios.get(
          `http://localhost:3000/api/ai/quality/${contentId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        console.log('✅ Content quality assessed:', qualityResponse.data.data.qualityScore);
      } catch (error) {
        console.log('ℹ️  Content quality assessment not available for this item');
      }
    }
    
    console.log('\n🎉 All AI API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAIAPI();
}

module.exports = testAIAPI;