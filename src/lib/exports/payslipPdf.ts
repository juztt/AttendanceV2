// Lightweight PDF generator for payslips
// We build a minimal but valid PDF directly without external deps so it always works in the browser.

import type { PayrollItem, PayrollPeriod, Employee, Company, Profile } from '@/types';
import { formatCurrency, thaiDateShort } from '@/lib/utils';

interface GenerateArgs {
  item: PayrollItem;
  period: PayrollPeriod;
  employee: Employee;
  company: Company | null;
  profile: Profile;
}

const HELV = 'Helvetica'; // built-in
const HELV_B = 'Helvetica-Bold';

function textLines(pdf: string[], text: string, x: number, y: number, font: string = HELV, size: number = 10) {
  // Escape parens and backslashes for PDF strings
  const safe = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  pdf.push(`BT /${font} ${size} Tf ${x} ${y} Tm (${safe}) Tj ET`);
}

function hr(pdf: string[], x1: number, y: number, x2: number) {
  pdf.push(`${x1} ${y} m ${x2} ${y} l S`);
}

function fmt(n: number): string {
  return formatCurrency(n);
}

export function generatePayslipPDF(args: GenerateArgs) {
  const { item, period, employee, company, profile } = args;

  // A4 portrait: 595 x 842 pt
  const W = 595;
  const H = 842;
  const margin = 50;

  const objects: string[] = [];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  // 1: Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>');

  // We will fill objects list then assign IDs. Simpler approach: build sequentially and keep IDs map.

  // Reset and rebuild with explicit IDs
  const obj: string[] = [];
  const ids: Record<string, number> = {};
  // Use simple counter
  let counter = 1;

  // Reserve IDs
  ids['catalog'] = counter++;
  ids['pages'] = counter++;
  ids['page'] = counter++;
  ids['font'] = counter++;
  ids['fontB'] = counter++;
  ids['content'] = counter++;

  // Build content stream
  const stream: string[] = [];
  let y = H - margin;

  // Header
  stream.push(`${margin} ${y} m ${W - margin} ${y} l S`); y -= 20;
  textLines(stream, company?.name ?? 'บริษัท', margin, y, HELV_B, 16); y -= 6;
  textLines(stream, 'สลิปเงินเดือน (Payslip)', W - margin - 100, y, HELV_B, 14); y -= 18;
  if (company?.address) { textLines(stream, company.address, margin, y, HELV, 9); y -= 12; }
  hr(stream, margin, y, W - margin); y -= 18;

  // Period
  textLines(stream, `รอบเงินเดือน: ${period.period_year}-${String(period.period_month).padStart(2, '0')}`, margin, y, HELV_B, 11);
  textLines(stream, `วันที่: ${thaiDateShort(period.start_date)} - ${thaiDateShort(period.end_date)}`, margin + 200, y, HELV, 10);
  y -= 18;

  // Employee info
  textLines(stream, `ชื่อพนักงาน: ${employee.full_name}`, margin, y, HELV, 10);
  textLines(stream, `รหัส: ${employee.employee_code ?? '-'}`, margin + 280, y, HELV, 10); y -= 14;
  textLines(stream, `ตำแหน่ง: ${employee.position ?? '-'}`, margin, y, HELV, 10);
  textLines(stream, `อีเมล: ${profile.email}`, margin + 280, y, HELV, 10); y -= 14;
  textLines(stream, `ประเภท: ${labelType(employee.employment_type)}`, margin, y, HELV, 10); y -= 20;

  hr(stream, margin, y, W - margin); y -= 16;
  textLines(stream, 'รายการ', margin, y, HELV_B, 11);
  textLines(stream, 'จำนวนเงิน (บาท)', W - margin - 110, y, HELV_B, 11); y -= 14;

  const row = (label: string, value: number) => {
    textLines(stream, label, margin + 10, y, HELV, 10);
    const str = (value < 0 ? '-' : '') + fmt(Math.abs(value));
    textLines(stream, str, W - margin - 110, y, value < 0 ? HELV : HELV, 10);
    y -= 14;
  };
  row('วันทำงาน', item.work_days as unknown as number);
  textLines(stream, `(วันหยุด: ${item.day_off_days}, ลา: ${item.leave_days}, ขาด: ${item.absent_days})`, margin + 10, y, HELV, 9); y -= 14;
  row(`ค่าแรงพื้นฐาน (${(item.regular_hours).toFixed(2)} ชม.)`, item.base_pay);
  row(`ค่า OT (${item.ot_hours.toFixed(2)} ชม.)`, item.ot_pay);
  row('ค่าทำงานวันหยุดนักขัตฤกษ์', item.holiday_pay);
  row('ค่าลาที่ได้รับ', item.leave_pay);
  if (item.other_earnings !== 0) row('เพิ่มพิเศษ', item.other_earnings);
  row('หักขาด/ทำไม่ครบ', -item.shortage_deduction);
  if (item.other_deductions !== 0) row('หักอื่น ๆ', -item.other_deductions);

  y -= 8;
  hr(stream, margin, y, W - margin); y -= 18;
  textLines(stream, 'เงินสุทธิ (Net Pay)', margin + 10, y, HELV_B, 12);
  textLines(stream, fmt(item.net_pay) + ' บาท', W - margin - 130, y, HELV_B, 14);
  y -= 30;

  hr(stream, margin, y, W - margin); y -= 14;
  textLines(stream, `วันที่ออกสลิป: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y, HELV, 9);
  textLines(stream, 'สร้างโดย Mini TimePay', W - margin - 110, y, HELV, 9);
  y -= 12;
  textLines(stream, 'เอกสารนี้สร้างจากระบบอัตโนมัติ ไม่ต้องลงนาม', margin, y, HELV, 8);

  const contentBody = stream.join('\n');
  const contentLen = contentBody.length;

  // Now build the PDF objects
  obj.length = 0;
  obj.push(`${ids.catalog} 0 obj\n<< /Type /Catalog /Pages ${ids.pages} 0 R >>\nendobj\n`);
  obj.push(`${ids.pages} 0 obj\n<< /Type /Pages /Kids [${ids.page} 0 R] /Count 1 >>\nendobj\n`);
  obj.push(`${ids.page} 0 obj\n<< /Type /Page /Parent ${ids.pages} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /Helvetica ${ids.font} 0 R /Helvetica-Bold ${ids.fontB} 0 R >> >> /Contents ${ids.content} 0 R >>\nendobj\n`);
  obj.push(`${ids.font} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);
  obj.push(`${ids.fontB} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);
  obj.push(`${ids.content} 0 obj\n<< /Length ${contentLen} >>\nstream\n${contentBody}\nendstream\nendobj\n`);

  // Build PDF file
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];
  for (const o of obj) {
    offsets.push(pdf.length);
    pdf += o + '\n';
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${obj.length + 1} /Root ${ids.catalog} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  // Download
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip_${employee.employee_code ?? employee.id}_${period.period_year}-${String(period.period_month).padStart(2, '0')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function labelType(t: string): string {
  switch (t) {
    case 'fulltime_passed': return 'ประจำผ่านโปร';
    case 'fulltime_not_passed': return 'ประจำยังไม่ผ่านโปร';
    case 'parttime': return 'พาร์ทไทม์';
    default: return t;
  }
}
