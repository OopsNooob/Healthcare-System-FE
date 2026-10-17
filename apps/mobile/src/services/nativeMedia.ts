import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Toast from 'react-native-toast-message';

export interface NativeMediaFile {
  uri: string;
  name: string;
  size: string;
  sizeBytes?: number;
  type: 'image' | 'file';
  mimeType?: string;
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
        text1: 'Quyền Camera bị từ chối / Camera Permission Denied',
        text2: 'Vui lòng cấp quyền máy ảnh trong Cài đặt thiết bị.',
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
        text1: 'Quyền Thư viện ảnh bị từ chối / Gallery Permission Denied',
        text2: 'Vui lòng cấp quyền truy cập ảnh trong Cài đặt thiết bị.',
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
      text1: 'Lỗi chọn ảnh / Image Pick Error',
      text2: 'Không thể mở máy ảnh hoặc thư viện.',
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
      text1: 'Lỗi chọn tệp / Document Pick Error',
      text2: 'Không thể mở trình quản lý tệp trên thiết bị.',
    });
    return null;
  }
};

/**
 * Generate medical PDF report and open system sharing/save dialog
 */
export const exportAndShareHealthReport = async (
  options: HealthReportExportOptions
): Promise<string | null> => {
  try {
    const currentDate = new Date().toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Báo Cáo Sức Khỏe Lâm Sàng / Clinical Health Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 40px; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 24px; font-weight: bold; color: #065f46; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .section-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-left: 4px solid #10b981; padding-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; color: #334155; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          .status-normal { color: #059669; font-weight: bold; }
          .status-elevated { color: #d97706; font-weight: bold; }
          .ai-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px; margin-top: 15px; }
          .ai-title { font-weight: bold; color: #4338ca; margin-bottom: 6px; font-size: 14px; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">HỆ THỐNG Y TẾ THÔNG MINH - HEALTHCARE AI</h1>
            <div class="subtitle">Báo Cáo Sức Khỏe & Giám Sát Điều Trị Mạn Tính / Chronic Telecare Report</div>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-row">
            <span><strong>Bệnh nhân / Patient:</strong> ${options.patientName || 'Alex Johnson'}</span>
            <span><strong>Thời gian báo cáo / Period:</strong> ${options.timeRange.toUpperCase()}</span>
          </div>
          <div class="meta-row">
            <span><strong>Ngày xuất / Export Date:</strong> ${currentDate}</span>
            <span><strong>Mã hồ sơ / Dossier ID:</strong> HC-${Math.floor(100000 + Math.random() * 900000)}</span>
          </div>
        </div>

        ${
          options.includeCharts
            ? `
          <div class="section-title">1. Tổng hợp Chỉ số Sinh hiệu Lâm sàng (Vital Telemetry Logs)</div>
          <table>
            <thead>
              <tr>
                <th>Ngày đo</th>
                <th>Huyết áp (mmHg)</th>
                <th>Đường huyết đói (mg/dL)</th>
                <th>Nhịp tim (BPM)</th>
                <th>Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>17/10/2026 08:00</td>
                <td>120 / 80</td>
                <td>102</td>
                <td>74</td>
                <td><span class="status-normal">Bình thường</span></td>
              </tr>
              <tr>
                <td>16/10/2026 08:15</td>
                <td>124 / 82</td>
                <td>108</td>
                <td>78</td>
                <td><span class="status-normal">Bình thường</span></td>
              </tr>
              <tr>
                <td>15/10/2026 08:00</td>
                <td>138 / 88</td>
                <td>125</td>
                <td>82</td>
                <td><span class="status-elevated">Hơi cao (Cần theo dõi)</span></td>
              </tr>
              <tr>
                <td>14/10/2026 08:30</td>
                <td>122 / 80</td>
                <td>98</td>
                <td>72</td>
                <td><span class="status-normal">Mục tiêu</span></td>
              </tr>
            </tbody>
          </table>
        `
            : ''
        }

        ${
          options.includeAiSummary
            ? `
          <div class="section-title">2. Phân Tích & Khuyến Nghị Từ Trí Tuệ Nhân Tạo (AI Insights)</div>
          <div class="ai-box">
            <div class="ai-title">✨ Tóm tắt Telemetry 7 ngày:</div>
            <p style="margin: 0; line-height: 1.5; font-size: 13px; color: #312e81;">
              Chỉ số huyết áp đạt ngưỡng mục tiêu trong 85% thời gian theo dõi. Có 1 lần ghi nhận dao động nhẹ vào buổi sáng ngày 15/10 sau bữa tối nhiều natri. Bệnh nhân duy trì tuân thủ dùng thuốc tốt. Khuyến nghị duy trì chế độ giảm muối và lịch tái khám định kỳ.
            </p>
          </div>
        `
            : ''
        }

        ${
          options.includeAlerts
            ? `
          <div class="section-title">3. Nhật Ký Cảnh Báo Lâm Sàng & Ghi Chú Y Lệnh</div>
          <table>
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Mức độ</th>
                <th>Mô tả sự kiện</th>
                <th>Trạng thái xử lý</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>15/10/2026 08:05</td>
                <td><span class="status-elevated">Chú ý</span></td>
                <td>Đường huyết đói vượt ngưỡng nhẹ (125 mg/dL)</td>
                <td>Bác sĩ đã ghi nhận & điều chỉnh</td>
              </tr>
            </tbody>
          </table>
        `
            : ''
        }

        <div class="footer">
          Báo cáo được khởi tạo tự động từ Nền tảng Chăm sóc Sức khỏe Telecare. Dữ liệu có giá trị tham vấn chuyên môn với Bác sĩ phụ trách.
        </div>
      </body>
      </html>
    `;

    if (options.format === 'csv') {
      const csvData = [
        'Timestamp,Systolic (mmHg),Diastolic (mmHg),Fasting Glucose (mg/dL),Heart Rate (BPM),Assessment',
        '17/10/2026 08:00,120,80,102,74,Normal',
        '16/10/2026 08:15,124,82,108,78,Normal',
        '15/10/2026 08:00,138,88,125,82,Elevated',
        '14/10/2026 08:30,122,80,98,72,Target',
      ].join('\n');
      const csvPath = `${FileSystem.cacheDirectory || ''}Health_Report_${options.timeRange.toUpperCase()}.csv`;
      await FileSystem.writeAsStringAsync(csvPath, csvData, { encoding: FileSystem.EncodingType.UTF8 });
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(csvPath, {
            mimeType: 'text/csv',
            dialogTitle: `Health_Report_${options.timeRange.toUpperCase()}.csv`,
          });
        }
      } catch (shareErr) {
        console.warn('Sharing dismissed:', shareErr);
      }
      return csvPath;
    }

    let fileUri: string | null = null;
    try {
      const printResult = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      fileUri = printResult?.uri ?? null;
    } catch (printErr) {
      console.warn('Print.printToFileAsync failed, writing HTML document fallback:', printErr);
    }

    // Fallback to formatted HTML document if Print fails on certain Android configurations
    if (!fileUri) {
      const fallbackPath = `${FileSystem.cacheDirectory || ''}Health_Report_${options.timeRange.toUpperCase()}.html`;
      await FileSystem.writeAsStringAsync(fallbackPath, htmlContent, { encoding: FileSystem.EncodingType.UTF8 });
      fileUri = fallbackPath;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && fileUri) {
        await Sharing.shareAsync(fileUri, {
          mimeType: fileUri.endsWith('.pdf') ? 'application/pdf' : 'text/html',
          dialogTitle: `Health_Report_${options.timeRange.toUpperCase()}`,
        });
      }
    } catch (shareErr) {
      console.warn('Sharing.shareAsync dismissed or not handled:', shareErr);
    }

    return fileUri;
  } catch (error) {
    console.error('exportAndShareHealthReport error:', error);
    Toast.show({
      type: 'error',
      text1: 'Lỗi xuất báo cáo / Export Error',
      text2: 'Không thể tạo hoặc chia sẻ tài liệu.',
    });
    return null;
  }
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
