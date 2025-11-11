const fs = require('fs');
const path = require('path');

function checkSetup() {
  console.log('🔍 Checking Learnix Backend Setup...\n');
  
  // Check if required directories exist
  const requiredDirs = [
    'src/controllers',
    'src/models',
    'src/routes',
    'src/middleware',
    'src/services',
    'src/utils',
    'src/config',
    'src/uploads',
    'logs'
  ];
  
  console.log('📁 Checking directories...');
  let allDirsExist = true;
  for (const dir of requiredDirs) {
    const fullPath = path.join(__dirname, '../../', dir);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${dir}`);
    } else {
      console.log(`  ❌ ${dir} (missing)`);
      allDirsExist = false;
    }
  }
  
  // Check if required files exist
  const requiredFiles = [
    '.env',
    'package.json',
    'server.js',
    'src/models/User.js',
    'src/models/Course.js',
    'src/models/Class.js',
    'src/models/Subject.js',
    'src/models/Timetable.js',
    'src/models/Attendance.js',
    'src/models/Document.js'
  ];
  
  console.log('\n📄 Checking files...');
  let allFilesExist = true;
  for (const file of requiredFiles) {
    const fullPath = path.join(__dirname, '../../', file);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} (missing)`);
      allFilesExist = false;
    }
  }
  
  // Overall status
  console.log('\n📊 Setup Status:');
  if (allDirsExist && allFilesExist) {
    console.log('  ✅ All required directories and files are present');
    console.log('  🚀 Backend setup is complete!');
    return true;
  } else {
    console.log('  ❌ Some directories or files are missing');
    console.log('  🛠️  Please run the setup again');
    return false;
  }
}

// Run check if this file is executed directly
if (require.main === module) {
  checkSetup();
}

module.exports = checkSetup;