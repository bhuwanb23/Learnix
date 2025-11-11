const express = require('express');
const router = express.Router();
const attendanceAutomationController = require('../controllers/attendanceAutomationController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All attendance automation routes require authentication
router.use(authenticateToken);

// Teacher and admin can generate QR codes and NFC tags
router.post('/qr/generate', authorizeRole('admin', 'teacher'), attendanceAutomationController.generateQRCode);
router.post('/nfc/generate', authorizeRole('admin', 'teacher'), attendanceAutomationController.generateNFCTag);

// Students can record attendance via QR code or NFC tag
router.post('/qr/record', authorizeRole('admin', 'teacher', 'student'), attendanceAutomationController.recordAttendanceByQR);
router.post('/nfc/record', authorizeRole('admin', 'teacher', 'student'), attendanceAutomationController.recordAttendanceByNFC);

module.exports = router;