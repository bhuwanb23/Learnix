const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

class TimetableExport {
  // Export timetable as PDF
  static async exportToPDF(timetableData, className) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        // Add title
        doc.fontSize(20).text(`Timetable for ${className}`, { align: 'center' });
        doc.moveDown();
        
        // Add timetable data
        doc.fontSize(12);
        
        // Create table header
        const headers = ['Day', 'Time', 'Subject', 'Teacher', 'Room'];
        const columnWidth = 100;
        const rowHeight = 20;
        let yPosition = 100;
        
        // Draw header
        doc.font('Helvetica-Bold');
        headers.forEach((header, index) => {
          doc.text(header, 50 + (index * columnWidth), yPosition, { width: columnWidth });
        });
        
        yPosition += rowHeight;
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 5;
        
        // Draw data rows
        doc.font('Helvetica');
        timetableData.forEach(entry => {
          const rowData = [
            this.getDayName(entry.day_of_week),
            `${entry.start_time} - ${entry.end_time}`,
            entry.subject_name || 'N/A',
            entry.teacher_name || 'N/A',
            entry.room_id
          ];
          
          rowData.forEach((data, index) => {
            doc.text(data, 50 + (index * columnWidth), yPosition, { width: columnWidth });
          });
          
          yPosition += rowHeight;
        });
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Export timetable as CSV
  static async exportToCSV(timetableData, className) {
    try {
      const fields = [
        'day',
        'start_time',
        'end_time',
        'subject_name',
        'teacher_name',
        'room_id'
      ];
      
      const opts = { fields };
      const parser = new Parser(opts);
      
      // Transform data to match CSV fields
      const csvData = timetableData.map(entry => ({
        day: this.getDayName(entry.day_of_week),
        start_time: entry.start_time,
        end_time: entry.end_time,
        subject_name: entry.subject_name || 'N/A',
        teacher_name: entry.teacher_name || 'N/A',
        room_id: entry.room_id
      }));
      
      return parser.parse(csvData);
    } catch (error) {
      throw new Error(`CSV export failed: ${error.message}`);
    }
  }
  
  // Helper function to get day name from day number
  static getDayName(dayNumber) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
  }
}

module.exports = TimetableExport;