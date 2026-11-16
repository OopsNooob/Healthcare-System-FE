import { toast, type ToastOptions } from "react-toastify";
import { useTranslation } from "react-i18next";

type ToastVariant = "success" | "error" | "info" | "warning";
type TranslateFn = (key: string, defaultValue: string) => string;

const DEFAULT_TOAST_TITLES: Record<ToastVariant, string> = {
  success: "Thành công",
  error: "Lỗi",
  info: "Thông tin",
  warning: "Cảnh báo",
};

const API_ERROR_PATTERNS: Array<{ pattern: string; key: string; defaultValue: string }> = [
  {
    pattern: "limit must not be greater than 100",
    key: "common.apiErrors.limitMax100",
    defaultValue: "Số lượng truy vấn mỗi trang tối đa là 100.",
  },
  {
    pattern: "admin profile not found",
    key: "common.apiErrors.adminProfileNotFound",
    defaultValue: "Không tìm thấy hồ sơ quản trị viên.",
  },
  {
    pattern: "only super admins can view all admin accounts",
    key: "common.apiErrors.superAdminViewAdmins",
    defaultValue: "Chỉ Quản trị cấp cao mới có quyền xem tất cả tài khoản quản trị.",
  },
  {
    pattern: "only super admins can create new admin accounts",
    key: "common.apiErrors.superAdminCreateAdmins",
    defaultValue: "Chỉ Quản trị cấp cao mới có quyền tạo tài khoản quản trị mới.",
  },
  {
    pattern: "only super admins or user managers can update admin accounts",
    key: "common.apiErrors.cannotUpdateAdminAccount",
    defaultValue: "Bạn không có quyền cập nhật tài khoản quản trị viên.",
  },
  {
    pattern: "cannot modify your account",
    key: "common.apiErrors.cannotModifyOwnAccount",
    defaultValue: "Không thể tự chỉnh sửa tài khoản của chính bạn.",
  },
  {
    pattern: "email already in use",
    key: "common.apiErrors.emailAlreadyInUse",
    defaultValue: "Email này đã được sử dụng.",
  },
  {
    pattern: "email does not exist",
    key: "common.apiErrors.emailNotFound",
    defaultValue: "Email không tồn tại.",
  },
  {
    pattern: "password is not correct",
    key: "common.apiErrors.incorrectPassword",
    defaultValue: "Mật khẩu không chính xác.",
  },
  {
    pattern: "account is banned",
    key: "common.apiErrors.accountBanned",
    defaultValue: "Tài khoản đã bị khoá.",
  },
  {
    pattern: "account is not approved",
    key: "common.apiErrors.accountNotApproved",
    defaultValue: "Tài khoản chưa được phê duyệt.",
  },
  {
    pattern: "user not found",
    key: "common.apiErrors.userNotFound",
    defaultValue: "Không tìm thấy người dùng.",
  },
  {
    pattern: "invalid user id",
    key: "common.apiErrors.invalidUserId",
    defaultValue: "Mã người dùng không hợp lệ.",
  },
  {
    pattern: "failed to load user data",
    key: "common.apiErrors.loadUsersFailed",
    defaultValue: "Không thể tải danh sách người dùng.",
  },
  {
    pattern: "failed to load documents",
    key: "common.apiErrors.loadDocumentsFailed",
    defaultValue: "Không thể tải danh sách tài liệu.",
  },
  {
    pattern: "failed to load keyword list",
    key: "common.apiErrors.loadKeywordsFailed",
    defaultValue: "Không thể tải danh sách từ khoá cấm.",
  },
  {
    pattern: "failed to load details",
    key: "common.apiErrors.loadDetailsFailed",
    defaultValue: "Không thể tải thông tin chi tiết.",
  },
  {
    pattern: "failed to ban user",
    key: "common.apiErrors.lockUserFailed",
    defaultValue: "Không thể khoá tài khoản người dùng.",
  },
  {
    pattern: "failed to unban user",
    key: "common.apiErrors.unlockUserFailed",
    defaultValue: "Không thể mở khoá tài khoản người dùng.",
  },
  {
    pattern: "failed to update admin role",
    key: "common.apiErrors.updateAdminRoleFailed",
    defaultValue: "Không thể cập nhật vai trò quản trị viên.",
  },
  {
    pattern: "failed to add keyword",
    key: "common.apiErrors.addKeywordFailed",
    defaultValue: "Không thể thêm từ khoá.",
  },
  {
    pattern: "failed to update keyword",
    key: "common.apiErrors.updateKeywordFailed",
    defaultValue: "Không thể cập nhật từ khoá.",
  },
  {
    pattern: "failed to delete keyword",
    key: "common.apiErrors.deleteKeywordFailed",
    defaultValue: "Không thể xoá từ khoá.",
  },
  {
    pattern: "new keyword is empty",
    key: "common.apiErrors.keywordEmpty",
    defaultValue: "Từ khoá mới không được để trống.",
  },
  {
    pattern: "invalid keyword update payload",
    key: "common.apiErrors.keywordInvalid",
    defaultValue: "Dữ liệu cập nhật từ khoá không hợp lệ.",
  },
  {
    pattern: "failed to change document status",
    key: "common.apiErrors.changeDocStatusFailed",
    defaultValue: "Không thể thay đổi trạng thái tài liệu.",
  },
  {
    pattern: "failed to archive document",
    key: "common.apiErrors.archiveDocFailed",
    defaultValue: "Không thể lưu trữ tài liệu.",
  },
  {
    pattern: "failed to index document",
    key: "common.apiErrors.indexDocFailed",
    defaultValue: "Không thể lập chỉ mục tài liệu.",
  },
  {
    pattern: "failed to trigger ingestion",
    key: "common.apiErrors.ingestDocFailed",
    defaultValue: "Không thể kích hoạt nạp dữ liệu AI.",
  },
  {
    pattern: "failed to update document",
    key: "common.apiErrors.updateDocFailed",
    defaultValue: "Không thể cập nhật tài liệu.",
  },
  {
    pattern: "invalid document id",
    key: "common.apiErrors.invalidDocId",
    defaultValue: "Mã tài liệu không hợp lệ.",
  },
  {
    pattern: "network error",
    key: "common.apiErrors.networkError",
    defaultValue: "Không thể kết nối đến máy chủ.",
  },
  {
    pattern: "request failed with status code 403",
    key: "common.apiErrors.forbidden",
    defaultValue: "Bạn không có quyền thực hiện thao tác này.",
  },
  {
    pattern: "request failed with status code 404",
    key: "common.apiErrors.notFound",
    defaultValue: "Không tìm thấy dữ liệu yêu cầu.",
  },
  {
    pattern: "request failed with status code 401",
    key: "common.apiErrors.unauthorized",
    defaultValue: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
  },
  {
    pattern: "request failed with status code 500",
    key: "common.apiErrors.serverError",
    defaultValue: "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
  },
];

