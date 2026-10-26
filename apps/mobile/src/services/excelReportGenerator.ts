import XLSX from 'xlsx-js-style';
import type { HealthReportExportOptions } from './nativeMedia';

interface CellStyle {
  font?: {
    name?: string;
    sz?: number;
    bold?: boolean;
    italic?: boolean;
    color?: { rgb: string };
  };
  fill?: {
    fgColor: { rgb: string };
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'center' | 'bottom';
    wrapText?: boolean;
    indent?: number;
  };
  border?: {
    top?: { style: string; color: { rgb: string } };
    bottom?: { style: string; color: { rgb: string } };
    left?: { style: string; color: { rgb: string } };
    right?: { style: string; color: { rgb: string } };
  };
  numFmt?: string;
}

interface WorksheetCell {
  v: string | number;
  t: 's' | 'n' | 'b';
  s?: CellStyle;
}

export interface GeneratedExcelResult {
  base64: string;
  fileName: string;
}

const thinBorder = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const headerBorder = {
  top: { style: 'medium', color: { rgb: '0F172A' } },
  bottom: { style: 'medium', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: '334155' } },
  right: { style: 'thin', color: { rgb: '334155' } },
};

const titleBorder = {
  top: { style: 'medium', color: { rgb: '047857' } },
  bottom: { style: 'medium', color: { rgb: '047857' } },
  left: { style: 'medium', color: { rgb: '047857' } },
  right: { style: 'medium', color: { rgb: '047857' } },
};

const aiBoxBorder = {
  top: { style: 'thin', color: { rgb: '86EFAC' } },
  bottom: { style: 'thin', color: { rgb: '86EFAC' } },
  left: { style: 'thin', color: { rgb: '86EFAC' } },
  right: { style: 'thin', color: { rgb: '86EFAC' } },
};

const alertBoxBorder = {
  top: { style: 'thin', color: { rgb: 'FCA5A5' } },
  bottom: { style: 'thin', color: { rgb: 'FCA5A5' } },
  left: { style: 'thin', color: { rgb: 'FCA5A5' } },
  right: { style: 'thin', color: { rgb: 'FCA5A5' } },
};

/**
 * Helper to set styled cell in worksheet with cell coordinates
 */
const setCell = (
  ws: Record<string, any>,
  colIndex: number,
  rowIndex: number,
  val: string | number,
  type: 's' | 'n',
  style?: CellStyle
) => {
  const cellRef = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
  ws[cellRef] = {
    v: val,
    t: type,
    s: style || {},
  } as WorksheetCell;
};

/**
 * Helper to fill all cells in a merged block so background color and borders render completely in Excel
 */
const fillMergedRange = (
  ws: Record<string, any>,
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  value: string | number,
  type: 's' | 'n',
  style?: CellStyle
) => {
  if (!ws['!merges']) {
    ws['!merges'] = [];
  }
  ws['!merges'].push({
    s: { c: startCol, r: startRow },
    e: { c: endCol, r: endRow },
  });

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const isTopLeft = r === startRow && c === startCol;
      setCell(ws, c, r, isTopLeft ? value : '', isTopLeft ? type : 's', style);
    }
  }
};

/**
 * Builds a professionally formatted medical Excel (.xlsx) workbook
 */
