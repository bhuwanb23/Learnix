const { sequelize } = require('./src/config/db');
const User = require('./src/models/User');

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    const users = await User.findAll();
    console.log('Existing users:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();