export function localizeErrorMessage(
  rawMessage: string,
  t: TranslateFn,
): string {
  const normalized = rawMessage.trim().toLowerCase();
  if (!normalized) return rawMessage;
  for (const item of API_ERROR_PATTERNS) {
    if (normalized.includes(item.pattern)) {
      return t(item.key, item.defaultValue);
    }
  }
  return rawMessage;
}

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: false,

  style: {
    width: "360px",
    minHeight: "80px",
  },
};

function ToastMessage({
  type,
  message,
}: {
  type: ToastVariant;
  message: string;
}) {
  const { t } = useTranslation();
  const title = t(`common.toast.${type}`, DEFAULT_TOAST_TITLES[type]);
  const localizedMessage = localizeErrorMessage(message, t);

  return (
    <div>
      <strong>{title}</strong>
      <div>{localizedMessage}</div>
    </div>
  );
}

export const showToast = {
  success: (message: string, options: ToastOptions = {}) =>
    toast.success(<ToastMessage type="success" message={message} />, {
      ...defaultOptions,
      ...options,
    }),

  error: (message: string, options: ToastOptions = {}) =>
    toast.error(<ToastMessage type="error" message={message} />, {
      ...defaultOptions,
      ...options,
    }),

  info: (message: string, options: ToastOptions = {}) =>
    toast.info(<ToastMessage type="info" message={message} />, {
      ...defaultOptions,
      ...options,
    }),

  warning: (message: string, options: ToastOptions = {}) =>
    toast.warning(<ToastMessage type="warning" message={message} />, {
      ...defaultOptions,
      ...options,
    }),
};
