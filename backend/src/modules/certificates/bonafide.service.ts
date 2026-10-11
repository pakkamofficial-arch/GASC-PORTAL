import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

export interface BonafideDocxData {
  certificateNo: string;
  studentName: string;
  registerNo: string;
  className: string;
  academicYear: string;
  shift?: string;
  conduct?: string;
  purpose: string;
  issueDate: Date | string;
}

const TEMPLATE_PATH = path.resolve(__dirname, '../../../templates/bonafide-template.docx');

/**
 * Format Purpose label for official wording
 */
export const formatCertificatePurpose = (purpose: string): string => {
  const map: Record<string, string> = {
    SCHOLARSHIP: 'State / Central Post-Matric Scholarship',
    BUS_PASS: 'Government Bus Pass (TNSTC Concession)',
    TRAIN_PASS: 'Southern Railway Student Concession Pass',
    PASSPORT: 'Passport Application Verification',
    BANK_ACCOUNT: 'Student Savings Bank Account Opening',
    EDUCATION_LOAN: 'Nationalized Bank Education Loan',
    INTERNSHIP: 'Summer Internship / Project Work Verification',
    GENERAL: 'General Bonafide Verification',
  };
  return map[purpose] || purpose.replace(/_/g, ' ');
};

/**
 * Generates an official Bonafide Certificate by populating the verified student details
 * directly into an authentic in-memory copy of `bonafide-template.docx`.
 *
 * Strict Compliance:
 * - Preserves 100% of original Microsoft Word document layout, fonts (Verdana / Arial Black),
 *   VML border shapes, spacing, margins, orientation, and signature positions.
 * - Leaves the source template file untouched.
 * - Does not redesign as generic HTML or third-party PDF.
 */
export const generateBonafideDocxBuffer = async (data: BonafideDocxData): Promise<Buffer> => {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Official Bonafide template not found at: ${TEMPLATE_PATH}`);
  }

  // Read original template into separate in-memory buffer
  const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
  const zip = new PizZip(templateBuffer);

  const documentXmlEntry = zip.file('word/document.xml');
  if (!documentXmlEntry) {
    throw new Error('Invalid Word document: word/document.xml missing');
  }

  let xml = documentXmlEntry.asText();

  // 1. Format Date (DD/MM/YYYY)
  let formattedDate: string;
  if (data.issueDate instanceof Date) {
    const day = String(data.issueDate.getDate()).padStart(2, '0');
    const month = String(data.issueDate.getMonth() + 1).padStart(2, '0');
    const year = data.issueDate.getFullYear();
    formattedDate = `${day}/${month}/${year}`;
  } else if (typeof data.issueDate === 'string' && data.issueDate.trim()) {
    formattedDate = data.issueDate.trim();
  } else {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    formattedDate = `${day}/${month}/${year}`;
  }

  // Populate Date field: Date:……............ -> Date: DD/MM/YYYY
  xml = xml.replace('>……............<', `> ${formattedDate}<`);

  // 2. Student Name: This is Certify that …………………………………………………………………………………………..
  const studentUpper = (data.studentName || '').trim().toUpperCase();
  xml = xml.replace(
    'This is Certify that …………………………………………………………………………………………..',
    `This is Certify that ${studentUpper}`
  );

  // 3. Roll No: with\u00a0Roll\u00a0No ……………………………………………………….. Was / is a
  const regNo = (data.registerNo || '').trim().toUpperCase();
  xml = xml.replace(
    /\u00a0Roll\u00a0No [^<]+ Was \/ is a/,
    `\u00a0Roll\u00a0No ${regNo} Was / is a`
  );

  // 4. Class: student of …………………………………………………..class in this college
  const classText = (data.className || '').trim();
  xml = xml.replace(
    /student of [^<]+class in this college/,
    `student of ${classText} class in this college`
  );

  // 5. Academic Year: 202    -  202
  let startYear = '2023';
  let endYear = '2026';
  if (data.academicYear) {
    const parts = data.academicYear.match(/\d{4}/g);
    if (parts && parts.length >= 2) {
      startYear = parts[0];
      endYear = parts[1];
    } else if (parts && parts.length === 1) {
      const yr = parseInt(parts[0], 10);
      startYear = String(yr);
      endYear = String(yr + 1);
    }
  }

  xml = xml.replace('202    </w:t>', `${startYear} </w:t>`);
  xml = xml.replace('-  202</w:t>', `-  ${endYear}</w:t>`);

  // 6. Shift: ,in shift …………………
  const shiftText = data.shift ? data.shift.trim() : 'Shift I (Regular)';
  xml = xml.replace(
    /,in shift [^<]+<\/w:t>/,
    `,in shift ${shiftText}</w:t>`
  );

  // 7. Conduct and Character: …………………………………………………………. This Certificate is issued to enable the
  const conductText = (data.conduct || 'GOOD').trim().toUpperCase();
  xml = xml.replace(
    '…………………………………………………………. This Certificate is issued to enable the',
    `${conductText}. This Certificate is issued to enable the`
  );

  // 8. Purpose: Candidate to apply for/to get…………………………………………………………………………..
  const purposeText = formatCertificatePurpose(data.purpose);
  xml = xml.replace(
    'Candidate to apply for/to get…………………………………………………………………………..',
    `Candidate to apply for/to get ${purposeText}.`
  );

  // Write updated XML back to the cloned in-memory zip
  zip.file('word/document.xml', xml);

  const outputBuffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return outputBuffer;
};
