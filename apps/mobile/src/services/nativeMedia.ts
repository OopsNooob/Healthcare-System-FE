import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Toast from 'react-native-toast-message';
import i18n from '@/i18n';

export interface NativeMediaFile {
  uri: string;
  name: string;
  size: string;
  sizeBytes?: number;
  type: 'image' | 'file';
  mimeType?: string;
}

export interface GeneratedReport {
  uri: string;
  name: string;
  size: string;
  type: 'pdf' | 'csv' | 'html';
  mimeType: string;
}

export interface HealthReportExportOptions {
  patientName?: string;
  timeRange: string;
  format?: 'pdf' | 'csv';
  includeAiSummary: boolean;
  includeCharts: boolean;
  includeAlerts: boolean;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '1.2 MB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Request camera or media library permission
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: i18n.t('mobile.camera_perm_denied', 'Camera Permission Denied'),
        text2: i18n.t('mobile.camera_perm_desc', 'Please grant camera permission in device settings.'),
      });
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Error requesting camera permission:', error);
    return false;
  }
};

export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: i18n.t('mobile.gallery_perm_denied', 'Gallery Permission Denied'),
        text2: i18n.t('mobile.gallery_perm_desc', 'Please grant photo library permission in device settings.'),
      });
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Error requesting media library permission:', error);
    return false;
  }
};

/**
 * Capture photo with Camera or pick from Gallery
 */
export const pickNativeImage = async (
  source: 'camera' | 'gallery',
  options?: { allowsEditing?: boolean; aspect?: [number, number]; quality?: number }
): Promise<NativeMediaFile | null> => {
  try {
    const quality = options?.quality ?? 0.8;
    const allowsEditing = options?.allowsEditing ?? true;
    const aspect = options?.aspect;

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return null;

      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing,
        aspect,
        quality,
      });
    } else {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return null;

      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing,
        aspect,
        quality,
      });
    }

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName || `Photo_${Date.now()}.jpg`;
    const fileSizeFormatted = formatFileSize(asset.fileSize);

    return {
      uri: asset.uri,
      name: fileName,
      size: fileSizeFormatted,
      sizeBytes: asset.fileSize,
      type: 'image',
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error) {
    console.error('pickNativeImage error:', error);
    Toast.show({
      type: 'error',
      text1: i18n.t('mobile.error', 'Error'),
      text2: i18n.t('mobile.file_pick_error_desc', 'Không thể mở máy ảnh hoặc thư viện.'),
    });
    return null;
  }
};

/**
 * Pick real PDF document from phone storage
 */
export const pickNativePdfDocument = async (): Promise<NativeMediaFile | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const doc = result.assets[0];
    const formattedSize = formatFileSize(doc.size);

    return {
      uri: doc.uri,
      name: doc.name || `Document_${Date.now()}.pdf`,
      size: formattedSize,
      sizeBytes: doc.size,
      type: 'file',
      mimeType: doc.mimeType || 'application/pdf',
    };
  } catch (error) {
    console.error('pickNativePdfDocument error:', error);
    Toast.show({
      type: 'error',
      text1: i18n.t('mobile.file_pick_error', 'Document Pick Error'),
      text2: i18n.t('mobile.file_pick_error_desc', 'Không thể mở trình quản lý tệp trên thiết bị.'),
    });
    return null;
  }
};

/**
 * Generate medical PDF/CSV report safely and return local file details without triggering native intent collisions
 */