export const buildHealthReportExcel = (
  options: HealthReportExportOptions,
  isVi: boolean
): GeneratedExcelResult => {
  const wb = XLSX.utils.book_new();
  const ws: Record<string, any> = {};

  const currentDate = new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeRangeLabel =
    options.timeRange === '7d'
      ? (isVi ? '7 Ngày' : '7 Days')
      : options.timeRange === '30d'
        ? (isVi ? '30 Ngày' : '30 Days')
        : (isVi ? '90 Ngày' : '90 Days');

  // --- 1. Title Banner (Rows 0-1, A1:F2 merged) ---
  const reportTitle = isVi
    ? 'BÁO CÁO CHỈ SỐ SỨC KHỎE LÂM SÀNG'
    : 'CLINICAL HEALTH TELEMETRY REPORT';
  fillMergedRange(
    ws,
    0, 0, 5, 1,
    reportTitle,
    's',
    {
      font: { name: 'Segoe UI', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '10B981' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: titleBorder,
    }
  );

  // --- 2. Administrative Info (Rows 3-4) ---
  // Row 3 (Excel Row 4): Patient Name & Dossier ID
  setCell(ws, 0, 3, isVi ? 'Bệnh nhân:' : 'Patient:', 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  });
  fillMergedRange(
    ws,
    1, 3, 2, 3,
    options.patientName || (isVi ? 'Nguyễn Văn An' : 'Nguyen Van An'),
    's',
    {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinBorder,
    }
  );

  setCell(ws, 3, 3, isVi ? 'Mã hồ sơ:' : 'Dossier ID:', 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  });
  fillMergedRange(
    ws,
    4, 3, 5, 3,
    'HS-8921-2026',
    's',
    {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinBorder,
    }
  );

  // Row 4 (Excel Row 5): Time Period & Export Date
  setCell(ws, 0, 4, isVi ? 'Khoảng thời gian:' : 'Period:', 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  });
  fillMergedRange(
    ws,
    1, 4, 2, 4,
    `${timeRangeLabel} (${isVi ? '11/10/2026 - 17/10/2026' : 'Oct 11, 2026 - Oct 17, 2026'})`,
    's',
    {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '047857' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinBorder,
    }
  );

  setCell(ws, 3, 4, isVi ? 'Ngày xuất:' : 'Export Date:', 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  });
  fillMergedRange(
    ws,
    4, 4, 5, 4,
    currentDate,
    's',
    {
      font: { name: 'Segoe UI', sz: 10, color: { rgb: '475569' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinBorder,
    }
  );

  let currentRow = 6;

  // --- 3. AI Clinical Summary (if enabled) ---
  if (options.includeAiSummary) {
    // Section Title (Row 6)
    fillMergedRange(
      ws,
      0, currentRow, 5, currentRow,
      isVi ? '✦ TÓM TẮT TỔNG QUAN TỪ TRỢ LÝ AI' : '✦ AI CLINICAL OBSERVATION & SUMMARY',
      's',
      {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '065F46' } },
        fill: { fgColor: { rgb: 'DCFCE7' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: aiBoxBorder,
      }
    );
    currentRow++;

    // Content Box (Row 7-8)
    const aiText = isVi
      ? 'Trong thời gian theo dõi, chỉ số huyết áp khá ổn định ở mức trung bình 120/80 mmHg. Đường huyết có 1 lần vượt ngưỡng nhẹ vào sáng ngày thứ 3 (125 mg/dL). Khuyến nghị tiếp tục duy trì chế độ ăn nhạt, sinh hoạt điều độ và tiếp tục đo định kỳ.'
      : 'During the observation period, blood pressure remained stable at an average of 120/80 mmHg. Fasting blood sugar slightly elevated on day 3 (125 mg/dL). Recommended to maintain low sodium diet and regular monitoring.';

    fillMergedRange(
      ws,
      0, currentRow, 5, currentRow + 1,
      aiText,
      's',
      {
        font: { name: 'Segoe UI', sz: 9, color: { rgb: '14532D' } },
        fill: { fgColor: { rgb: 'F0FDF4' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: aiBoxBorder,
      }
    );
    currentRow += 3; // Leaves 1 blank row spacing
  }

  // --- 4. Biometric Telemetry Data Table ---
  // Section Header
  fillMergedRange(
    ws,
    0, currentRow, 5, currentRow,
    isVi ? 'DỮ LIỆU CHỈ SỐ SINH HIỆU CHI TIẾT' : 'DETAILED BIOMETRIC TELEMETRY',
    's',
    {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1E293B' } },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: headerBorder,
    }
  );
  currentRow++;

  // Table Column Headers
  const telemetryHeaders = isVi
    ? [
        'Thời gian',
        'Huyết áp tâm thu (mmHg)',
        'Huyết áp tâm trương (mmHg)',
        'Đường huyết đói (mg/dL)',
        'Nhịp tim (BPM)',
        'Đánh giá lâm sàng',
      ]
    : [
        'Timestamp',
        'Systolic BP (mmHg)',
        'Diastolic BP (mmHg)',
        'Fasting Glucose (mg/dL)',
        'Heart Rate (BPM)',
        'Clinical Assessment',
      ];

  telemetryHeaders.forEach((headerText, colIdx) => {
    setCell(ws, colIdx, currentRow, headerText, 's', {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E293B' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: headerBorder,
    });
  });
  currentRow++;

  // Table Data Rows
  const readings = [
    { time: '17/10/2026 08:00', sys: 120, dia: 80, glucose: 102, hr: 74, eval: isVi ? 'Bình thường' : 'Normal', type: 'normal' },
    { time: '16/10/2026 08:15', sys: 124, dia: 82, glucose: 108, hr: 78, eval: isVi ? 'Bình thường' : 'Normal', type: 'normal' },
    { time: '15/10/2026 08:00', sys: 138, dia: 88, glucose: 125, hr: 82, eval: isVi ? 'Hơi cao (Cần chú ý)' : 'Elevated (Attention)', type: 'warning' },
    { time: '14/10/2026 08:30', sys: 122, dia: 80, glucose: 98,  hr: 72, eval: isVi ? 'Đạt mục tiêu' : 'Target Achieved', type: 'normal' },
    { time: '13/10/2026 08:00', sys: 118, dia: 78, glucose: 95,  hr: 70, eval: isVi ? 'Tối ưu' : 'Optimal', type: 'normal' },
    { time: '12/10/2026 08:00', sys: 121, dia: 80, glucose: 101, hr: 73, eval: isVi ? 'Bình thường' : 'Normal', type: 'normal' },
    { time: '11/10/2026 08:00', sys: 125, dia: 82, glucose: 105, hr: 75, eval: isVi ? 'Bình thường' : 'Normal', type: 'normal' },
  ];

  readings.forEach((row, idx) => {
    const isZebra = idx % 2 === 1;
    const bgRgb = isZebra ? 'F8FAFC' : 'FFFFFF';

    // Col A: Timestamp
    setCell(ws, 0, currentRow, row.time, 's', {
      font: { name: 'Segoe UI', sz: 9.5, color: { rgb: '334155' } },
      fill: { fgColor: { rgb: bgRgb } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    // Col B: Systolic BP
    setCell(ws, 1, currentRow, row.sys, 'n', {
      font: {
        name: 'Segoe UI',
        sz: 10,
        bold: row.sys >= 135,
        color: { rgb: row.sys >= 135 ? 'B45309' : '0F172A' },
      },
      fill: { fgColor: { rgb: row.sys >= 135 ? 'FEF3C7' : bgRgb } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    // Col C: Diastolic BP
    setCell(ws, 2, currentRow, row.dia, 'n', {
      font: { name: 'Segoe UI', sz: 10, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: bgRgb } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    // Col D: Glucose
    setCell(ws, 3, currentRow, row.glucose, 'n', {
      font: {
        name: 'Segoe UI',
        sz: 10,
        bold: row.glucose >= 120,
        color: { rgb: row.glucose >= 120 ? 'B45309' : '0F172A' },
      },
      fill: { fgColor: { rgb: row.glucose >= 120 ? 'FEF3C7' : bgRgb } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    // Col E: Heart Rate
    setCell(ws, 4, currentRow, row.hr, 'n', {
      font: { name: 'Segoe UI', sz: 10, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: bgRgb } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    // Col F: Assessment
    const isWarning = row.type === 'warning';
    setCell(ws, 5, currentRow, row.eval, 's', {
      font: {
        name: 'Segoe UI',
        sz: 9.5,
        bold: true,
        color: { rgb: isWarning ? '9A3412' : '047857' },
      },
      fill: { fgColor: { rgb: isWarning ? 'FFEDD5' : (isZebra ? 'F0FDF4' : 'ECFDF5') } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    currentRow++;
  });

  currentRow++; // Spacing row

  // --- 5. Alerts & Clinical Notes (if enabled) ---
  if (options.includeAlerts) {
    // Section Header
    fillMergedRange(
      ws,
      0, currentRow, 5, currentRow,
      isVi ? '⚠ LỊCH SỬ CẢNH BÁO & GHI CHÚ ĐIỀU TRỊ' : '⚠ ALERT HISTORY & CLINICAL ACTION NOTES',
      's',
      {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '991B1B' } },
        fill: { fgColor: { rgb: 'FEE2E2' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: alertBoxBorder,
      }
    );
    currentRow++;

    // Alert Table Headers
    // Col A: Timestamp, Col B: Severity, Col C-D: Description, Col E-F: Action
    setCell(ws, 0, currentRow, isVi ? 'Thời gian' : 'Timestamp', 's', {
      font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '334155' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: headerBorder,
    });
    setCell(ws, 1, currentRow, isVi ? 'Mức độ' : 'Severity', 's', {
      font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '334155' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: headerBorder,
    });
    fillMergedRange(
      ws,
      2, currentRow, 3, currentRow,
      isVi ? 'Nội dung cảnh báo' : 'Alert Description',
      's',
      {
        font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: headerBorder,
      }
    );
    fillMergedRange(
      ws,
      4, currentRow, 5, currentRow,
      isVi ? 'Khuyến nghị bác sĩ' : 'Recommended Action',
      's',
      {
        font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: headerBorder,
      }
    );
    currentRow++;

    // Alert Data Rows
    const alerts = [
      {
        time: '15/10/2026 08:00',
        severity: isVi ? 'Cần chú ý' : 'Attention',
        sevColor: '92400E',
        sevBg: 'FEF3C7',
        desc: isVi ? 'Huyết áp tâm thu 138 mmHg vượt ngưỡng mục tiêu' : 'Systolic BP 138 mmHg exceeded target',
        action: isVi ? 'Nghỉ ngơi 15 phút và đo lại' : 'Rest 15 minutes and remeasure',
      },
      {
        time: '15/10/2026 08:00',
        severity: isVi ? 'Cảnh báo nhẹ' : 'Mild Alert',
        sevColor: '9A3412',
        sevBg: 'FFEDD5',
        desc: isVi ? 'Đường huyết sáng 125 mg/dL cao hơn mức chuẩn' : 'Fasting glucose 125 mg/dL elevated',
        action: isVi ? 'Uống thuốc đúng giờ và hạn chế tinh bột' : 'Take prescribed medication and reduce carbs',
      },
    ];

    alerts.forEach((alt) => {
      setCell(ws, 0, currentRow, alt.time, 's', {
        font: { name: 'Segoe UI', sz: 9, color: { rgb: '334155' } },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder,
      });

      setCell(ws, 1, currentRow, alt.severity, 's', {
        font: { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: alt.sevColor } },
        fill: { fgColor: { rgb: alt.sevBg } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder,
      });

      fillMergedRange(ws, 2, currentRow, 3, currentRow, alt.desc, 's', {
        font: { name: 'Segoe UI', sz: 9, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      });

      fillMergedRange(ws, 4, currentRow, 5, currentRow, alt.action, 's', {
        font: { name: 'Segoe UI', sz: 9, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      });

      currentRow++;
    });

    currentRow++; // Spacing row
  }

  // --- 6. Footer Disclaimer ---
  fillMergedRange(
    ws,
    0, currentRow, 5, currentRow,
    isVi
      ? 'Báo cáo được khởi tạo tự động từ Nền tảng Chăm sóc Sức khỏe Telecare. Dữ liệu có giá trị tham vấn chuyên môn với Bác sĩ phụ trách.'
      : 'Report automatically generated from the Telecare Health Platform. Data is intended for clinical consultation with your attending physician.',
    's',
    {
      font: { name: 'Segoe UI', sz: 8.5, italic: true, color: { rgb: '64748B' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    }
  );

  // Set explicit column widths to prevent text clipping
  ws['!cols'] = [
    { wch: 22 }, // A: Thời gian
    { wch: 26 }, // B: Huyết áp tâm thu
    { wch: 26 }, // C: Huyết áp tâm trương
    { wch: 26 }, // D: Đường huyết đói
    { wch: 18 }, // E: Nhịp tim
    { wch: 26 }, // F: Đánh giá lâm sàng
  ];

  // Set worksheet range
  ws['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: 5, r: currentRow },
  });

  const sheetName = isVi ? 'Bao_Cao_Suc_Khoe' : 'Clinical_Report';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const base64 = XLSX.write(wb, {
    type: 'base64',
    bookType: 'xlsx',
  });

  const fileName = isVi
    ? `Bao_Cao_Suc_Khoe_${options.timeRange.toUpperCase()}.xlsx`
    : `Health_Report_${options.timeRange.toUpperCase()}.xlsx`;

  return {
    base64,
    fileName,
  };
};
