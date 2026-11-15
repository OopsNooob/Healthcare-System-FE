import XLSX from 'xlsx-js-style';
import i18n from '@/i18n';
import type { HealthReportExportOptions } from './nativeMedia';

export interface ExcelHealthReadingRow {
  time: string;
  systolic?: number | null;
  diastolic?: number | null;
  glucose?: number | null;
  heartRate?: number | null;
  assessment: string;
  isWarning?: boolean;
}

export interface ExcelHealthAlertRow {
  time: string;
  severity: string;
  isHigh?: boolean;
  description: string;
  action: string;
}

export interface DynamicHealthReportExportOptions extends HealthReportExportOptions {
  patientCode?: string;
  periodText?: string;
  aiSummaryText?: string;
  readings?: ExcelHealthReadingRow[];
  alerts?: ExcelHealthAlertRow[];
}

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

export const buildHealthReportExcel = (
  options: DynamicHealthReportExportOptions
): GeneratedExcelResult => {
  const wb = XLSX.utils.book_new();
  const ws: Record<string, any> = {};

  const currentDate = new Date().toLocaleDateString(i18n.t('mobile.date_locale', 'vi-VN'), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeRangeLabel =
    options.periodText ||
    (options.timeRange === '7d'
      ? i18n.t('mobile.range_7d_short', '7 Ngày')
      : options.timeRange === '30d'
        ? i18n.t('mobile.range_30d_short', '30 Ngày')
        : i18n.t('mobile.range_90d_short', '90 Ngày'));

  const reportTitle = i18n.t('mobile.excel_report_title', 'BÁO CÁO CHỈ SỐ SỨC KHỎE LÂM SÀNG');
  fillMergedRange(ws, 0, 0, 5, 1, reportTitle, 's', {
    font: { name: 'Segoe UI', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '10B981' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: titleBorder,
  });

  setCell(ws, 0, 3, i18n.t('mobile.excel_patient_label', 'Bệnh nhân:'), 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  });
  fillMergedRange(
    ws,
    1,
    3,
    2,
    3,
    options.patientName || i18n.t('mobile.patient_label', 'Bệnh nhân'),
    's',
    {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinBorder,
    }
  );

  setCell(ws, 3, 3, i18n.t('mobile.excel_dossier_id_label', 'Mã hồ sơ:'), 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  });
  fillMergedRange(ws, 4, 3, 5, 3, options.patientCode || '—', 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  });

  setCell(ws, 0, 4, i18n.t('mobile.excel_period_label', 'Khoảng thời gian:'), 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  });
  fillMergedRange(ws, 1, 4, 2, 4, timeRangeLabel, 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '047857' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  });

  setCell(ws, 3, 4, i18n.t('mobile.excel_export_date_label', 'Ngày xuất:'), 's', {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  });
  fillMergedRange(ws, 4, 4, 5, 4, currentDate, 's', {
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '475569' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  });

  let currentRow = 6;

  if (options.includeAiSummary) {
    fillMergedRange(
      ws,
      0,
      currentRow,
      5,
      currentRow,
      i18n.t('mobile.excel_ai_section_title', '✦ TÓM TẮT TỔNG QUAN TỪ TRỢ LÝ AI'),
      's',
      {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '065F46' } },
        fill: { fgColor: { rgb: 'DCFCE7' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: aiBoxBorder,
      }
    );
    currentRow++;

    const aiText =
      options.aiSummaryText?.trim() ||
      i18n.t('mobile.excel_no_ai_summary', 'Chưa có tóm tắt AI cho khoảng thời gian này.');

    fillMergedRange(ws, 0, currentRow, 5, currentRow + 1, aiText, 's', {
      font: { name: 'Segoe UI', sz: 9, color: { rgb: '14532D' } },
      fill: { fgColor: { rgb: 'F0FDF4' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: aiBoxBorder,
    });
    currentRow += 3;
  }

  if (options.includeCharts) {
    fillMergedRange(
      ws,
      0,
      currentRow,
      5,
      currentRow,
      i18n.t('mobile.excel_telemetry_section_title', 'DỮ LIỆU CHỈ SỐ SINH HIỆU CHI TIẾT'),
      's',
      {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: 'E2E8F0' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: headerBorder,
      }
    );
    currentRow++;

    const telemetryHeaders = [
      i18n.t('mobile.excel_col_timestamp', 'Thời gian'),
      i18n.t('mobile.excel_col_sys_bp', 'Huyết áp tâm thu (mmHg)'),
      i18n.t('mobile.excel_col_dia_bp', 'Huyết áp tâm trương (mmHg)'),
      i18n.t('mobile.excel_col_glucose', 'Đường huyết (mg/dL)'),
      i18n.t('mobile.excel_col_hr', 'Nhịp tim (BPM)'),
      i18n.t('mobile.excel_col_assessment', 'Đánh giá lâm sàng'),
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

    const readings = options.readings ?? [];
    if (readings.length === 0) {
      fillMergedRange(
        ws,
        0,
        currentRow,
        5,
        currentRow,
        i18n.t('mobile.excel_no_readings', 'Chưa có dữ liệu chỉ số sinh hiệu trong khoảng thời gian đã chọn.'),
        's',
        {
          font: { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '64748B' } },
          fill: { fgColor: { rgb: 'F8FAFC' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        }
      );
      currentRow++;
    } else {
      readings.forEach((row, idx) => {
        const isZebra = idx % 2 === 1;
        const bgRgb = isZebra ? 'F8FAFC' : 'FFFFFF';

        setCell(ws, 0, currentRow, row.time, 's', {
          font: { name: 'Segoe UI', sz: 9.5, color: { rgb: '334155' } },
          fill: { fgColor: { rgb: bgRgb } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        });

        const hasSys = typeof row.systolic === 'number' && Number.isFinite(row.systolic);
        setCell(ws, 1, currentRow, hasSys ? (row.systolic as number) : '—', hasSys ? 'n' : 's', {
          font: {
            name: 'Segoe UI',
            sz: 10,
            bold: hasSys && (row.systolic as number) >= 135,
            color: { rgb: hasSys && (row.systolic as number) >= 135 ? 'B45309' : '0F172A' },
          },
          fill: { fgColor: { rgb: hasSys && (row.systolic as number) >= 135 ? 'FEF3C7' : bgRgb } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        });

        const hasDia = typeof row.diastolic === 'number' && Number.isFinite(row.diastolic);
        setCell(ws, 2, currentRow, hasDia ? (row.diastolic as number) : '—', hasDia ? 'n' : 's', {
          font: { name: 'Segoe UI', sz: 10, color: { rgb: '0F172A' } },
          fill: { fgColor: { rgb: bgRgb } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        });

        const hasGlucose = typeof row.glucose === 'number' && Number.isFinite(row.glucose);
        setCell(ws, 3, currentRow, hasGlucose ? (row.glucose as number) : '—', hasGlucose ? 'n' : 's', {
          font: {
            name: 'Segoe UI',
            sz: 10,
            bold: hasGlucose && (row.glucose as number) >= 126,
            color: { rgb: hasGlucose && (row.glucose as number) >= 126 ? 'B45309' : '0F172A' },
          },
          fill: { fgColor: { rgb: hasGlucose && (row.glucose as number) >= 126 ? 'FEF3C7' : bgRgb } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        });

        const hasHr = typeof row.heartRate === 'number' && Number.isFinite(row.heartRate);
        setCell(ws, 4, currentRow, hasHr ? (row.heartRate as number) : '—', hasHr ? 'n' : 's', {
          font: { name: 'Segoe UI', sz: 10, color: { rgb: '0F172A' } },
          fill: { fgColor: { rgb: bgRgb } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        });

        const isWarning = Boolean(row.isWarning);
        setCell(ws, 5, currentRow, row.assessment, 's', {
          font: {
            name: 'Segoe UI',
            sz: 9.5,
            bold: true,
            color: { rgb: isWarning ? '9A3412' : '047857' },
          },
          fill: { fgColor: { rgb: isWarning ? 'FFEDD5' : isZebra ? 'F0FDF4' : 'ECFDF5' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        });

        currentRow++;
      });
    }

    currentRow++;
  }

  if (options.includeAlerts) {
    fillMergedRange(
      ws,
      0,
      currentRow,
      5,
      currentRow,
      i18n.t('mobile.excel_alerts_section_title', '⚠ LỊCH SỬ CẢNH BÁO & GHI CHÚ ĐIỀU TRỊ'),
      's',
      {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '991B1B' } },
        fill: { fgColor: { rgb: 'FEE2E2' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: alertBoxBorder,
      }
    );
    currentRow++;

    setCell(ws, 0, currentRow, i18n.t('mobile.excel_col_timestamp', 'Thời gian'), 's', {
      font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '334155' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: headerBorder,
    });
    setCell(ws, 1, currentRow, i18n.t('mobile.excel_col_severity', 'Mức độ'), 's', {
      font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '334155' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: headerBorder,
    });
    fillMergedRange(
      ws,
      2,
      currentRow,
      3,
      currentRow,
      i18n.t('mobile.excel_col_alert_desc', 'Nội dung cảnh báo'),
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
      4,
      currentRow,
      5,
      currentRow,
      i18n.t('mobile.excel_col_recommended_action', 'Trạng thái / Khuyến nghị'),
      's',
      {
        font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: headerBorder,
      }
    );
    currentRow++;

    const alerts = options.alerts ?? [];
    if (alerts.length === 0) {
      fillMergedRange(
        ws,
        0,
        currentRow,
        5,
        currentRow,
        i18n.t('mobile.excel_no_alerts', 'Không ghi nhận cảnh báo sức khỏe trong khoảng thời gian đã chọn.'),
        's',
        {
          font: { name: 'Segoe UI', sz: 9, italic: true, color: { rgb: '64748B' } },
          fill: { fgColor: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        }
      );
      currentRow++;
    } else {
      alerts.forEach((alt) => {
        const sevColor = alt.isHigh ? '991B1B' : '92400E';
        const sevBg = alt.isHigh ? 'FEE2E2' : 'FEF3C7';

        setCell(ws, 0, currentRow, alt.time, 's', {
          font: { name: 'Segoe UI', sz: 9, color: { rgb: '334155' } },
          fill: { fgColor: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        });

        setCell(ws, 1, currentRow, alt.severity, 's', {
          font: { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: sevColor } },
          fill: { fgColor: { rgb: sevBg } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        });

        fillMergedRange(ws, 2, currentRow, 3, currentRow, alt.description, 's', {
          font: { name: 'Segoe UI', sz: 9, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
          border: thinBorder,
        });

        fillMergedRange(ws, 4, currentRow, 5, currentRow, alt.action, 's', {
          font: { name: 'Segoe UI', sz: 9, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
          border: thinBorder,
        });

        currentRow++;
      });
    }

    currentRow++;
  }

  fillMergedRange(
    ws,
    0,
    currentRow,
    5,
    currentRow,
    i18n.t(
      'mobile.excel_footer_disclaimer',
      'Báo cáo được khởi tạo tự động từ Nền tảng Chăm sóc Sức khỏe Telecare. Dữ liệu có giá trị tham vấn chuyên môn với Bác sĩ phụ trách.'
    ),
    's',
    {
      font: { name: 'Segoe UI', sz: 8.5, italic: true, color: { rgb: '64748B' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    }
  );

  ws['!cols'] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 26 },
    { wch: 24 },
    { wch: 18 },
    { wch: 28 },
  ];

  ws['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: 5, r: currentRow },
  });

  const sheetName = i18n.t('mobile.excel_sheet_name', 'Bao_Cao_Suc_Khoe');
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const base64 = XLSX.write(wb, {
    type: 'base64',
    bookType: 'xlsx',
  });

  const fileName = `${i18n.t('mobile.excel_file_prefix', 'Bao_Cao_Suc_Khoe')}_${options.timeRange.toUpperCase()}.xlsx`;

  return {
    base64,
    fileName,
  };
};