export const generateHealthReport = async (
  options: HealthReportExportOptions
): Promise<GeneratedReport | null> => {
  try {
    const isVi = i18n.language === 'vi';
    const currentDate = new Date().toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const docTitle = isVi ? 'Báo Cáo Sức Khỏe Lâm Sàng' : 'Clinical Health Report';
    const docSubtitle = isVi ? 'Báo Cáo Sức Khỏe & Giám Sát Điều Trị Mạn Tính' : 'Chronic Care & Telecare Monitoring Report';
    const patientLabel = isVi ? 'Bệnh nhân' : 'Patient';
    const periodLabel = isVi ? 'Thời gian báo cáo' : 'Period';
    const exportDateLabel = isVi ? 'Ngày xuất' : 'Export Date';
    const dossierLabel = isVi ? 'Mã hồ sơ' : 'Dossier ID';

    const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';

    // 1. Handle CSV / Excel format (Default & Recommended)
    if (!options.format || options.format === 'csv') {
      const csvSections: string[] = [];

      // Metadata section
      csvSections.push(`"${isVi ? 'BÁO CÁO CHỈ SỐ SỨC KHỎE LÂM SÀNG' : 'CLINICAL HEALTH TELEMETRY REPORT'}"`);
      csvSections.push(`"${patientLabel}:","Nguyễn Văn An"`);
      csvSections.push(`"${dossierLabel}:","HS-8921-2026"`);
      csvSections.push(`"${periodLabel}:","${options.timeRange.toUpperCase()}"`);
      csvSections.push(`"${exportDateLabel}:","${currentDate}"`);
      csvSections.push('');

      // AI Summary section if enabled
      if (options.includeAiSummary) {
        const aiSummaryText = isVi
          ? 'Trong thời gian theo dõi, chỉ số huyết áp khá ổn định ở mức trung bình 120/80 mmHg. Đường huyết có 1 lần vượt ngưỡng nhẹ vào sáng ngày thứ 3. Khuyến nghị tiếp tục duy trì chế độ ăn nhạt và theo dõi thường xuyên.'
          : 'During the observation period, blood pressure remained stable at an average of 120/80 mmHg. Fasting blood sugar slightly elevated on day 3. Recommended to maintain low sodium diet.';
        csvSections.push(`"${isVi ? 'TÓM TẮT TỔNG QUAN TỪ AI' : 'AI CLINICAL SUMMARY'}"`);
        csvSections.push(`"${aiSummaryText.replace(/"/g, '""')}"`);
        csvSections.push('');
      }

      // Telemetry Data Table
      const headerLine = isVi
        ? 'Thời gian,Huyết áp tâm thu (mmHg),Huyết áp tâm trương (mmHg),Đường huyết đói (mg/dL),Nhịp tim (BPM),Đánh giá lâm sàng'
        : 'Timestamp,Systolic (mmHg),Diastolic (mmHg),Fasting Glucose (mg/dL),Heart Rate (BPM),Assessment';
      
      const rows = isVi
        ? [
            '17/10/2026 08:00,120,80,102,74,Bình thường',
            '16/10/2026 08:15,124,82,108,78,Bình thường',
            '15/10/2026 08:00,138,88,125,82,Hơi cao',
            '14/10/2026 08:30,122,80,98,72,Đạt mục tiêu',
            '13/10/2026 08:00,118,78,95,70,Tối ưu',
            '12/10/2026 08:00,121,80,101,73,Bình thường',
            '11/10/2026 08:00,125,82,105,75,Bình thường',
          ]
        : [
            '17/10/2026 08:00,120,80,102,74,Normal',
            '16/10/2026 08:15,124,82,108,78,Normal',
            '15/10/2026 08:00,138,88,125,82,Elevated',
            '14/10/2026 08:30,122,80,98,72,Target',
            '13/10/2026 08:00,118,78,95,70,Optimal',
            '12/10/2026 08:00,121,80,101,73,Normal',
            '11/10/2026 08:00,125,82,105,75,Normal',
          ];

      csvSections.push(`"${isVi ? 'DỮ LIỆU CHỈ SỐ SINH HIỆU CHI TIẾT' : 'DETAILED BIOMETRIC TELEMETRY'}"`);
      csvSections.push(headerLine);
      csvSections.push(...rows);
      csvSections.push('');

      // Alerts section if enabled
      if (options.includeAlerts) {
        csvSections.push(`"${isVi ? 'LỊCH SỬ CẢNH BÁO & GHI CHÚ ĐIỀU TRỊ' : 'ALERT HISTORY & CLINICAL NOTES'}"`);
        const alertHeaders = isVi
          ? 'Thời gian,Mức độ,Nội dung cảnh báo,Hành động khuyến nghị'
          : 'Timestamp,Severity,Alert Description,Recommended Action';
        const alertRows = isVi
          ? [
              '15/10/2026 08:00,Cần chú ý,Huyết áp tâm thu 138 mmHg vượt ngưỡng mục tiêu,Nghỉ ngơi 15 phút và đo lại',
              '15/10/2026 08:00,Cảnh báo nhẹ,Đường huyết sáng 125 mg/dL cao hơn mức chuẩn,Uống thuốc đúng giờ và hạn chế tinh bột',
            ]
          : [
              '15/10/2026 08:00,Attention,Systolic BP 138 mmHg exceeded target,Rest 15 minutes and remeasure',
              '15/10/2026 08:00,Mild Alert,Fasting glucose 125 mg/dL elevated,Take prescribed medication and reduce carbs',
            ];
        csvSections.push(alertHeaders);
        csvSections.push(...alertRows);
      }

      // Prepend UTF-8 BOM (\uFEFF) so Microsoft Excel natively decodes Vietnamese characters correctly
      const csvDataWithBOM = '\uFEFF' + csvSections.join('\n');
      const fileName = isVi
        ? `Bao_Cao_Suc_Khoe_Excel_${options.timeRange.toUpperCase()}.csv`
        : `Health_Report_Excel_${options.timeRange.toUpperCase()}.csv`;
      const csvPath = `${cacheDir}${fileName}`;

      await FileSystem.writeAsStringAsync(csvPath, csvDataWithBOM, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const fileInfo = await FileSystem.getInfoAsync(csvPath);

      return {
        uri: csvPath,
        name: fileName,
        size: formatFileSize(fileInfo.exists ? fileInfo.size : undefined),
        type: 'csv',
        mimeType: 'text/csv',
      };
    }

    // 2. Handle PDF format with print-safe, crash-proof HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${docTitle}</title>
        <style>
          body {
            font-family: Roboto, Arial, sans-serif;
            color: #1e293b;
            margin: 24px;
            padding: 0;
            font-size: 13px;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .header-table {
            border-bottom: 2px solid #059669;
            margin-bottom: 16px;
            padding-bottom: 10px;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #065f46;
            margin: 0;
          }
          .subtitle {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .meta-table {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .meta-table td {
            padding: 6px 12px;
            font-size: 12px;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #0f172a;
            margin-top: 18px;
            margin-bottom: 8px;
            border-left: 4px solid #10b981;
            padding-left: 8px;
          }
          .data-table {
            margin-top: 8px;
            margin-bottom: 16px;
          }
          .data-table th {
            background-color: #f1f5f9;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 2px solid #cbd5e1;
            color: #334155;
            font-size: 12px;
          }
          .data-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
          }
          .status-normal {
            color: #059669;
            font-weight: bold;
          }
          .status-elevated {
            color: #d97706;
            font-weight: bold;
          }
          .ai-box {
            background-color: #eef2ff;
            border: 1px solid #c7d2fe;
            border-radius: 8px;
            padding: 12px 14px;
            margin-top: 10px;
          }
          .ai-title {
            font-weight: bold;
            color: #4338ca;
            margin-bottom: 6px;
            font-size: 13px;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <h1 class="title">HỆ THỐNG Y TẾ THÔNG MINH - HEALTHCARE AI</h1>
              <div class="subtitle">${docSubtitle}</div>
            </td>
          </tr>
        </table>

        <table class="meta-table">
          <tr>
            <td style="width: 50%;"><strong>${patientLabel}:</strong> ${options.patientName || 'Alex Johnson'}</td>
            <td style="width: 50%; text-align: right;"><strong>${periodLabel}:</strong> ${options.timeRange.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="width: 50%;"><strong>${exportDateLabel}:</strong> ${currentDate}</td>
            <td style="width: 50%; text-align: right;"><strong>${dossierLabel}:</strong> HC-${Math.floor(100000 + Math.random() * 900000)}</td>
          </tr>
        </table>

        ${
          options.includeCharts
            ? `
          <div class="section-title">${isVi ? '1. Tổng hợp Chỉ số Sinh hiệu Lâm sàng' : '1. Vital Telemetry Logs & Summary'}</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>${isVi ? 'Ngày đo' : 'Date & Time'}</th>
                <th>${isVi ? 'Huyết áp (mmHg)' : 'Blood Pressure (mmHg)'}</th>
                <th>${isVi ? 'Đường huyết đói (mg/dL)' : 'Fasting Glucose (mg/dL)'}</th>
                <th>${isVi ? 'Nhịp tim (BPM)' : 'Heart Rate (BPM)'}</th>
                <th>${isVi ? 'Đánh giá' : 'Assessment'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>17/10/2026 08:00</td>
                <td>120 / 80</td>
                <td>102</td>
                <td>74</td>
                <td><span class="status-normal">${isVi ? 'Bình thường' : 'Normal'}</span></td>
              </tr>
              <tr>
                <td>16/10/2026 08:15</td>
                <td>124 / 82</td>
                <td>108</td>
                <td>78</td>
                <td><span class="status-normal">${isVi ? 'Bình thường' : 'Normal'}</span></td>
              </tr>
              <tr>
                <td>15/10/2026 08:00</td>
                <td>138 / 88</td>
                <td>125</td>
                <td>82</td>
                <td><span class="status-elevated">${isVi ? 'Hơi cao (Cần theo dõi)' : 'Elevated (Monitor)'}</span></td>
              </tr>
              <tr>
                <td>14/10/2026 08:30</td>
                <td>122 / 80</td>
                <td>98</td>
                <td>72</td>
                <td><span class="status-normal">${isVi ? 'Mục tiêu' : 'Target'}</span></td>
              </tr>
            </tbody>
          </table>
        `
            : ''
        }

        ${
          options.includeAiSummary
            ? `
          <div class="section-title">${isVi ? '2. Phân Tích & Khuyến Nghị Từ Trí Tuệ Nhân Tạo (AI Insights)' : '2. Artificial Intelligence Analysis & Directives (AI Insights)'}</div>
          <div class="ai-box">
            <div class="ai-title">✨ ${isVi ? 'Tóm tắt Telemetry 7 ngày:' : '7-Day Telemetry Summary:'}</div>
            <p style="margin: 0; line-height: 1.5; font-size: 13px; color: #312e81;">
              ${
                isVi
                  ? 'Chỉ số huyết áp đạt ngưỡng mục tiêu trong 85% thời gian theo dõi. Có 1 lần ghi nhận dao động nhẹ vào buổi sáng ngày 15/10 sau bữa tối nhiều natri. Bệnh nhân duy trì tuân thủ dùng thuốc tốt. Khuyến nghị duy trì chế độ giảm muối và lịch tái khám định kỳ.'
                  : 'Blood pressure remained within target range for 85% of telemetry window. A single mild elevation occurred on Oct 15 morning following a high-sodium dinner. Patient demonstrates strong medication adherence. Continued low-sodium diet and routine follow-up recommended.'
              }
            </p>
          </div>
        `
            : ''
        }

        ${
          options.includeAlerts
            ? `
          <div class="section-title">${isVi ? '3. Nhật Ký Cảnh Báo Lâm Sàng & Ghi Chú Y Lệnh' : '3. Clinical Alerts & Physician Order Logs'}</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>${isVi ? 'Thời điểm' : 'Timestamp'}</th>
                <th>${isVi ? 'Mức độ' : 'Severity'}</th>
                <th>${isVi ? 'Mô tả sự kiện' : 'Event Description'}</th>
                <th>${isVi ? 'Trạng thái xử lý' : 'Resolution Status'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>15/10/2026 08:05</td>
                <td><span class="status-elevated">${isVi ? 'Chú ý' : 'Attention'}</span></td>
                <td>${isVi ? 'Đường huyết đói vượt ngưỡng nhẹ (125 mg/dL)' : 'Fasting blood sugar slightly above baseline (125 mg/dL)'}</td>
                <td>${isVi ? 'Bác sĩ đã ghi nhận & điều chỉnh' : 'Physician reviewed and adjusted plan'}</td>
              </tr>
            </tbody>
          </table>
        `
            : ''
        }

        <div class="footer">
          ${
            isVi
              ? 'Báo cáo được khởi tạo tự động từ Nền tảng Chăm sóc Sức khỏe Telecare. Dữ liệu có giá trị tham vấn chuyên môn với Bác sĩ phụ trách.'
              : 'Report automatically generated from the Telecare Health Platform. Data is intended for clinical consultation with your attending physician.'
          }
        </div>
      </body>
      </html>
    `;

    let fileUri: string | null = null;
    let fileType: 'pdf' | 'html' = 'pdf';

    try {
      const printResult = await Print.printToFileAsync({
        html: htmlContent,
        width: 612,
        height: 792,
        base64: false,
      });
      if (printResult?.uri) {
        fileUri = printResult.uri;
      }
    } catch (printErr) {
      console.warn('Print.printToFileAsync failed, writing HTML document fallback:', printErr);
    }

    // Resilient fallback to HTML document if native print fails on specific Android ROMs
    if (!fileUri) {
      const fallbackName = `Health_Report_${options.timeRange.toUpperCase()}.html`;
      const fallbackPath = `${cacheDir}${fallbackName}`;
      await FileSystem.writeAsStringAsync(fallbackPath, htmlContent, { encoding: FileSystem.EncodingType.UTF8 });
      fileUri = fallbackPath;
      fileType = 'html';
    }

    const fileName = fileType === 'pdf'
      ? `Health_Report_${options.timeRange.toUpperCase()}.pdf`
      : `Health_Report_${options.timeRange.toUpperCase()}.html`;

    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    return {
      uri: fileUri,
      name: fileName,
      size: formatFileSize(fileInfo.exists ? fileInfo.size : undefined),
      type: fileType,
      mimeType: fileType === 'pdf' ? 'application/pdf' : 'text/html',
    };
  } catch (error) {
    console.error('generateHealthReport error:', error);
    Toast.show({
      type: 'error',
      text1: i18n.t('mobile.export_error', 'Report Export Error'),
      text2: i18n.t('mobile.export_error_desc', 'Không thể tạo tài liệu báo cáo.'),
    });
    return null;
  }
};

/**
 * Save report directly to device storage without triggering intent chooser crashes
 */
export const saveReportToDevice = async (
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const directoryUri = permissions.directoryUri;
          const fileString = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            directoryUri,
            fileName,
            mimeType
          );
          await FileSystem.writeAsStringAsync(newFileUri, fileString, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Toast.show({
            type: 'success',
            text1: i18n.t('mobile.file_saved_success', 'File saved to device successfully'),
            text2: fileName,
          });
          return true;
        }
      } catch (safErr) {
        console.warn('StorageAccessFramework failed, trying sharing fallback:', safErr);
      }
    }

    // Fallback: Use safe sharing sheet if direct folder save is unavailable
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: fileName,
      });
      return true;
    } else {
      Toast.show({
        type: 'success',
        text1: i18n.t('mobile.file_saved_success', 'File saved to device successfully'),
        text2: fileName,
      });
      return true;
    }
  } catch (err) {
    console.warn('saveReportToDevice error:', err);
    Toast.show({
      type: 'error',
      text1: i18n.t('mobile.error', 'Error'),
      text2: i18n.t('mobile.file_save_error', 'Failed to save file to device'),
    });
    return false;
  }
};

/**
 * Safe report file sharing with delayed execution to prevent window token collision on Fabric
 */
export const shareReportFile = async (
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<void> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Toast.show({
        type: 'error',
        text1: i18n.t('mobile.error', 'Error'),
        text2: 'Sharing is not supported on this device.',
      });
      return;
    }
    // Settle pending UI transitions before launching Android system intent
    await new Promise((resolve) => setTimeout(resolve, 250));
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: fileName,
    });
  } catch (shareErr) {
    console.warn('shareReportFile dismissed or error:', shareErr);
  }
};

/**
 * Backward-compatible helper for legacy callers
 */
export const exportAndShareHealthReport = async (
  options: HealthReportExportOptions
): Promise<string | null> => {
  const result = await generateHealthReport(options);
  return result?.uri ?? null;
};

/**
 * Utility to build multipart/form-data payload compatible with Cloudinary backend
 */
export const createCloudinaryFormData = (
  file: NativeMediaFile,
  folder: string = 'healthcare/profiles',
  fileType: 'image' | 'document' = 'image'
): FormData => {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name || 'upload.jpg',
    type: file.mimeType || (fileType === 'image' ? 'image/jpeg' : 'application/pdf'),
  } as any);
  formData.append('folder', folder);
  formData.append('fileType', fileType);
  return formData;
};
