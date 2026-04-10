// Jest setup file to handle test environment
console.log('Jest setup running...');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3010'; // Use different port for tests

// Mock any external services if needed
jest.setTimeout(30000);