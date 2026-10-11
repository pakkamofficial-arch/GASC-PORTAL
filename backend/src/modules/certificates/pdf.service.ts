import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { config } from '../../config';

export interface BonafidePDFData {
  certificateNo: string;
  studentName: string;
  registerNo: string;
  departmentName: string;
  degreeName: string;
  academicYear: string;
  purpose: string;
  issueDate: string;
  principalTitle?: string;
}

export const generateBonafidePDFBuffer = async (data: BonafidePDFData): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Outer border (Double border design)
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(2).strokeColor('#176B3A').stroke();
      doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70).lineWidth(0.8).strokeColor('#2E7D4F').stroke();

      // Header: Tamil Nadu Emblem Text & College Details
      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#176B3A').text('GOVERNMENT OF TAMIL NADU', { align: 'center' });
      doc.fontSize(9).fillColor('#687268').text('DEPARTMENT OF HIGHER EDUCATION', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(16).fillColor('#176B3A').text(config.college.name.toUpperCase(), { align: 'center' });
      doc.fontSize(10).fillColor('#202820').text(config.college.affiliation, { align: 'center' });
      doc.fontSize(9).fillColor('#687268').text(config.college.address, { align: 'center' });
      doc.fontSize(9).fillColor('#2E7D4F').text(config.college.mottoTamil, { align: 'center' });

      doc.moveDown(1);
      doc.strokeColor('#DCE7DC').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(1.5);

      // Certificate Title
      doc.fontSize(16).fillColor('#176B3A').text('BONAFIDE CERTIFICATE', { align: 'center', underline: true });
      doc.moveDown(0.8);

      // Certificate No and Date
      const currentY = doc.y;
      doc.fontSize(10).fillColor('#202820').text(`Ref. No: ${data.certificateNo}`, 60, currentY);
      doc.text(`Date: ${data.issueDate}`, doc.page.width - 180, currentY, { align: 'right' });

      doc.moveDown(2.5);

      // Certificate Body Text
      doc.fontSize(12).fillColor('#202820').lineGap(8);
      const text = `This is to certify that Selvan / Selvi ${data.studentName.toUpperCase()} (Register No: ${data.registerNo}) is a bonafide student of this institution, studying ${data.degreeName} in ${data.departmentName} during the academic year ${data.academicYear}.\n\nThis certificate is issued on their request for the purpose of ${data.purpose.replace(/_/g, ' ')}.\n\nHis / Her character and conduct during the course of study have been found to be GOOD.`;
      
      doc.text(text, 60, doc.y, {
        align: 'justify',
        width: doc.page.width - 120,
        lineGap: 8,
      });

      doc.moveDown(4);

      // Signatory section
      const signY = doc.page.height - 150;
      doc.fontSize(10).fillColor('#202820').text('College Seal', 80, signY);
      doc.text('PRINCIPAL', doc.page.width - 200, signY, { align: 'center' });
      doc.fontSize(8).fillColor('#687268').text(config.college.name, doc.page.width - 200, signY + 15, { align: 'center' });

      // Verification footnote with QR code
      const qrData = `GASC-VERIFY:${data.certificateNo}:${data.registerNo}`;
      const qrBuffer = await QRCode.toBuffer(qrData, { width: 70, margin: 1 });
      doc.image(qrBuffer, 60, doc.page.height - 130, { width: 60 });
      doc.fontSize(7).fillColor('#687268').text('Scan to verify institutional authenticity', 60, doc.page.height - 65);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
