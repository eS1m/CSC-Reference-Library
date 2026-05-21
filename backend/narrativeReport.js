const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ExcelJS = require('exceljs');

const TEMPLATE_PATH = path.join(__dirname, '..', 'src', 'assets', 'templates', 'Narrative-Report-Template.docx');

async function downloadFileFromDrive(drive, fileId) {
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.data.on('data', chunk => chunks.push(chunk));
    res.data.on('end', () => resolve(Buffer.concat(chunks)));
    res.data.on('error', reject);
  });
}

function toNum(v) {
  if (v && typeof v === 'object' && 'result' in v) v = v.result;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const parsed = parseFloat(v);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function computeSystemMaturity(h, n, t, z) {
  if (z === 1) return 4;
  if (t === 1) return 3;
  if (n === 1) return 2;
  if (h === 1) return 1;
  return 0;
}

function computeAgencyMaturity(f, l, r, x, h53) {
  if (Number.isFinite(h53)) return h53;
  if (x === 1) return 4;
  if (r === 1) return 3;
  if (l === 1) return 2;
  if (f === 1) return 1;
  return 0;
}

function maturityToText(level) {
  switch (level) {
    case 4: return 'Level 4';
    case 3: return 'Level 3';
    case 2: return 'Level 2';
    case 1: return 'Level 1';
    default: return 'Below Level 1';
  }
}

async function extractMaturityData(excelBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelBuffer);
  const worksheet = workbook.getWorksheet('Assessment Results');
  if (!worksheet) {
    throw new Error('Sheet "Assessment Results" not found in Self-Assessment');
  }

  const get = (ref) => toNum(worksheet.getCell(ref).value);

  const f52 = get('F52'), l52 = get('L52'), r52 = get('R52'), x52 = get('X52');
  const h53 = get('H53'), y53 = get('Y53');

  const h8  = get('H8'),  n8  = get('N8'),  t8  = get('T8'),  z8  = get('Z8');
  const h19 = get('H19'), n19 = get('N19'), t19 = get('T19'), z19 = get('Z19');
  const h28 = get('H28'), n28 = get('N28'), t28 = get('T28'), z28 = get('Z28');
  const h41 = get('H41'), n41 = get('N41'), t41 = get('T41'), z41 = get('Z41');

  const overallCurrent = computeAgencyMaturity(f52, l52, r52, x52, h53);

  return {
    overallCurrent: maturityToText(overallCurrent),
    overallTarget:  maturityToText(y53),
    recruitment:    maturityToText(computeSystemMaturity(h8,  n8,  t8,  z8)),
    learningDev:    maturityToText(computeSystemMaturity(h19, n19, t19, z19)),
    performanceMgmt:maturityToText(computeSystemMaturity(h28, n28, t28, z28)),
    rewardsRecog:   maturityToText(computeSystemMaturity(h41, n41, t41, z41)),
  };
}

function preprocessTemplateXml(zip) {
  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) return;

  let xml = xmlFile.asText();

  // Remove Word spell-check markers that split docxtemplater tags across runs
  xml = xml.replace(/<w:proofErr\s+[^>]*\/>/g, '');

  // Convert image-module tags {%screenshot...} into plain text tags {screenshot...}
  // so docxtemplater can replace them with empty strings (paragraphs stay intact)
  xml = xml.replace(
    /<w:r(\s[^>]*)?>(\s*<w:rPr>[\s\S]*?<\/w:rPr>\s*)?<w:t(\s[^>]*)?>\{<\/w:t><\/w:r>\s*<w:r(?:\s[^>]*)?>(\s*<w:rPr>[\s\S]*?<\/w:rPr>\s*)?<w:t(\s[^>]*)?>%<\/w:t><\/w:r>\s*<w:r(\s[^>]*)?>(\s*<w:rPr>[\s\S]*?<\/w:rPr>\s*)?<w:t(\s[^>]*)?>screenshotSystemPractice\}<\/w:t><\/w:r>/g,
    '<w:r><w:t>{screenshotSystemPractice}</w:t></w:r>'
  );
  xml = xml.replace(
    /<w:r(\s[^>]*)?>(\s*<w:rPr>[\s\S]*?<\/w:rPr>\s*)?<w:t(\s[^>]*)?>\{<\/w:t><\/w:r>\s*<w:r(?:\s[^>]*)?>(\s*<w:rPr>[\s\S]*?<\/w:rPr>\s*)?<w:t(\s[^>]*)?>%<\/w:t><\/w:r>\s*<w:r(\s[^>]*)?>(\s*<w:rPr>[\s\S]*?<\/w:rPr>\s*)?<w:t(\s[^>]*)?>screenshotCompetency\}<\/w:t><\/w:r>/g,
    '<w:r><w:t>{screenshotCompetency}</w:t></w:r>'
  );

  // Fallback for any unsplit {%screenshot...} tags
  xml = xml.replace(/\{%screenshotSystemPractice\}/g, '{screenshotSystemPractice}');
  xml = xml.replace(/\{%screenshotCompetency\}/g,   '{screenshotCompetency}');

  zip.file('word/document.xml', xml);
}

async function generateNarrativeReport({ drive, agencyName, selfAssessmentFileId }) {
  const excelBuffer = await downloadFileFromDrive(drive, selfAssessmentFileId);
  const maturity = await extractMaturityData(excelBuffer);

  const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
  const zip = new PizZip(templateBuffer);

  preprocessTemplateXml(zip);

  const doc = new Docxtemplater(zip, { paragraphLoop: false, linebreaks: true });

  doc.render({
    agencyName:      agencyName || 'Unknown Agency',
    reportDate:      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    currentMaturity: maturity.overallCurrent,
    targetMaturity:  maturity.overallTarget,
    currentRSP:      maturity.recruitment,
    currentPM:       maturity.performanceMgmt,
    currentLD:       maturity.learningDev,
    currentRR:       maturity.rewardsRecog,
    screenshotSystemPractice: '',
    screenshotCompetency:     '',
  });

  const buffer = doc.getZip().generate({ type: 'nodebuffer' });
  return { buffer, data: maturity };
}

module.exports = { generateNarrativeReport };
