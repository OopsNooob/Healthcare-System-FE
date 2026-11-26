export interface ApiErrorContext {
  code?: string;
  details?: Record<string, unknown>;
  rawMessage?: string;
  status?: number;
  axiosCode?: string;
}

export interface ApiErrorLocaleEntry {
  en: string;
  vi: string;
}

export interface ResolvedApiError {
  key: keyof typeof API_ERROR_MESSAGES;
  params?: Record<string, unknown>;
  fallbackEn: string;
  fallbackVi: string;
}

/**
 * Canonical bilingual catalog for backend error codes, NestJS plain exception messages,
 * DTO validation errors, upload/AI errors, and HTTP/network fallbacks shared by Mobile and Web Admin.
 */
export const API_ERROR_MESSAGES = {
  // Booking & availability slots (codes + specific reasons)
  MIN_NOTICE_NOT_MET: {
    en: 'The slot must be scheduled at least {{minutes}} minutes in advance.',
    vi: 'Khung giờ phải cách thời điểm hiện tại ít nhất {{minutes}} phút.',
  },
  SLOT_IN_PAST: {
    en: 'Slot start time must be in the future.',
    vi: 'Thời điểm bắt đầu khung giờ phải ở trong tương lai.',
  },
  SLOT_OVERLAP: {
    en: 'This slot overlaps another active slot or violates the buffer interval.',
    vi: 'Khung giờ bị trùng hoặc chưa đủ khoảng đệm giữa các ca khám.',
  },
  SLOT_NOT_MUTABLE: {
    en: 'This slot cannot be modified in its current status.',
    vi: 'Khung giờ hiện tại không thể chỉnh sửa ở trạng thái này.',
  },
  SLOT_ALREADY_BOOKED: {
    en: 'This slot has already been booked. Please choose another time slot.',
    vi: 'Khung giờ này vừa có bệnh nhân khác đặt. Vui lòng chọn khung giờ khác.',
  },
  SLOT_STATE_CONFLICT: {
    en: 'Slot state conflict detected. Please refresh and try again.',
    vi: 'Không thể cập nhật khung giờ do có thay đổi đồng thời. Vui lòng tải lại.',
  },
  INVALID_SLOT_RANGE: {
    en: 'End time must be after start time.',
    vi: 'Giờ kết thúc phải sau giờ bắt đầu.',
  },
  INVALID_TIMEZONE: {
    en: 'Invalid IANA timezone.',
    vi: 'Múi giờ không hợp lệ.',
  },
  INVALID_QUERY_RANGE: {
    en: 'Query date range is invalid or exceeds the allowed limit.',
    vi: 'Khoảng thời gian tra cứu không hợp lệ hoặc vượt quá giới hạn cho phép.',
  },
  DOCTOR_NOT_APPROVED: {
    en: 'Only an active approved doctor can manage availability slots.',
    vi: 'Chỉ bác sĩ đang hoạt động và đã được duyệt mới có thể quản lý lịch khám.',
  },
  DOCTOR_NOT_ACTIVE_APPROVED: {
    en: 'Doctor account is not active and approved.',
    vi: 'Tài khoản bác sĩ hiện chưa kích hoạt hoặc chưa được phê duyệt.',
  },
  DOCTOR_NOT_SLOT_OWNER: {
    en: 'You do not own this availability slot.',
    vi: 'Bạn không phải chủ sở hữu khung giờ khám này.',
  },
  BOOKING_POLICY_NOT_CONFIGURED: {
    en: 'Scheduled booking policy is not configured. Please try again later.',
    vi: 'Chính sách đặt lịch hệ thống chưa được cấu hình. Vui lòng thử lại sau.',
  },
  BOOKING_POLICY_UNAVAILABLE: {
    en: 'Booking policy service is temporarily unavailable.',
    vi: 'Dịch vụ chính sách đặt lịch hiện tạm thời không khả dụng.',
  },
  SCHEDULED_SLOT_REQUIRED: {
    en: 'A valid scheduled availability slot is required.',
    vi: 'Vui lòng chọn một khung giờ khám hợp lệ.',
  },
  RESCHEDULE_CUTOFF_PASSED: {
    en: 'The reschedule cutoff deadline has passed.',
    vi: 'Đã quá thời hạn cho phép đổi giờ khám.',
  },
  RESCHEDULE_DOCTOR_MISMATCH: {
    en: 'You can only reschedule to an available slot with the same doctor.',
    vi: 'Chỉ có thể đổi sang khung giờ trống của cùng bác sĩ.',
  },
  CANCELLATION_CUTOFF_PASSED: {
    en: 'The cancellation cutoff deadline has passed.',
    vi: 'Đã quá thời hạn cho phép huỷ lịch hẹn.',
  },
  ONLY_ACTIVE_PATIENT_BOOK: {
    en: 'Only an active patient account can create a scheduled booking.',
    vi: 'Chỉ tài khoản bệnh nhân đang hoạt động mới có thể đặt lịch khám.',
  },
  ONLY_PATIENT_OWNER_RESCHEDULE: {
    en: 'Only the patient who owns this appointment can reschedule it.',
    vi: 'Chỉ bệnh nhân đặt lịch hẹn này mới có quyền đổi giờ khám.',
  },
  PATIENT_NOT_CONSULTATION_OWNER: {
    en: 'You do not own this consultation.',
    vi: 'Bạn không phải chủ sở hữu buổi tư vấn này.',
  },

  // Consultation queue, check-in, session & chat
  CHECK_IN_POLICY_NOT_CONFIGURED: {
    en: 'Patient check-in requires an explicit early-window policy.',
    vi: 'Chính sách thời gian mở phòng chờ chưa được cấu hình.',
  },
  CHECK_IN_INVALID_STATE: {
    en: 'This appointment is not in a valid state for check-in.',
    vi: 'Lịch hẹn hiện không ở trạng thái hợp lệ để vào phòng chờ.',
  },
  CHECK_IN_STATE_CONFLICT: {
    en: 'Check-in state changed concurrently. Please refresh.',
    vi: 'Trạng thái phòng chờ vừa thay đổi. Vui lòng tải lại.',
  },
  CHECK_IN_TOO_EARLY: {
    en: 'Check-in window has not opened yet.',
    vi: 'Chưa đến khung giờ check-in cho lịch hẹn này.',
  },
  CHECK_IN_WINDOW_CLOSED: {
    en: 'Check-in window has closed for this appointment.',
    vi: 'Đã quá thời gian check-in cho lịch hẹn này.',
  },
  ONLY_ACTIVE_PATIENT_CHECKIN: {
    en: 'Only an active patient can check in to the waiting room.',
    vi: 'Chỉ tài khoản bệnh nhân đang hoạt động mới có thể vào phòng chờ.',
  },
  ONLY_PATIENT_OWNER_CHECKIN: {
    en: 'Only the patient who owns this appointment can check in.',
    vi: 'Chỉ bệnh nhân của lịch hẹn này mới có thể vào phòng chờ.',
  },
  ONLY_APPROVED_DOCTOR_QUEUE: {
    en: 'Only an active approved doctor can use the consultation queue.',
    vi: 'Chỉ bác sĩ đang hoạt động và đã được duyệt mới có thể sử dụng hàng đợi khám.',
  },
  CONSULTATION_NOT_READY_FOR_CHAT: {
    en: 'Scheduled consultations require patient check-in and doctor call before messaging.',
    vi: 'Lịch hẹn cần được bệnh nhân check-in và bác sĩ gọi lượt trước khi nhắn tin.',
  },
  CONSULTATION_NOT_CALLED_FOR_CHAT: {
    en: 'Doctor must call the queued consultation before messaging.',
    vi: 'Bác sĩ cần gọi lượt bệnh nhân từ hàng đợi trước khi nhắn tin.',
  },
  CONSULTATION_NOT_CALLED: {
    en: 'Call the queued consultation before starting the session.',
    vi: 'Cần gọi lượt bệnh nhân từ hàng đợi trước khi bắt đầu phiên khám.',
  },
  CONSULTATION_NOT_IN_QUEUE: {
    en: 'This consultation is not currently in the waiting queue.',
    vi: 'Phiên tư vấn hiện không nằm trong hàng đợi chờ khám.',
  },
  DOCTOR_QUEUE_ITEM_ALREADY_CALLED: {
    en: 'You already have a called consultation awaiting start.',
    vi: 'Bạn đang có một bệnh nhân đã gọi lượt chờ bắt đầu khám.',
  },
  DOCTOR_ACTIVE_SESSION_CONFLICT: {
    en: 'You already have an active consultation in progress.',
    vi: 'Bạn đang có một phiên tư vấn khác đang diễn ra.',
  },
  QUEUE_EMPTY: {
    en: 'There are no patients waiting in the queue.',
    vi: 'Hiện chưa có bệnh nhân nào đang chờ trong hàng đợi.',
  },
  QUEUE_STATE_CONFLICT: {
    en: 'Queue state changed concurrently. Please refresh.',
    vi: 'Trạng thái hàng đợi vừa thay đổi. Vui lòng tải lại danh sách.',
  },
  INVALID_STATE_TRANSITION: {
    en: 'Cannot perform this status transition from the current state.',
    vi: 'Không thể chuyển sang trạng thái này từ trạng thái hiện tại.',
  },

  // Billing, plans & quota
  BILLING_FORBIDDEN: {
    en: 'You do not have permission to access this billing resource.',
    vi: 'Bạn không có quyền truy cập thông tin gói dịch vụ hoặc thanh toán này.',
  },
  BILLING_NOT_FOUND: {
    en: 'Billing record or payment order was not found.',
    vi: 'Không tìm thấy thông tin gói dịch vụ hoặc đơn thanh toán.',
  },
  BILLING_PROJECTION_UNAVAILABLE: {
    en: 'Billing summary data is temporarily unavailable.',
    vi: 'Dữ liệu gói dịch vụ hiện tạm thời không khả dụng.',
  },
  PAYMENT_ORDER_PROJECTION_UNAVAILABLE: {
    en: 'Payment order summary data is temporarily unavailable.',
    vi: 'Dữ liệu đơn thanh toán hiện tạm thời không khả dụng.',
  },
  SUBSCRIPTION_INACTIVE: {
    en: 'An active subscription plan is required for this feature.',
    vi: 'Bạn cần có gói dịch vụ đang hoạt động để sử dụng tính năng này.',
  },
  QUOTA_EXCEEDED: {
    en: 'You have reached your quota limit for the current billing cycle.',
    vi: 'Bạn đã sử dụng hết hạn mức trong chu kỳ gói hiện tại.',
  },
  ACTIVE_CARE_PROGRAM_LIMIT_REACHED: {
    en: 'You have reached the maximum number of active care programs allowed by your plan.',
    vi: 'Bạn đã đạt số chương trình chăm sóc đang tham gia tối đa theo gói hiện tại.',
  },
  PATIENT_NOT_ELIGIBLE_MORE_PROGRAMS: {
    en: 'You are not eligible to enroll in another care program under your current plan.',
    vi: 'Gói dịch vụ hiện tại chưa cho phép tham gia thêm chương trình chăm sóc.',
  },

  // Chronic care — program, rules, enrollments, tasks, alerts, reports & exports
  CARE_FORBIDDEN: {
    en: 'You do not have permission to perform this care action.',
    vi: 'Bạn không có quyền thực hiện thao tác chăm sóc sức khoẻ này.',
  },
  CARE_CATALOG_FORBIDDEN: {
    en: 'You do not have permission to modify the care program catalog.',
    vi: 'Bạn không có quyền thao tác trên danh mục chương trình chăm sóc.',
  },
  CARE_RESOURCE_NOT_ACCESSIBLE: {
    en: 'You do not have access to this care resource.',
    vi: 'Bạn không có quyền truy cập tài nguyên chăm sóc này.',
  },
  CARE_RULE_NOT_ACCESSIBLE: {
    en: 'You do not have access to this care rule.',
    vi: 'Bạn không có quyền truy cập bộ quy tắc chăm sóc này.',
  },
  CARE_RULE_ACTIVATION_FORBIDDEN: {
    en: 'You do not have permission to activate this care rule.',
    vi: 'Bạn không có quyền kích hoạt bộ quy tắc chăm sóc này.',
  },
  CARE_SUMMARY_FORBIDDEN: {
    en: 'You do not have permission to access this care summary.',
    vi: 'Bạn không có quyền truy cập bản tóm tắt chăm sóc này.',
  },
  CARE_REPORT_FORBIDDEN: {
    en: 'You do not have permission to access this care report.',
    vi: 'Bạn không có quyền truy cập báo cáo theo dõi sức khoẻ này.',
  },
  CARE_DEPENDENCY_UNAVAILABLE: {
    en: 'Dependent care service is temporarily unavailable.',
    vi: 'Dịch vụ liên kết chăm sóc hiện tạm thời không khả dụng.',
  },
  CONSULTATION_CAPABILITY_UNAVAILABLE: {
    en: 'Consultation booking capability is temporarily unavailable.',
    vi: 'Tính năng đặt lịch tư vấn liên kết hiện tạm thời không khả dụng.',
  },
  APPOINTMENT_LINKING_UNAVAILABLE: {
    en: 'Appointment linking service is temporarily unavailable.',
    vi: 'Dịch vụ liên kết lịch hẹn cho nhiệm vụ hiện tạm thời không khả dụng.',
  },
  CHECKIN_EVALUATION_UNAVAILABLE: {
    en: 'Check-in evaluation service is temporarily unavailable.',
    vi: 'Dịch vụ đánh giá chỉ số check-in hiện tạm thời không khả dụng.',
  },
  CARE_DOCTOR_NOT_APPROVED: {
    en: 'Only an approved doctor can manage this care program.',
    vi: 'Chỉ bác sĩ đã được phê duyệt mới có thể phụ trách chương trình chăm sóc.',
  },
  CARE_DOCTOR_OVERRIDE_FORBIDDEN: {
    en: 'Doctor override is not allowed for this care program setting.',
    vi: 'Bác sĩ không được phép ghi đè cấu hình chương trình này.',
  },
  CUSTOM_SETTING_NOT_ALLOWED: {
    en: 'One or more custom threshold settings are not permitted by this program.',
    vi: 'Thiết lập ngưỡng tuỳ chỉnh không nằm trong danh mục bác sĩ được phép điều chỉnh.',
  },
  CARE_PATIENT_NOT_ACTIVE: {
    en: 'Patient account must be active to participate in this care program.',
    vi: 'Tài khoản bệnh nhân phải đang hoạt động để tham gia chương trình.',
  },
  CARE_IDEMPOTENCY_KEY_REQUIRED: {
    en: 'Idempotency key is required for this care operation.',
    vi: 'Thiếu khoá chống trùng lặp thao tác (Idempotency-Key). Vui lòng thử lại.',
  },
  CARE_IDEMPOTENCY_CONFLICT: {
    en: 'This care request was already processed or conflicts with another request.',
    vi: 'Yêu cầu chăm sóc này đã được xử lý trước đó hoặc đang xung đột dữ liệu.',
  },
  ORIGINAL_COMMAND_RESULT_UNAVAILABLE: {
    en: 'The original idempotent command result is no longer available.',
    vi: 'Không tìm thấy kết quả gốc của thao tác đã gửi trước đó.',
  },
  CARE_PROGRAM_NOT_FOUND: {
    en: 'Care program not found.',
    vi: 'Không tìm thấy chương trình chăm sóc.',
  },
  CARE_PROGRAM_NOT_PUBLISHED: {
    en: 'This care program is not published.',
    vi: 'Chương trình chăm sóc chưa được phát hành hoặc đã ngừng áp dụng.',
  },
  CARE_PROGRAM_ACCESS_DENIED: {
    en: 'Your current plan does not grant access to this care program.',
    vi: 'Gói dịch vụ hiện tại chưa hỗ trợ truy cập chương trình chăm sóc này.',
  },
  PROGRAM_NO_ACTIVE_RULE: {
    en: 'This care program does not have an active rule set yet.',
    vi: 'Chương trình chăm sóc này chưa có bộ quy tắc nào đang kích hoạt.',
  },
  PROGRAM_NOT_CURRENT_DRAFT: {
    en: 'Program version is no longer the current draft.',
    vi: 'Phiên bản chương trình này không còn là bản nháp hiện hành.',
  },
  PROGRAM_NOT_CURRENT_PUBLISHED: {
    en: 'Program version is no longer the current published version.',
    vi: 'Phiên bản chương trình này không còn là bản đã phát hành hiện hành.',
  },
  PROGRAM_PUBLISH_REQUIRED_FOR_RULE: {
    en: 'The care program must be published before activating a rule.',
    vi: 'Chương trình chăm sóc cần được phát hành trước khi kích hoạt bộ quy tắc.',
  },
  CARE_RULE_NOT_FOUND: {
    en: 'Care rule not found.',
    vi: 'Không tìm thấy bộ quy tắc theo dõi sức khoẻ.',
  },
  CARE_RULE_NOT_ACTIVE: {
    en: 'The care rule is not active.',
    vi: 'Bộ quy tắc theo dõi hiện không ở trạng thái hoạt động.',
  },
  CARE_RULE_VALIDATION_FAILED: {
    en: 'Care rule validation failed. Please review your rule definitions.',
    vi: 'Cấu trúc quy tắc theo dõi chưa hợp lệ. Vui lòng kiểm tra lại.',
  },
  CARE_RULE_VERSION_CONFLICT: {
    en: 'Care rule version conflict. Please reload and try again.',
    vi: 'Phiên bản quy tắc đã được người khác cập nhật. Vui lòng tải lại.',
  },
  CARE_RULE_DATA_SOURCE_INVALID: {
    en: 'Care rule data source configuration is invalid.',
    vi: 'Nguồn dữ liệu đầu vào của quy tắc không hợp lệ.',
  },
  CARE_RULE_PROJECTION_UNAVAILABLE: {
    en: 'Care rule summary data is temporarily unavailable.',
    vi: 'Dữ liệu tổng hợp quy tắc chăm sóc tạm thời không khả dụng.',
  },
  RULE_NOT_CURRENT_ACTIVE: {
    en: 'This rule version is not the currently active version.',
    vi: 'Phiên bản quy tắc này không còn là bản đang hoạt động.',
  },
  RULE_NOT_CURRENT_DRAFT: {
    en: 'This rule version is not the current draft version.',
    vi: 'Phiên bản quy tắc này không còn là bản nháp hiện hành.',
  },
  RULE_DISALLOWED_OPERATOR: {
    en: 'Rule contains an unsupported or disallowed operator.',
    vi: 'Quy tắc chứa toán tử điều kiện không nằm trong danh sách được phép.',
  },
  RULE_FACTS_UNMAPPED: {
    en: 'All rule facts must match an approved data source mapping.',
    vi: 'Mọi điều kiện dữ liệu trong quy tắc phải gắn với nguồn dữ liệu hợp lệ.',
  },
  CARE_ENROLLMENT_NOT_FOUND: {
    en: 'Care program enrollment not found.',
    vi: 'Không tìm thấy hồ sơ tham gia chương trình chăm sóc.',
  },
  CARE_ENROLLMENT_INVALID_STATE: {
    en: 'Care enrollment is not in a valid state for this action.',
    vi: 'Hồ sơ tham gia chương trình không ở trạng thái phù hợp cho thao tác này.',
  },
  CARE_ENROLLMENT_NOT_ACTIVE: {
    en: 'Care enrollment is not currently active.',
    vi: 'Hồ sơ tham gia chương trình hiện chưa ở trạng thái đang hoạt động.',
  },
  CARE_ENROLLMENT_ACTIVATION_BLOCKED: {
    en: 'Enrollment activation is blocked until prerequisites are completed.',
    vi: 'Chưa thể kích hoạt chương trình chăm sóc (vui lòng hoàn thành đánh giá ban đầu).',
  },
  ENROLLMENT_CANNOT_CANCEL: {
    en: 'This care enrollment can no longer be cancelled.',
    vi: 'Không thể huỷ hồ sơ tham gia chương trình ở trạng thái hiện tại.',
  },
  ENROLLMENT_REVISION_STALE: {
    en: 'Care enrollment was updated by another request. Please refresh.',
    vi: 'Hồ sơ chương trình vừa được cập nhật ở nơi khác. Vui lòng tải lại.',
  },
  INVALID_ENROLLMENT_STATE_TRANSITION: {
    en: 'Invalid care enrollment state transition.',
    vi: 'Không thể chuyển trạng thái hồ sơ tham gia chương trình từ trạng thái hiện tại.',
  },
  ONLY_ASSIGNED_DOCTOR_TRANSITION_ENROLLMENT: {
    en: 'Only the assigned doctor may update this enrollment status.',
    vi: 'Chỉ bác sĩ phụ trách mới được thay đổi trạng thái hồ sơ chăm sóc này.',
  },
  ONLY_ASSIGNED_DOCTOR_GENERATE_REPORT: {
    en: 'Only the assigned doctor can generate a report for this patient.',
    vi: 'Chỉ bác sĩ phụ trách mới có thể tạo báo cáo theo dõi sức khoẻ này.',
  },
  CARE_CONSENT_VERSION_MISMATCH: {
    en: 'Consent version mismatch. Please review and accept the latest consent.',
    vi: 'Phiên bản điều khoản đồng thuận đã thay đổi. Vui lòng xác nhận lại.',
  },
  CARE_BASELINE_INCOMPLETE: {
    en: 'Please complete all required baseline assessment fields.',
    vi: 'Vui lòng điền đầy đủ bảng đánh giá sức khoẻ ban đầu.',
  },
  CARE_BASELINE_SCHEMA_INVALID: {
    en: 'Baseline assessment data does not match the required format.',
    vi: 'Dữ liệu đánh giá ban đầu không đúng định dạng yêu cầu.',
  },
  BASELINE_SCHEMA_NOT_ALLOWLISTED: {
    en: 'Baseline schema must use a supported standard template.',
    vi: 'Cấu trúc biểu mẫu đánh giá ban đầu không nằm trong mẫu chuẩn được hỗ trợ.',
  },
  BASELINE_ANSWERS_SCHEMA_MISMATCH: {
    en: 'Baseline answers do not match the program assessment schema.',
    vi: 'Dữ liệu câu trả lời chưa khớp với biểu mẫu đánh giá của chương trình.',
  },
  ANSWER_REQUIRED: {
    en: 'Please answer all required questions.',
    vi: 'Vui lòng trả lời đầy đủ các câu hỏi bắt buộc.',
  },
  ANSWER_RANGE_INVALID: {
    en: 'Answer value is outside the allowed range.',
    vi: 'Giá trị câu trả lời nằm ngoài phạm vi cho phép.',
  },
  ANSWER_TYPE_INVALID: {
    en: 'Answer data type is invalid.',
    vi: 'Kiểu dữ liệu câu trả lời không hợp lệ.',
  },
  ANSWER_UNKNOWN_FIELD: {
    en: 'Unknown answer field provided.',
    vi: 'Phát hiện trường dữ liệu không có trong biểu mẫu.',
  },
  CARE_TASK_TERMINAL: {
    en: 'This care task has already reached a terminal state.',
    vi: 'Nhiệm vụ chăm sóc này đã hoàn thành hoặc đã đóng.',
  },
  CARE_TASK_ALREADY_TRANSITIONED: {
    en: 'This care task was already updated to another state.',
    vi: 'Nhiệm vụ chăm sóc này đã được chuyển trạng thái trước đó.',
  },
  CARE_TASK_NO_LONGER_ACCEPTS_RESPONSES: {
    en: 'This care task no longer accepts responses.',
    vi: 'Nhiệm vụ chăm sóc này không còn tiếp nhận phản hồi.',
  },
  CARE_TASK_CONCURRENT_TRANSITION: {
    en: 'Care task was updated concurrently. Please refresh.',
    vi: 'Nhiệm vụ vừa được cập nhật ở nơi khác. Vui lòng làm mới.',
  },
  CARE_TASK_ENROLLMENT_NOT_ACTIVE: {
    en: 'Care program enrollment must be active to update this task.',
    vi: 'Chỉ có thể thực hiện nhiệm vụ khi chương trình chăm sóc đang hoạt động.',
  },
  CARE_TASK_OUTSIDE_RESPONSE_WINDOW: {
    en: 'This care task is outside its allowed response window.',
    vi: 'Nhiệm vụ hiện đang ngoài khung thời gian cho phép phản hồi.',
  },
  CARE_TASK_RESPONSE_INVALID: {
    en: 'Care task response data is invalid.',
    vi: 'Nội dung phản hồi nhiệm vụ không hợp lệ.',
  },
  CARE_TASK_RESPONSE_POLICY_NOT_CONFIGURED: {
    en: 'No approved response policy is configured for this care task.',
    vi: 'Nhiệm vụ này chưa có chính sách phản hồi được phê duyệt.',
  },
  NO_APPROVED_CHECKIN_POLICY: {
    en: 'No approved check-in policy is configured for this task.',
    vi: 'Nhiệm vụ check-in này chưa được cấu hình chính sách hợp lệ.',
  },
  CARE_TASK_RESPONSE_USE_HEALTH_METRIC: {
    en: 'Metric tasks must be completed through Health Tracking (HLTH-02).',
    vi: 'Nhiệm vụ đo chỉ số cần được hoàn thành tại mục Ghi nhận chỉ số sức khoẻ.',
  },
  CARE_TASK_CHECK_IN_INCONSISTENT: {
    en: 'Task check-in data is inconsistent with the task schedule.',
    vi: 'Dữ liệu check-in nhiệm vụ không đồng nhất với lịch trình.',
  },
  CHECKIN_FIELDS_INVALID: {
    en: 'Check-in must contain overallStatus, symptomCodes, and severity.',
    vi: 'Dữ liệu check-in phải gồm đầy đủ trạng thái chung, triệu chứng và mức độ.',
  },
  SEVERITY_NONE_REQUIRES_EMPTY_SYMPTOMS: {
    en: 'Severity "none" is only valid when no symptoms are selected.',
    vi: 'Khi chọn mức độ "Không có triệu chứng", không được chọn kèm triệu chứng.',
  },
  CARE_TASK_SYMPTOM_NOT_ALLOWED: {
    en: 'Symptom input is not allowed for this care task.',
    vi: 'Loại nhiệm vụ này không cho phép gửi ghi chú triệu chứng.',
  },
  CHECKIN_SYMPTOM_OUTSIDE_SNAPSHOT: {
    en: 'Selected symptom code is not supported in this task template.',
    vi: 'Triệu chứng đã chọn không nằm trong danh sách triệu chứng của nhiệm vụ này.',
  },
  CARE_TASK_TEMPLATE_INVALID: {
    en: 'Care task template configuration is invalid.',
    vi: 'Mẫu nhiệm vụ chăm sóc không hợp lệ.',
  },
  TASK_TEMPLATES_INVALID_SCHEDULE: {
    en: 'Task templates must follow the supported daily schedule contract.',
    vi: 'Mẫu lịch trình nhiệm vụ phải tuân thủ định dạng lịch hàng ngày hợp lệ.',
  },
  CARE_TASK_DATE_RANGE_INVALID: {
    en: 'Care task date range is invalid.',
    vi: 'Khoảng ngày tra cứu nhiệm vụ không hợp lệ.',
  },
  CARE_TASK_CONTENT_UNAVAILABLE: {
    en: 'The education content for this care task is unavailable.',
    vi: 'Nội dung hướng dẫn cho nhiệm vụ này hiện không khả dụng.',
  },
  CARE_TASK_CONSULTATION_ALREADY_LINKED: {
    en: 'This care task or consultation is already linked to another record.',
    vi: 'Nhiệm vụ hoặc buổi tư vấn này đã được liên kết với một lịch hẹn khác.',
  },
  CARE_TASK_CANNOT_LINK: {
    en: 'This care task can no longer be linked to an appointment.',
    vi: 'Nhiệm vụ chăm sóc này không thể liên kết thêm lịch hẹn.',
  },
  CARE_TASK_LINKED_TO_OTHER_CONSULTATION: {
    en: 'This care task is already linked to a different consultation.',
    vi: 'Nhiệm vụ chăm sóc này đã được liên kết với một buổi tư vấn khác.',
  },
  CONSULTATION_LINKED_TO_OTHER_CARE_TASK: {
    en: 'This consultation is already linked to a different care task.',
    vi: 'Buổi tư vấn này đã được liên kết với một nhiệm vụ chăm sóc khác.',
  },
  APPOINTMENT_TASK_NO_DOCTOR: {
    en: 'Appointment task has no assigned doctor.',
    vi: 'Nhiệm vụ tái khám chưa có bác sĩ phụ trách.',
  },
  APPOINTMENT_TASK_CONCURRENTLY_LINKED: {
    en: 'This appointment task was concurrently linked. Please refresh.',
    vi: 'Nhiệm vụ tái khám vừa được liên kết ở nơi khác. Vui lòng tải lại.',
  },
  TASK_NOT_DOCTOR_REVIEW: {
    en: 'This task is not a doctor review task.',
    vi: 'Nhiệm vụ này không phải loại nhiệm vụ bác sĩ rà soát.',
  },
  UNSUPPORTED_RESPONSE_ACTION: {
    en: 'Unsupported care task response action.',
    vi: 'Hành động phản hồi nhiệm vụ không được hỗ trợ.',
  },
  CARE_ALERT_NOT_FOUND: {
    en: 'Care alert not found.',
    vi: 'Không tìm thấy cảnh báo sức khoẻ.',
  },
  CARE_ALERT_CURSOR_INVALID: {
    en: 'Invalid care alert pagination cursor.',
    vi: 'Con trỏ phân trang danh sách cảnh báo không hợp lệ.',
  },
  CARE_ALERT_REVISION_CONFLICT: {
    en: 'Care alert was modified concurrently. Please refresh.',
    vi: 'Cảnh báo đã được cập nhật bởi thao tác khác. Vui lòng tải lại.',
  },
  CARE_ALERT_TERMINAL: {
    en: 'This care alert has already been resolved or dismissed.',
    vi: 'Cảnh báo sức khoẻ này đã được xử lý hoặc bỏ qua trước đó.',
  },
  CARE_ALERT_TRANSITION_INVALID: {
    en: 'Invalid care alert status transition.',
    vi: 'Không thể chuyển trạng thái cảnh báo sức khoẻ từ trạng thái hiện tại.',
  },
  ALERT_ACTION_FORBIDDEN: {
    en: 'You do not have permission to act on this alert.',
    vi: 'Bạn không có quyền xử lý cảnh báo sức khoẻ này.',
  },
  ALERT_CANNOT_LINK_CONSULTATION: {
    en: 'This alert cannot be linked to a consultation.',
    vi: 'Không thể gắn cảnh báo này với lịch hẹn tư vấn.',
  },
  ALERT_NOT_OPEN: {
    en: 'This alert is no longer open.',
    vi: 'Cảnh báo sức khoẻ này không còn ở trạng thái mở.',
  },
  INVALID_DOCTOR_IDENTITY: {
    en: 'Invalid doctor identity for this care alert.',
    vi: 'Thông tin định danh bác sĩ không hợp lệ cho thao tác này.',
  },
  CARE_CONSULTATION_SCHEDULE_INVALID: {
    en: 'Scheduled follow-up consultation must be in the future.',
    vi: 'Thời gian đặt lịch tái khám phải ở trong tương lai.',
  },
  CARE_REPORT_NOT_FOUND: {
    en: 'Care report not found.',
    vi: 'Không tìm thấy báo cáo theo dõi sức khoẻ.',
  },
  CARE_REPORT_CUTOFF_INVALID: {
    en: 'Care report cutoff timestamp is invalid.',
    vi: 'Mốc thời gian tổng hợp báo cáo không hợp lệ.',
  },
  CARE_REPORT_SOURCE_LIMIT_EXCEEDED: {
    en: 'Care report source data exceeds the safe processing limit.',
    vi: 'Lượng dữ liệu nguồn của báo cáo vượt quá giới hạn xử lý an toàn.',
  },
  CARE_REPORT_EXPORT_NOT_FOUND: {
    en: 'Care report export not found.',
    vi: 'Không tìm thấy tệp xuất báo cáo.',
  },
  CARE_REPORT_EXPORT_NOT_ENTITLED: {
    en: 'Your current plan does not support exporting this report format.',
    vi: 'Gói dịch vụ hiện tại của bạn chưa hỗ trợ xuất định dạng báo cáo này.',
  },
  CARE_REPORT_EXPORT_ENTITLEMENT_UNAVAILABLE: {
    en: 'Unable to verify report export entitlement right now.',
    vi: 'Không thể xác minh quyền xuất báo cáo lúc này. Vui lòng thử lại sau.',
  },
  CARE_REPORT_EXPORT_CONFIGURATION_UNAVAILABLE: {
    en: 'Report export configuration is temporarily unavailable.',
    vi: 'Cấu hình xuất báo cáo chưa sẵn sàng trên hệ thống.',
  },

  // Idempotency & common codes
  IDEMPOTENCY_KEY_REQUIRED: {
    en: 'Idempotency-Key header is required.',
    vi: 'Thiếu khoá định danh yêu cầu (Idempotency-Key). Vui lòng thử lại.',
  },
  IDEMPOTENCY_KEY_INVALID: {
    en: 'Invalid Idempotency-Key format.',
    vi: 'Khoá định danh yêu cầu (Idempotency-Key) không hợp lệ.',
  },
  IDEMPOTENCY_CONFLICT: {
    en: 'Duplicate or conflicting request detected. Please refresh and try again.',
    vi: 'Yêu cầu bị trùng lặp hoặc đang xung đột. Vui lòng đợi hoặc tải lại.',
  },
  IDEMPOTENCY_KEY_REUSED_DIFF_PAYLOAD: {
    en: 'Idempotency-Key was reused with a different request payload.',
    vi: 'Khoá yêu cầu (Idempotency-Key) đã được dùng cho một nội dung khác.',
  },
  INVALID_ID: {
    en: 'Invalid identifier format.',
    vi: 'Mã định danh không hợp lệ.',
  },
  VALIDATION_ERROR: {
    en: 'Submitted data is invalid. Please review and try again.',
    vi: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
  },
  FORBIDDEN: {
    en: 'You do not have permission to perform this action.',
    vi: 'Bạn không có quyền thực hiện thao tác này.',
  },
  UNAUTHORIZED: {
    en: 'Authentication required or session expired.',
    vi: 'Vui lòng đăng nhập lại để tiếp tục.',
  },
  NOT_FOUND: {
    en: 'Requested resource was not found.',
    vi: 'Không tìm thấy dữ liệu yêu cầu.',
  },
  TOO_MANY_REQUESTS: {
    en: 'Too many requests. Please wait a moment and try again.',
    vi: 'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.',
  },
  INTERNAL_SERVER_ERROR: {
    en: 'Internal server error. Please try again later.',
    vi: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
  },
  SERVICE_UNAVAILABLE: {
    en: 'Service is temporarily unavailable. Please try again later.',
    vi: 'Hệ thống tạm thời gián đoạn hoặc quá tải. Vui lòng thử lại sau.',
  },

  // Auth & accounts
  AUTH_INVALID_CREDENTIALS: {
    en: 'Invalid email or password.',
    vi: 'Email hoặc mật khẩu không đúng.',
  },
  AUTH_PASSWORD_INCORRECT: {
    en: 'Current password is incorrect.',
    vi: 'Mật khẩu hiện tại không chính xác.',
  },
  AUTH_EMAIL_IN_USE: {
    en: 'This email is already in use.',
    vi: 'Email này đã được sử dụng.',
  },
  AUTH_PHONE_IN_USE: {
    en: 'This phone number is already in use.',
    vi: 'Số điện thoại này đã được sử dụng.',
  },
  AUTH_EMAIL_VERIFICATION_REQUIRED: {
    en: 'Email verification is required before signing in.',
    vi: 'Vui lòng xác minh email trước khi đăng nhập.',
  },
  AUTH_ACCOUNT_NOT_ELIGIBLE: {
    en: 'Your account is not eligible for access.',
    vi: 'Tài khoản của bạn chưa đủ điều kiện truy cập hệ thống.',
  },
  AUTH_ACCOUNT_NOT_APPROVED: {
    en: 'Your account has not been approved yet.',
    vi: 'Tài khoản của bạn chưa được phê duyệt.',
  },
  AUTH_ACCOUNT_BANNED: {
    en: 'Your account is banned or does not exist.',
    vi: 'Tài khoản của bạn đã bị khoá hoặc không tồn tại.',
  },
  AUTH_INVALID_VERIFICATION_CODE: {
    en: 'Invalid or expired verification code.',
    vi: 'Mã xác minh không hợp lệ hoặc đã hết hạn.',
  },
  AUTH_INVALID_RECOVERY_CODE: {
    en: 'Invalid or expired recovery code.',
    vi: 'Mã khôi phục mật khẩu không hợp lệ hoặc đã hết hạn.',
  },
  AUTH_INVALID_REAPPLY_CREDENTIALS: {
    en: 'Invalid re-application credentials.',
    vi: 'Thông tin đăng nhập nộp lại hồ sơ bác sĩ không hợp lệ.',
  },
  AUTH_INVALID_REFRESH_TOKEN: {
    en: 'Refresh token is invalid. Please log in again.',
    vi: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  },
  AUTH_REFRESH_TOKEN_REVOKED: {
    en: 'Session has been revoked or expired. Please log in again.',
    vi: 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.',
  },
  AUTH_SESSION_NOT_FOUND: {
    en: 'Login session not found.',
    vi: 'Không tìm thấy phiên đăng nhập.',
  },
  AUTH_OAUTH_UNAVAILABLE: {
    en: 'Google sign-in provider is temporarily unavailable.',
    vi: 'Dịch vụ đăng nhập Google hiện không khả dụng.',
  },
  AUTH_OAUTH_HANDOFF_INVALID: {
    en: 'Invalid or expired Google sign-in ticket. Please try again.',
    vi: 'Phiên chuyển tiếp đăng nhập Google không hợp lệ hoặc đã hết hạn.',
  },
  AUTH_OAUTH_SIGNUP_DISABLED: {
    en: 'Google sign-in is not available for creating a new account.',
    vi: 'Đăng nhập Google chưa khả dụng cho tài khoản mới.',
  },
  AUTH_OAUTH_USE_PASSWORD: {
    en: 'This email already has a password account. Please sign in with password.',
    vi: 'Email này đã đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng mật khẩu.',
  },
  AUTH_OAUTH_DIFFERENT_GOOGLE: {
    en: 'This email is already linked to a different Google account.',
    vi: 'Email này đã được liên kết với một tài khoản Google khác.',
  },
  AUTH_OAUTH_UNAVAILABLE_FOR_ACCOUNT: {
    en: 'Google sign-in is unavailable for this account. Please sign in with password.',
    vi: 'Tài khoản này không hỗ trợ đăng nhập Google. Vui lòng đăng nhập bằng mật khẩu.',
  },
  AUTH_OTP_SEND_FAILED: {
    en: 'Failed to send OTP email. Please try again.',
    vi: 'Không thể gửi email mã OTP. Vui lòng thử lại.',
  },
  AUTH_APPROVE_EMAIL_FAILED: {
    en: 'Failed to send approval notification email.',
    vi: 'Không thể gửi email thông báo phê duyệt tài khoản.',
  },
  AUTH_REJECT_EMAIL_FAILED: {
    en: 'Failed to send rejection notification email.',
    vi: 'Không thể gửi email thông báo từ chối hồ sơ.',
  },
  AUTH_BAN_EMAIL_FAILED: {
    en: 'Failed to send account suspension email.',
    vi: 'Không thể gửi email thông báo khoá tài khoản.',
  },
  AUTH_UNBAN_EMAIL_FAILED: {
    en: 'Failed to send account reactivation email.',
    vi: 'Không thể gửi email thông báo mở khoá tài khoản.',
  },

  // Consultations, notes, chat, reviews (1-to-1)
  CONSULTATION_NOT_FOUND: {
    en: 'Consultation not found.',
    vi: 'Không tìm thấy buổi tư vấn.',
  },
  AVAILABILITY_SLOT_NOT_FOUND: {
    en: 'Availability slot not found.',
    vi: 'Không tìm thấy khung giờ khám.',
  },
  ONLY_DOCTOR_CLINICAL_NOTES: {
    en: 'Only the assigned doctor can update clinical notes.',
    vi: 'Chỉ bác sĩ phụ trách mới được cập nhật ghi chú lâm sàng.',
  },
  ONLY_PATIENT_NOTES: {
    en: 'Only the patient can update symptom notes.',
    vi: 'Chỉ bệnh nhân mới được cập nhật ghi chú triệu chứng.',
  },
  PATIENT_NOTES_LOCKED_AFTER_START: {
    en: 'Symptom notes can only be updated before the consultation starts.',
    vi: 'Chỉ có thể chỉnh sửa ghi chú triệu chứng trước khi buổi tư vấn bắt đầu.',
  },
  CANNOT_UPDATE_TERMINAL_CONSULTATION: {
    en: 'Cannot update a completed or cancelled consultation.',
    vi: 'Không thể cập nhật buổi tư vấn đã hoàn thành hoặc đã huỷ.',
  },
  CANNOT_CANCEL_TERMINAL_CONSULTATION: {
    en: 'Cannot cancel a consultation that has already ended.',
    vi: 'Không thể huỷ buổi tư vấn đã kết thúc.',
  },
  CONSULTATION_NOT_PENDING: {
    en: 'Consultation request is no longer pending.',
    vi: 'Yêu cầu tư vấn không còn ở trạng thái chờ xác nhận.',
  },
  CONSULTATION_NOT_ACCEPTED: {
    en: 'Consultation must be accepted before starting.',
    vi: 'Buổi tư vấn cần được xác nhận trước khi bắt đầu.',
  },
  CONSULTATION_NOT_IN_PROGRESS: {
    en: 'Consultation is not currently in progress.',
    vi: 'Buổi tư vấn hiện chưa ở trạng thái đang diễn ra.',
  },
  CONSULTATION_NOT_WAITING: {
    en: 'Consultation is not in the waiting room.',
    vi: 'Buổi tư vấn hiện không ở trạng thái phòng chờ.',
  },
  CONSULTATION_NOT_WAITING_NO_SHOW: {
    en: 'Consultation must be waiting before marking patient no-show.',
    vi: 'Buổi tư vấn phải ở trạng thái phòng chờ mới có thể đánh dấu vắng mặt.',
  },
  CONSULTATION_NO_SHOW_TOO_EARLY: {
    en: 'The no-show waiting period has not elapsed yet.',
    vi: 'Chưa hết thời gian chờ bệnh nhân theo quy định để đánh dấu vắng mặt.',
  },
  CONSULTATION_NO_SHOW_POLICY_UNAVAILABLE: {
    en: 'No-show policy configuration is unavailable.',
    vi: 'Cấu hình thời gian chờ vắng mặt hiện không khả dụng.',
  },
  ONLY_DOCTOR_CHANGE_REQUEST: {
    en: 'Only the assigned doctor can accept or decline this consultation request.',
    vi: 'Chỉ bác sĩ phụ trách mới có thể chấp nhận hoặc từ chối yêu cầu tư vấn.',
  },
  ONLY_DOCTOR_START_CONSULTATION: {
    en: 'Only the assigned doctor can start the consultation.',
    vi: 'Chỉ bác sĩ phụ trách mới có thể bắt đầu phiên tư vấn.',
  },
  ONLY_DOCTOR_COMPLETE_CONSULTATION: {
    en: 'Only the assigned doctor can complete the consultation.',
    vi: 'Chỉ bác sĩ phụ trách mới có thể hoàn tất phiên tư vấn.',
  },
  ONLY_DOCTOR_MARK_NO_SHOW: {
    en: 'Only the assigned doctor can mark a no-show.',
    vi: 'Chỉ bác sĩ phụ trách mới có thể đánh dấu bệnh nhân vắng mặt.',
  },
  CONSULTATION_QUOTA_LIMIT_REACHED: {
    en: 'You have reached your consultation limit for the current cycle.',
    vi: 'Bạn đã dùng hết lượt tư vấn trong chu kỳ gói hiện tại.',
  },
  CONSULTATION_QUOTA_COUNT_FAILED: {
    en: 'Unable to record consultation usage count.',
    vi: 'Không thể ghi nhận khấu trừ lượt tư vấn cho phiên này.',
  },
  CONSULTATION_QUOTA_RELEASE_FAILED: {
    en: 'Unable to release reserved consultation quota.',
    vi: 'Không thể hoàn trả lượt giữ chỗ tư vấn.',
  },
  CONSULTATION_QUOTA_NOT_RESERVED: {
    en: 'Consultation quota has not been reserved for this consultation.',
    vi: 'Buổi tư vấn chưa được giữ chỗ hạn mức lượt khám.',
  },
  CONSULTATION_QUOTA_UNAVAILABLE: {
    en: 'Consultation quota cannot be verified right now.',
    vi: 'Hiện không thể xác minh hạn mức lượt tư vấn.',
  },
  NOT_CONSULTATION_PARTICIPANT: {
    en: 'You are not a participant of this consultation.',
    vi: 'Bạn không phải người tham gia buổi tư vấn này.',
  },
  CHAT_CANCELLED_CONSULTATION: {
    en: 'Cannot send messages in a cancelled consultation.',
    vi: 'Không thể gửi tin nhắn trong buổi tư vấn đã bị huỷ.',
  },
  CHAT_COMPLETED_CONSULTATION: {
    en: 'Cannot send messages in a completed consultation.',
    vi: 'Không thể gửi tin nhắn trong buổi tư vấn đã kết thúc.',
  },
  CHAT_NO_SHOW_CONSULTATION: {
    en: 'Cannot send messages in a no-show consultation.',
    vi: 'Không thể gửi tin nhắn trong buổi tư vấn có bệnh nhân vắng mặt.',
  },
  CHAT_ACCEPT_REQUIRED: {
    en: 'Consultation must be accepted before sending messages.',
    vi: 'Buổi tư vấn cần được chấp nhận trước khi nhắn tin.',
  },
  CHAT_EMPTY_MESSAGE: {
    en: 'Message text or image attachment is required.',
    vi: 'Vui lòng nhập nội dung tin nhắn hoặc đính kèm hình ảnh.',
  },
  CHAT_ONLY_SENDER_DELETE: {
    en: 'Only the sender can delete this message.',
    vi: 'Chỉ người gửi mới có thể xoá tin nhắn này.',
  },
  CHAT_ONLY_SENDER_UPDATE: {
    en: 'Only the sender can edit this message.',
    vi: 'Chỉ người gửi mới có thể chỉnh sửa tin nhắn này.',
  },
  SENDER_TYPE_ROLE_MISMATCH: {
    en: 'Sender type does not match your account role.',
    vi: 'Loại người gửi không khớp với vai trò tài khoản hiện tại.',
  },
  REVIEW_ALREADY_SUBMITTED: {
    en: 'This consultation has already been reviewed.',
    vi: 'Buổi tư vấn này đã được đánh giá trước đó.',
  },
  REVIEW_DOCTOR_ALREADY_REVIEWED: {
    en: 'You have already reviewed this doctor.',
    vi: 'Bạn đã đánh giá bác sĩ này trước đó.',
  },
  REVIEW_ONLY_COMPLETED: {
    en: 'A review can only be submitted after consultation completion.',
    vi: 'Chỉ có thể gửi đánh giá sau khi buổi tư vấn đã hoàn tất.',
  },
  REVIEW_NOT_FOUND: {
    en: 'Review not found.',
    vi: 'Không tìm thấy đánh giá.',
  },
  REVIEW_DELETE_UNAUTHORIZED: {
    en: 'You are not authorized to delete this review.',
    vi: 'Bạn không có quyền xoá đánh giá này.',
  },
  REVIEW_UPDATE_UNAUTHORIZED: {
    en: 'You are not authorized to update this review.',
    vi: 'Bạn không có quyền chỉnh sửa đánh giá này.',
  },

  // AI knowledge base, assistant, quota & candidates
  AI_QUOTA_EXCEEDED: {
    en: 'You have reached your AI usage limit. Please upgrade your plan or try again later.',
    vi: 'Bạn đã dùng hết lượt sử dụng trợ lý AI. Vui lòng nâng cấp gói hoặc thử lại sau.',
  },
  AI_QUOTA_UNAVAILABLE: {
    en: 'An active subscription plan is required to use the AI assistant.',
    vi: 'Bạn cần gói dịch vụ phù hợp để sử dụng trợ lý AI.',
  },
  AI_QUOTA_SERVICE_UNAVAILABLE: {
    en: 'AI quota service is temporarily unavailable.',
    vi: 'Dịch vụ kiểm tra hạn mức AI hiện tạm thời không khả dụng.',
  },
  AI_MESSAGE_TOO_LONG: {
    en: 'Your message exceeds the maximum length limit.',
    vi: 'Tin nhắn vượt quá độ dài tối đa cho phép.',
  },
  AI_CONVERSATION_NOT_FOUND: {
    en: 'AI conversation not found.',
    vi: 'Không tìm thấy cuộc trò chuyện AI.',
  },
  AI_CONVERSATION_ACCESS_UNAUTHORIZED: {
    en: 'You are not authorized to access this AI conversation.',
    vi: 'Bạn không có quyền truy cập cuộc trò chuyện AI này.',
  },
  AI_CONVERSATION_MODIFY_UNAUTHORIZED: {
    en: 'You are not authorized to modify this AI conversation.',
    vi: 'Bạn không có quyền chỉnh sửa cuộc trò chuyện AI này.',
  },
  AI_CONVERSATION_DELETE_UNAUTHORIZED: {
    en: 'You are not authorized to delete this AI conversation.',
    vi: 'Bạn không có quyền xoá cuộc trò chuyện AI này.',
  },
  AI_CONVERSATION_RATE_UNAUTHORIZED: {
    en: 'You are not authorized to rate this AI conversation.',
    vi: 'Bạn không có quyền đánh giá cuộc trò chuyện AI này.',
  },
  AI_RATING_RANGE_INVALID: {
    en: 'Rating must be between 1 and 5.',
    vi: 'Điểm đánh giá phải nằm trong khoảng từ 1 đến 5.',
  },
  AI_SERVICE_ERROR: {
    en: 'The AI service encountered a temporary error. Please try again later.',
    vi: 'Hệ thống AI tạm thời gặp sự cố. Vui lòng thử lại sau.',
  },
  AI_EMPTY_LLM_RESPONSE: {
    en: 'The AI model returned an empty response. Please try again.',
    vi: 'Mô hình AI trả về phản hồi rỗng. Vui lòng thử lại.',
  },
  GEMINI_KEY_MISSING: {
    en: 'AI provider API key is not configured on the server.',
    vi: 'Máy chủ chưa cấu hình khoá API Gemini cho tính năng AI.',
  },
  LLAMAPARSE_CONFIG_MISSING: {
    en: 'Document parser API key is not configured on the server.',
    vi: 'Máy chủ chưa cấu hình khoá API phân tích tài liệu (LlamaParse).',
  },
  EMBEDDING_SERVICE_ERROR: {
    en: 'Failed to process vector embeddings for knowledge documents.',
    vi: 'Lỗi xử lý vector tri thức (embedding) cho tài liệu AI.',
  },
  AI_HEALTH_READER_UNAVAILABLE: {
    en: 'Health profile summary service is currently unavailable.',
    vi: 'Dịch vụ đọc hồ sơ sức khoẻ hiện tạm thời không khả dụng.',
  },
  AI_DOC_NOT_FOUND: {
    en: 'AI knowledge document was not found.',
    vi: 'Không tìm thấy tài liệu tri thức AI.',
  },
  AI_DOC_HASH_REQUIRED: {
    en: 'Knowledge document content hash is required.',
    vi: 'Thiếu mã băm nội dung (contentHash) cho tài liệu tri thức.',
  },
  AI_DOC_ONLY_PENDING_APPROVE: {
    en: 'Only a pending knowledge document can be approved.',
    vi: 'Chỉ tài liệu đang chờ thẩm định mới có thể phê duyệt.',
  },
  AI_DOC_ONLY_PENDING_REJECT: {
    en: 'Only a pending knowledge document can be rejected.',
    vi: 'Chỉ tài liệu đang chờ thẩm định mới có thể từ chối.',
  },
  AI_DOC_ONLY_APPROVED_ACTIVATE: {
    en: 'Only an approved and ingested knowledge document can be activated.',
    vi: 'Chỉ tài liệu đã được duyệt và nạp tri thức mới có thể kích hoạt.',
  },
  AI_DOC_MANAGER_REQUIRED: {
    en: 'Only an AI Manager may submit or update knowledge documents.',
    vi: 'Chỉ Quản trị viên AI (AI Admin) mới có quyền gửi hoặc cập nhật tài liệu.',
  },
  AI_DOC_FULL_ADMIN_REQUIRED: {
    en: 'Only a Super Administrator may review or activate knowledge documents.',
    vi: 'Chỉ Quản trị viên cấp cao (Super Admin) mới có quyền thẩm định hoặc kích hoạt tài liệu.',
  },
  AI_DOC_MANUAL_INGEST_UNSUPPORTED: {
    en: 'Manual re-ingestion is unavailable; ingestion runs automatically upon upload.',
    vi: 'Hệ thống tự động nạp tri thức khi tải lên, chưa hỗ trợ nạp lại thủ công không kèm tệp.',
  },
  AI_DOC_TEXT_EMPTY: {
    en: 'No readable text could be extracted from this document.',
    vi: 'Không thể trích xuất nội dung văn bản đọc được từ tài liệu này.',
  },
  AI_CHUNK_NOT_FOUND: {
    en: 'Document chunk was not found.',
    vi: 'Không tìm thấy phân đoạn tài liệu.',
  },
  AI_CANDIDATE_NOT_FOUND: {
    en: 'Knowledge candidate was not found.',
    vi: 'Không tìm thấy đề xuất tài liệu PubMed.',
  },
  AI_CANDIDATE_DUPLICATE: {
    en: 'This PubMed article is already in the knowledge candidate list.',
    vi: 'Bài báo PubMed này đã tồn tại trong danh sách đề xuất.',
  },
  AI_CANDIDATE_ONLY_PENDING_PROMOTE: {
    en: 'Only a pending knowledge candidate can be promoted.',
    vi: 'Chỉ đề xuất đang chờ duyệt mới có thể chuyển thành tài liệu.',
  },
  AI_CANDIDATE_ONLY_PENDING_REJECT: {
    en: 'Only a pending knowledge candidate can be rejected.',
    vi: 'Chỉ đề xuất đang chờ duyệt mới có thể từ chối.',
  },
  AI_CANDIDATE_MANAGER_REQUIRED: {
    en: 'Only an AI Manager may view or propose knowledge candidates.',
    vi: 'Chỉ Quản trị viên AI (AI Admin) mới có thể xem hoặc đề xuất tài liệu PubMed.',
  },
  AI_CANDIDATE_SUPER_ADMIN_REQUIRED: {
    en: 'Only a Super Administrator may review a knowledge candidate.',
    vi: 'Chỉ Quản trị viên cấp cao (Super Admin) mới có quyền duyệt đề xuất PubMed.',
  },
  AI_FEEDBACK_NOT_FOUND: {
    en: 'AI feedback record was not found.',
    vi: 'Không tìm thấy phản hồi AI.',
  },

  // Admin, users, moderation, DTO validation & health metrics
  USER_NOT_FOUND: {
    en: 'User not found.',
    vi: 'Không tìm thấy người dùng.',
  },
  DOCTOR_NOT_FOUND: {
    en: 'Doctor not found.',
    vi: 'Không tìm thấy bác sĩ.',
  },
  DOCTOR_PROFILE_NOT_FOUND: {
    en: 'Doctor profile not found.',
    vi: 'Không tìm thấy hồ sơ bác sĩ.',
  },
  USER_NOT_DOCTOR: {
    en: 'This user account is not a doctor.',
    vi: 'Tài khoản người dùng này không phải là bác sĩ.',
  },
  PATIENT_NOT_FOUND: {
    en: 'Patient profile not found.',
    vi: 'Không tìm thấy hồ sơ bệnh nhân.',
  },
  PATIENT_PROFILE_ALREADY_EXISTS: {
    en: 'Patient profile already exists for this user.',
    vi: 'Người dùng này đã có hồ sơ bệnh nhân từ trước.',
  },
  ADMIN_PROFILE_NOT_FOUND: {
    en: 'Admin profile not found.',
    vi: 'Không tìm thấy hồ sơ quản trị viên.',
  },
  ADMIN_ONLY_SUPER_VIEW: {
    en: 'Only Super Administrators can view all admin accounts.',
    vi: 'Chỉ Super Admin mới có quyền xem tất cả tài khoản quản trị.',
  },
  ADMIN_ONLY_SUPER_CREATE: {
    en: 'Only Super Administrators can create new admin accounts.',
    vi: 'Chỉ Super Admin mới có quyền tạo tài khoản quản trị mới.',
  },
  ADMIN_ONLY_MANAGER_UPDATE: {
    en: 'Only Super Administrators or User Managers can update admin accounts.',
    vi: 'Chỉ Super Admin hoặc Quản trị viên người dùng mới có quyền cập nhật tài khoản này.',
  },
  ADMIN_ONLY_MANAGER_UPDATE_STATUS: {
    en: 'Only Super Administrators or User Managers can update account status.',
    vi: 'Chỉ Super Admin hoặc Quản trị viên người dùng mới có quyền cập nhật trạng thái tài khoản.',
  },
  ADMIN_ONLY_MANAGER_DELETE: {
    en: 'Only Super Administrators or User Managers can delete admin accounts.',
    vi: 'Chỉ Super Admin hoặc Quản trị viên người dùng mới có quyền xoá tài khoản này.',
  },
  ADMIN_CANNOT_MODIFY_SELF: {
    en: 'You cannot modify or delete your own admin account.',
    vi: 'Bạn không thể tự chỉnh sửa hoặc xoá tài khoản quản trị của chính mình.',
  },
  BLACKLIST_KEYWORD_EMPTY: {
    en: 'Keyword must not be empty.',
    vi: 'Từ khoá cấm không được để trống.',
  },
  BLACKLIST_NOT_FOUND: {
    en: 'Blacklist keyword was not found.',
    vi: 'Không tìm thấy từ khoá cấm.',
  },
  VIOLATION_NOT_FOUND: {
    en: 'Violation report was not found.',
    vi: 'Không tìm thấy báo cáo vi phạm.',
  },
  REPORTER_OR_REPORTED_REQUIRED: {
    en: 'Either reporter or reported user ID must be provided.',
    vi: 'Phải cung cấp ít nhất mã người báo cáo hoặc mã người bị báo cáo.',
  },
  HEALTH_METRIC_NOT_FOUND: {
    en: 'Health metric record not found.',
    vi: 'Không tìm thấy bản ghi chỉ số sức khoẻ.',
  },
  HEALTH_METRIC_ALREADY_CORRECTED: {
    en: 'This health metric already has a replacement correction.',
    vi: 'Chỉ số sức khoẻ này đã có bản ghi chỉnh sửa thay thế.',
  },
  HEALTH_METRIC_CANNOT_VOID: {
    en: 'This health metric cannot be voided.',
    vi: 'Không thể huỷ hiệu lực của bản ghi chỉ số sức khoẻ này.',
  },
  HEALTH_METRIC_ONLY_VALID_CORRECTABLE: {
    en: 'Only a valid health metric can be corrected.',
    vi: 'Chỉ có thể chỉnh sửa thay thế đối với bản ghi chỉ số đang hợp lệ.',
  },
  HEALTH_METRIC_CONCURRENT_CHANGE: {
    en: 'Health metric changed concurrently. Please refresh and try again.',
    vi: 'Chỉ số sức khoẻ vừa thay đổi đồng thời. Vui lòng tải lại.',
  },
  HEALTH_METRIC_INVALID_VALUES: {
    en: 'Health metric values do not match the required fields for this metric type.',
    vi: 'Giá trị chỉ số sức khoẻ không khớp với các trường bắt buộc của loại chỉ số này.',
  },
  INVALID_METRIC_TYPE: {
    en: 'Unsupported health metric type.',
    vi: 'Loại chỉ số sức khoẻ không hợp lệ.',
  },
  NO_METRICS_FOR_TYPE: {
    en: 'No metrics found for this metric type.',
    vi: 'Không có dữ liệu chỉ số nào cho loại chỉ số này.',
  },
  NO_NUMERIC_METRIC_VALUES: {
    en: 'No numeric values found in the submitted metrics.',
    vi: 'Không tìm thấy giá trị số hợp lệ trong chỉ số đã gửi.',
  },
  PAYMENT_ORDER_NOT_FOUND: {
    en: 'Payment order not found.',
    vi: 'Không tìm thấy đơn thanh toán.',
  },
  PAYMENT_PAID_ORDER_NOT_FOUND: {
    en: 'Paid payment order not found.',
    vi: 'Không tìm thấy đơn thanh toán đã hoàn tất.',
  },
  PAYMENT_UNPAID_ORDER_NOT_FOUND: {
    en: 'Unpaid payment order not found.',
    vi: 'Không tìm thấy đơn thanh toán chưa hoàn tất.',
  },
  INVALID_PAYMENT_ORDER_ID: {
    en: 'Invalid payment order identifier.',
    vi: 'Mã đơn thanh toán không hợp lệ.',
  },
  INVALID_PLAN_CODE: {
    en: 'Invalid subscription plan code.',
    vi: 'Mã gói dịch vụ không hợp lệ.',
  },
  PAYMENT_PUBLISHED_PLAN_NOT_FOUND: {
    en: 'Published subscription plan not found.',
    vi: 'Không tìm thấy gói dịch vụ đang phát hành.',
  },
  PAYMENT_DRAFT_PLAN_NOT_FOUND: {
    en: 'Draft subscription plan not found.',
    vi: 'Không tìm thấy bản nháp gói dịch vụ.',
  },
  PAYMENT_PLAN_VNPAY_INELIGIBLE: {
    en: 'This plan is not available for VNPAY online payment.',
    vi: 'Gói dịch vụ này không hỗ trợ thanh toán trực tuyến VNPAY.',
  },
  FREE_PLAN_REPLACE_BY_DRAFT: {
    en: 'The FREE plan must be updated by publishing a newer draft.',
    vi: 'Gói FREE chỉ có thể cập nhật bằng cách phát hành phiên bản nháp mới.',
  },
  PAYMENT_PLAN_CHANGE_SCHEDULED: {
    en: 'A plan change is already scheduled for your next cycle.',
    vi: 'Bạn đã đặt lịch đổi gói cho chu kỳ tiếp theo trước đó.',
  },
  PAYMENT_VNPAY_UNAVAILABLE: {
    en: 'VNPAY online payment is temporarily unavailable.',
    vi: 'Cổng thanh toán VNPAY hiện tạm thời không khả dụng.',
  },
  PAYMENT_ORDER_CREATE_FAILED: {
    en: 'Unable to create payment order. Please try again.',
    vi: 'Không thể tạo đơn thanh toán. Vui lòng thử lại.',
  },
  INVALID_STATS_DATE_RANGE: {
    en: 'Invalid statistics date range.',
    vi: 'Khoảng ngày thống kê không hợp lệ.',
  },
  FROM_AFTER_TO_INVALID: {
    en: 'Start date must be before or equal to end date.',
    vi: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.',
  },
  INVALID_CLOUDINARY_URL: {
    en: 'URL must be a valid Cloudinary asset URL.',
    vi: 'Đường dẫn tệp phải là liên kết Cloudinary hợp lệ.',
  },
  NOTE_PLAIN_TEXT_ONLY: {
    en: 'Notes must be plain text without HTML markup.',
    vi: 'Ghi chú chỉ được nhập văn bản thuần, không chứa thẻ HTML.',
  },
  INVALID_FOLDER_TYPE: {
    en: 'Invalid storage folder type.',
    vi: 'Loại thư mục lưu trữ không hợp lệ.',
  },
  PUBLIC_ID_REQUIRED: {
    en: 'File public ID is required.',
    vi: 'Thiếu mã định danh tệp (publicId).',
  },
  NO_FILES_TO_DELETE: {
    en: 'No files provided to delete.',
    vi: 'Không có tệp nào để xoá.',
  },

  // Uploads & files
  FILE_REQUIRED: {
    en: 'Please select a file before uploading.',
    vi: 'Vui lòng chọn tệp để tải lên.',
  },
  FILE_EMPTY: {
    en: 'The uploaded file is empty.',
    vi: 'Tệp tải lên bị rỗng.',
  },
  FILE_IMAGE_ONLY: {
    en: 'Only JPEG and PNG image files are supported.',
    vi: 'Chỉ hỗ trợ tệp hình ảnh (JPEG, PNG).',
  },
  FILE_TYPE_UNSUPPORTED: {
    en: 'Unsupported file type.',
    vi: 'Định dạng tệp không được hỗ trợ.',
  },
  FILE_TOO_LARGE: {
    en: 'The selected file exceeds the maximum allowed size.',
    vi: 'Kích thước tệp vượt quá giới hạn cho phép.',
  },
  FILE_TOO_MANY: {
    en: 'Too many files selected.',
    vi: 'Số lượng tệp vượt quá giới hạn cho phép.',
  },
  FILE_UPLOAD_FAILED: {
    en: 'File upload failed. Please try again.',
    vi: 'Tải tệp lên thất bại. Vui lòng thử lại.',
  },
  FILE_DELETE_FAILED: {
    en: 'Failed to delete file from cloud storage.',
    vi: 'Không thể xoá tệp trên hệ thống lưu trữ.',
  },

  // Google OAuth hardening & mobile PKCE handoff
  AUTH_GOOGLE_LOCAL_ACCOUNT_EXISTS: {
    en: 'This email already has a password account. Sign in with your email and password instead.',
    vi: 'Email này đã có tài khoản mật khẩu. Vui lòng đăng nhập bằng email và mật khẩu.',
  },
  AUTH_GOOGLE_IDENTITY_EXISTS: {
    en: 'This email is already connected to a different Google account. Sign in with that Google account or contact support.',
    vi: 'Email này đã được liên kết với một tài khoản Google khác. Vui lòng dùng tài khoản Google đó hoặc liên hệ hỗ trợ.',
  },
  AUTH_GOOGLE_ACCOUNT_CONFLICT: {
    en: 'This Google account cannot be used. Sign in with the existing method or contact support.',
    vi: 'Không thể sử dụng tài khoản Google này. Vui lòng đăng nhập bằng phương thức hiện có hoặc liên hệ hỗ trợ.',
  },
  AUTH_GOOGLE_EMAIL_INVALID: {
    en: 'The Google account email is invalid.',
    vi: 'Email từ tài khoản Google không hợp lệ.',
  },
  GOOGLE_OAUTH_INVALID_CHALLENGE: {
    en: 'Invalid Google sign-in security challenge. Please start Google sign-in again.',
    vi: 'Thử thách bảo mật đăng nhập Google không hợp lệ. Vui lòng thử lại.',
  },

  // E1 Doctor booking settings & scheduled booking policy
  DOCTOR_BOOKING_SETTINGS_NOT_CONFIGURED: {
    en: 'Doctor booking settings are not configured yet.',
    vi: 'Bác sĩ chưa cấu hình quy tắc đặt lịch hẹn.',
  },
  DOCTOR_BOOKING_SETTINGS_INVALID: {
    en: 'Doctor booking settings values are out of the allowed range.',
    vi: 'Giá trị cấu hình đặt lịch hẹn của bác sĩ không hợp lệ.',
  },
  DOCTOR_BOOKING_SETTINGS_REQUIRED: {
    en: 'Doctor booking settings must be configured before scheduled booking is available.',
    vi: 'Bác sĩ cần hoàn tất cấu hình đặt lịch trước khi mở đặt lịch hẹn trước.',
  },
  OVERRIDE_REASON_REQUIRED: {
    en: 'An override reason (3–500 characters) is required.',
    vi: 'Vui lòng nhập lý do ghi đè cấu hình (từ 3 đến 500 ký tự).',
  },

  // E2 Family Companion & Shared HealthMetrics
  FAMILY_COMPANION_DISABLED: {
    en: 'Family Companion is currently unavailable.',
    vi: 'Tính năng Đồng hành Gia đình hiện đang tạm tắt.',
  },
  FAMILY_LINK_NOT_FOUND: {
    en: 'Family connection was not found.',
    vi: 'Không tìm thấy liên kết gia đình này.',
  },
  ACTIVE_FAMILY_LINK_NOT_FOUND: {
    en: 'An active family connection is required for this action.',
    vi: 'Cần có liên kết gia đình đang hoạt động để thực hiện thao tác này.',
  },
  FAMILY_REUSABLE_LINK_NOT_FOUND: {
    en: 'No reusable invitation record was found.',
    vi: 'Không tìm thấy bản ghi lời mời có thể tái sử dụng.',
  },
  FAMILY_LINK_ALREADY_EXISTS: {
    en: 'A family connection already exists with this person.',
    vi: 'Bạn đã có liên kết gia đình với người dùng này.',
  },
  FAMILY_INVITATION_CONFLICT: {
    en: 'A pending invitation already exists for this recipient.',
    vi: 'Đã tồn tại lời mời đang chờ xử lý cho người nhận này.',
  },
  FAMILY_INVITATION_NOT_FOUND: {
    en: 'Pending family invitation was not found.',
    vi: 'Không tìm thấy lời mời gia đình đang chờ xử lý.',
  },
  FAMILY_INVITATION_NOT_RENEWABLE: {
    en: 'Only pending invitations can regenerate QR codes and invite links.',
    vi: 'Chỉ lời mời đang chờ mới có thể tạo lại mã QR và liên kết mời.',
  },
  INVITATION_NOT_FOUND_OR_EXPIRED: {
    en: 'This invitation link or code is invalid or has expired.',
    vi: 'Liên kết hoặc mã mời không hợp lệ hoặc đã hết hạn.',
  },
  INVITATION_TOKEN_OR_CODE_REQUIRED: {
    en: 'Please provide an invitation link token or 6-digit invite code.',
    vi: 'Vui lòng nhập mã mời hoặc sử dụng liên kết lời mời hợp lệ.',
  },
  INVITATION_REDEEM_REQUIRED: {
    en: 'Please open and verify the invitation first before accepting.',
    vi: 'Vui lòng mở xác thực lời mời trước khi nhấn chấp nhận.',
  },
  INVITATION_RECIPIENT_MISMATCH: {
    en: 'This invitation belongs to a different patient account.',
    vi: 'Lời mời này được gửi cho một tài khoản bệnh nhân khác.',
  },
  FAMILY_SELF_INVITE_NOT_ALLOWED: {
    en: 'You cannot send a family invitation to yourself.',
    vi: 'Bạn không thể tự gửi lời mời đồng hành cho chính mình.',
  },
  FAMILY_CONTACT_NOT_ELIGIBLE: {
    en: 'Selected contact must be an active patient account to join Family Companion.',
    vi: 'Người được mời phải là tài khoản bệnh nhân đang hoạt động.',
  },
  CONTACT_USER_ID_OR_SHARE_REQUIRED: {
    en: 'Select an eligible contact or create a share link invitation.',
    vi: 'Vui lòng chọn người dùng từ danh sách hoặc tạo lời mời bằng liên kết/QR.',
  },
  INVALID_CONTACT_USER_ID: {
    en: 'Selected contact identifier is invalid.',
    vi: 'Mã định danh người nhận lời mời không hợp lệ.',
  },
  FAMILY_LINK_LIMIT_REACHED: {
    en: 'You have reached the maximum number of family connections allowed by your plan.',
    vi: 'Bạn đã đạt giới hạn số liên kết gia đình cho phép theo gói hiện tại.',
  },
  FAMILY_ENTITLEMENT_UNAVAILABLE: {
    en: 'Your current plan does not include this Family Companion capability.',
    vi: 'Gói dịch vụ hiện tại chưa hỗ trợ tính năng Đồng hành Gia đình này.',
  },
  FAMILY_CONSENT_VERSION_REQUIRED: {
    en: 'Consent policy acceptance is required before linking accounts.',
    vi: 'Bạn cần đồng ý với điều khoản liên kết gia đình trước khi chấp nhận.',
  },
  FAMILY_POLICY_VERSION_REQUIRED: {
    en: 'Reminder permission policy version is required.',
    vi: 'Thiếu phiên bản chính sách phân quyền nhắc nhở.',
  },
  INVALID_FAMILY_ACTION: {
    en: 'Unsupported family connection action.',
    vi: 'Thao tác trên liên kết gia đình không được hỗ trợ.',
  },
  INVALID_FAMILY_PERMISSIONS: {
    en: 'Selected family permission settings are invalid.',
    vi: 'Thiết lập quyền đồng hành gia đình không hợp lệ.',
  },
  FAMILY_INVALID_STATE_TRANSITION: {
    en: 'This family connection cannot perform that transition in its current state.',
    vi: 'Không thể thực hiện chuyển trạng thái này với liên kết gia đình hiện tại.',
  },
  FAMILY_LINK_FORBIDDEN: {
    en: 'You do not have access to this family connection.',
    vi: 'Bạn không có quyền truy cập liên kết gia đình này.',
  },
  FAMILY_OWNER_ONLY: {
    en: 'Only the patient who owns this connection can perform this action.',
    vi: 'Chỉ chủ sở hữu liên kết mới có thể thực hiện thao tác này.',
  },
  INVITED_CONTACT_ONLY: {
    en: 'Only the invited recipient can respond to this invitation.',
    vi: 'Chỉ người nhận lời mời mới có thể phản hồi lời mời này.',
  },
  FAMILY_CODE_LIMITER_UNAVAILABLE: {
    en: 'Invitation verification service is temporarily unavailable. Please try again later.',
    vi: 'Hệ thống kiểm tra mã mời hiện tạm gián đoạn. Vui lòng thử lại sau.',
  },
  FAMILY_CODE_ATTEMPTS_EXCEEDED: {
    en: 'Too many invalid invite code attempts. Please try again in 15 minutes.',
    vi: 'Bạn đã nhập sai mã mời quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.',
  },
  SEARCH_TERM_TOO_SHORT: {
    en: 'Please enter at least 2 characters to search contacts.',
    vi: 'Vui lòng nhập ít nhất 2 ký tự để tìm kiếm người dùng.',
  },
  INVALID_HEALTH_METRIC_PERIOD: {
    en: 'Unsupported time period filter for shared health metrics.',
    vi: 'Khoảng thời gian thống kê chỉ số sức khoẻ không hợp lệ.',
  },
  INVALID_HEALTH_METRIC_CONSENT_VERSION: {
    en: 'Health metric sharing consent version is invalid or missing.',
    vi: 'Phiên bản chấp thuận chia sẻ chỉ số sức khoẻ không hợp lệ.',
  },
  FAMILY_HEALTH_SHARING_CHANGED: {
    en: 'Shared health metric permissions changed. Refreshing the latest access state.',
    vi: 'Quyền chia sẻ chỉ số sức khoẻ vừa thay đổi. Vui lòng làm mới dữ liệu.',
  },
  FAMILY_HEALTH_ACCESS_DENIED: {
    en: 'You do not have permission to view this patient’s shared health metrics.',
    vi: 'Bạn không còn quyền xem chỉ số sức khoẻ được chia sẻ của người này.',
  },
  FAMILY_SHARING_CONCURRENT_CHANGE: {
    en: 'Health metric sharing settings changed concurrently. Please refresh and try again.',
    vi: 'Cài đặt chia sẻ chỉ số vừa thay đổi đồng thời. Vui lòng tải lại và thử lại.',
  },
  METRIC_TYPES_NOT_ALLOWED_FOR_ALL: {
    en: 'Specific metric types cannot be set when sharing scope is "all".',
    vi: 'Không được truyền danh sách chỉ số lẻ khi phạm vi chia sẻ là tất cả.',
  },
  INVALID_METRIC_SCOPE: {
    en: 'Selected health metric sharing scope is invalid.',
    vi: 'Phạm vi chia sẻ chỉ số sức khoẻ không hợp lệ.',
  },
  INVALID_METRIC_TYPES: {
    en: 'Select at least one valid health metric type to share.',
    vi: 'Vui lòng chọn ít nhất một loại chỉ số sức khoẻ hợp lệ để chia sẻ.',
  },
  INVALID_SHARED_METRIC_QUERY: {
    en: 'Shared health metric query parameters are invalid.',
    vi: 'Tham số truy vấn chỉ số sức khoẻ được chia sẻ không hợp lệ.',
  },
  INVALID_SHARED_METRIC_VALUE: {
    en: 'Shared health metric record contains an invalid value.',
    vi: 'Dữ liệu chỉ số sức khoẻ được chia sẻ không hợp lệ.',
  },
  INVALID_SHARED_METRIC_LIMIT: {
    en: 'Requested page limit is outside the allowed range.',
    vi: 'Số lượng bản ghi mỗi trang vượt quá giới hạn cho phép.',
  },
  INVALID_SHARED_METRIC_CURSOR: {
    en: 'Shared health metric pagination cursor is invalid. Please refresh.',
    vi: 'Con trỏ phân trang dữ liệu không hợp lệ. Vui lòng tải lại từ đầu.',
  },
  INVALID_SHARED_METRIC_DATE_RANGE: {
    en: 'Selected health metric date window is invalid.',
    vi: 'Khoảng thời gian tra cứu chỉ số sức khoẻ không hợp lệ.',
  },

  // Generic / HTTP / Network fallbacks
  NETWORK_ERROR: {
    en: 'Unable to reach the server. Please check your internet connection.',
    vi: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
  },
  NETWORK_TIMEOUT: {
    en: 'The request timed out. Please try again.',
    vi: 'Yêu cầu quá thời gian phản hồi. Vui lòng thử lại.',
  },
  HTTP_400: {
    en: 'Invalid request. Please review your input and try again.',
    vi: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu.',
  },
  HTTP_401: {
    en: 'Your session has expired. Please log in again.',
    vi: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  },
  HTTP_402: {
    en: 'Payment or active subscription is required.',
    vi: 'Tính năng yêu cầu thanh toán hoặc gói dịch vụ phù hợp.',
  },
  HTTP_403: {
    en: 'You do not have permission to perform this action.',
    vi: 'Bạn không có quyền thực hiện thao tác này.',
  },
  HTTP_404: {
    en: 'Requested resource was not found.',
    vi: 'Không tìm thấy dữ liệu yêu cầu.',
  },
  HTTP_409: {
    en: 'A data conflict occurred. Please refresh and try again.',
    vi: 'Xung đột dữ liệu. Vui lòng tải lại và thử lại.',
  },
  HTTP_422: {
    en: 'Data validation failed. Please check the highlighted fields.',
    vi: 'Dữ liệu không hợp lệ theo quy tắc kiểm tra. Vui lòng kiểm tra lại.',
  },
  HTTP_429: {
    en: 'Too many requests. Please wait a moment and try again.',
    vi: 'Bạn gửi quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.',
  },
  GENERIC_ERROR: {
    en: 'Something went wrong. Please try again.',
    vi: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  },
} as const satisfies Record<string, ApiErrorLocaleEntry>;

export type ApiErrorTranslationKey = keyof typeof API_ERROR_MESSAGES;

const CODE_ALIAS_MAP: Record<string, ApiErrorTranslationKey> = {
  active_care_program_limit_reached: 'ACTIVE_CARE_PROGRAM_LIMIT_REACHED',
  answer_required: 'ANSWER_REQUIRED',
  answer_range_invalid: 'ANSWER_RANGE_INVALID',
  answer_type_invalid: 'ANSWER_TYPE_INVALID',
  answer_unknown_field: 'ANSWER_UNKNOWN_FIELD',
  IDEMPOTENCY_KEY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  GOOGLE_OAUTH_UNAVAILABLE: 'AUTH_OAUTH_UNAVAILABLE',
  GOOGLE_OAUTH_HANDOFF_INVALID: 'AUTH_OAUTH_HANDOFF_INVALID',
  local_account_exists: 'AUTH_GOOGLE_LOCAL_ACCOUNT_EXISTS',
  account_ineligible: 'AUTH_ACCOUNT_NOT_ELIGIBLE',
  oauth_failed: 'AUTH_OAUTH_UNAVAILABLE',
};

const EXACT_MESSAGE_MAP: Record<string, ApiErrorTranslationKey> = {
  // Booking & availability
  'slot does not meet the configured minimum notice': 'MIN_NOTICE_NOT_MET',
  'slot startat must be in the future': 'SLOT_IN_PAST',
  'slot endat must be after startat': 'INVALID_SLOT_RANGE',
  'timezone must be a valid iana timezone': 'INVALID_TIMEZONE',
  'slot overlaps another active slot or its configured buffer': 'SLOT_OVERLAP',
  'only an available slot can be updated': 'SLOT_NOT_MUTABLE',
  'booked slot could not be released': 'SLOT_STATE_CONFLICT',
  'only an active approved doctor can manage availability': 'DOCTOR_NOT_APPROVED',
  'doctor is not active and approved': 'DOCTOR_NOT_ACTIVE_APPROVED',
  'doctor does not own this availability slot': 'DOCTOR_NOT_SLOT_OWNER',
  'availability slot not found': 'AVAILABILITY_SLOT_NOT_FOUND',
  'patient does not own this consultation': 'PATIENT_NOT_CONSULTATION_OWNER',
  'only an active patient can create a scheduled booking': 'ONLY_ACTIVE_PATIENT_BOOK',
  'only the patient owner can reschedule this consultation': 'ONLY_PATIENT_OWNER_RESCHEDULE',
  'only an active patient can check in': 'ONLY_ACTIVE_PATIENT_CHECKIN',
  'only the patient owner can check in': 'ONLY_PATIENT_OWNER_CHECKIN',
  'only an active approved doctor can use the queue': 'ONLY_APPROVED_DOCTOR_QUEUE',
  'patient check-in requires an explicit early-window policy': 'CHECK_IN_POLICY_NOT_CONFIGURED',
  'scheduled booking policy requires buffer and minimum notice configuration':
    'BOOKING_POLICY_NOT_CONFIGURED',

  // Auth & accounts
  'invalid credentials': 'AUTH_INVALID_CREDENTIALS',
  'password is not correct': 'AUTH_PASSWORD_INCORRECT',
  'email already in use': 'AUTH_EMAIL_IN_USE',
  'phone number already in use': 'AUTH_PHONE_IN_USE',
  'email verification is required': 'AUTH_EMAIL_VERIFICATION_REQUIRED',
  'account is not eligible for access': 'AUTH_ACCOUNT_NOT_ELIGIBLE',
  'account is not approved': 'AUTH_ACCOUNT_NOT_APPROVED',
  'account is banned': 'AUTH_ACCOUNT_BANNED',
  'your account is banned': 'AUTH_ACCOUNT_BANNED',
  'your account is banned or does not exist.': 'AUTH_ACCOUNT_BANNED',
  'invalid or expired verification code': 'AUTH_INVALID_VERIFICATION_CODE',
  'invalid or expired recovery code': 'AUTH_INVALID_RECOVERY_CODE',
  'invalid re-application credentials': 'AUTH_INVALID_REAPPLY_CREDENTIALS',
  'invalid refresh token': 'AUTH_INVALID_REFRESH_TOKEN',
  'refresh token is invalid': 'AUTH_INVALID_REFRESH_TOKEN',
  'refresh token is revoked or expired': 'AUTH_REFRESH_TOKEN_REVOKED',
  'access denied': 'FORBIDDEN',
  'session not found': 'AUTH_SESSION_NOT_FOUND',
  'oauth provider is unavailable': 'AUTH_OAUTH_UNAVAILABLE',
  'invalid or expired oauth handoff ticket': 'AUTH_OAUTH_HANDOFF_INVALID',
  'google sign-in is not available for a new account': 'AUTH_OAUTH_SIGNUP_DISABLED',
  'this email already has a password account; sign in with password': 'AUTH_OAUTH_USE_PASSWORD',
  'this email is already registered with a different google account; use the original google account or contact support':
    'AUTH_OAUTH_DIFFERENT_GOOGLE',
  'this google account cannot be used. sign in with the existing method or contact support.':
    'AUTH_GOOGLE_ACCOUNT_CONFLICT',
  'google account email is invalid': 'AUTH_GOOGLE_EMAIL_INVALID',
  'this account uses password sign-in. please use the password sign-in option.':
    'AUTH_OAUTH_USE_PASSWORD',
  'this email already has a password account. sign in with your email and password instead.':
    'AUTH_GOOGLE_LOCAL_ACCOUNT_EXISTS',
  'this email is already connected to a different google account. sign in with that google account or contact support.':
    'AUTH_GOOGLE_IDENTITY_EXISTS',
  'google mobile handoff is unavailable': 'AUTH_OAUTH_UNAVAILABLE',
  'invalid google oauth mobile challenge': 'GOOGLE_OAUTH_INVALID_CHALLENGE',
  'google oauth is temporarily unavailable': 'AUTH_OAUTH_UNAVAILABLE',
  'google oauth handoff is invalid or expired': 'AUTH_OAUTH_HANDOFF_INVALID',
  'doctor booking settings are not configured': 'DOCTOR_BOOKING_SETTINGS_NOT_CONFIGURED',
  'doctor booking settings are invalid': 'DOCTOR_BOOKING_SETTINGS_INVALID',
  'invalid booking settings': 'DOCTOR_BOOKING_SETTINGS_INVALID',
  'override reason is required': 'OVERRIDE_REASON_REQUIRED',
  'doctor booking settings are required before scheduled booking is available':
    'DOCTOR_BOOKING_SETTINGS_REQUIRED',
  'family link not found': 'FAMILY_LINK_NOT_FOUND',
  'invitation not found': 'FAMILY_INVITATION_NOT_FOUND',
  'patient not found': 'PATIENT_NOT_FOUND',
  'pending family invitation not found': 'FAMILY_INVITATION_NOT_FOUND',
  'google sign-in is unavailable for this account; sign in with password':
    'AUTH_OAUTH_UNAVAILABLE_FOR_ACCOUNT',
  'failed to send otp email': 'AUTH_OTP_SEND_FAILED',
  'failed to send approve email': 'AUTH_APPROVE_EMAIL_FAILED',
  'failed to send reject email': 'AUTH_REJECT_EMAIL_FAILED',
  'failed to send ban email': 'AUTH_BAN_EMAIL_FAILED',
  'failed to send unban email': 'AUTH_UNBAN_EMAIL_FAILED',

  // Users & Admins
  'user not found': 'USER_NOT_FOUND',
  'user not found with this email.': 'USER_NOT_FOUND',
  'doctor not found': 'DOCTOR_NOT_FOUND',
  'doctor profile not found': 'DOCTOR_PROFILE_NOT_FOUND',
  'doctor profile not found for existing user.': 'DOCTOR_PROFILE_NOT_FOUND',
  'doctor profile not found for this user.': 'DOCTOR_PROFILE_NOT_FOUND',
  'user is not a doctor.': 'USER_NOT_DOCTOR',
  'patient profile not found': 'PATIENT_NOT_FOUND',
  'patient user not found': 'PATIENT_NOT_FOUND',
  'patient profile already exists for this user': 'PATIENT_PROFILE_ALREADY_EXISTS',
  'admin profile not found': 'ADMIN_PROFILE_NOT_FOUND',
  'admin profile is required': 'ADMIN_PROFILE_NOT_FOUND',
  'only super admins can view all admin accounts': 'ADMIN_ONLY_SUPER_VIEW',
  'only super admins can create new admin accounts': 'ADMIN_ONLY_SUPER_CREATE',
  'only super admins or user managers can update admin accounts': 'ADMIN_ONLY_MANAGER_UPDATE',
  'only super admins or user managers can update account status.':
    'ADMIN_ONLY_MANAGER_UPDATE_STATUS',
  'only super admins or user managers can delete admin accounts': 'ADMIN_ONLY_MANAGER_DELETE',
  'only admin can perform this action': 'FORBIDDEN',
  'cannot modify your account.': 'ADMIN_CANNOT_MODIFY_SELF',
  'keyword must not be empty': 'BLACKLIST_KEYWORD_EMPTY',
  'either reporter_id or reported_user_id must be provided': 'REPORTER_OR_REPORTED_REQUIRED',

  // Consultations, notes, chat & reviews
  'consultation not found': 'CONSULTATION_NOT_FOUND',
  'consultation not found or not owned by patient': 'CONSULTATION_NOT_FOUND',
  'consultation is not accessible': 'FORBIDDEN',
  'you are not authorized to access this consultation': 'FORBIDDEN',
  'only doctor can update clinical notes': 'ONLY_DOCTOR_CLINICAL_NOTES',
  'only patient can update patient notes': 'ONLY_PATIENT_NOTES',
  'patient notes can only be updated before the consultation starts':
    'PATIENT_NOTES_LOCKED_AFTER_START',
  'cannot update completed or cancelled consultation': 'CANNOT_UPDATE_TERMINAL_CONSULTATION',
  'cannot cancel a terminal consultation': 'CANNOT_CANCEL_TERMINAL_CONSULTATION',
  'consultation request is not pending': 'CONSULTATION_NOT_PENDING',
  'consultation must be accepted before starting': 'CONSULTATION_NOT_ACCEPTED',
  'consultation must be accepted before sending messages': 'CHAT_ACCEPT_REQUIRED',
  'scheduled consultation requires patient check-in and doctor call before sending messages':
    'CONSULTATION_NOT_READY_FOR_CHAT',
  'doctor must call the queued consultation before sending messages':
    'CONSULTATION_NOT_CALLED_FOR_CHAT',
  'consultation is not in progress': 'CONSULTATION_NOT_IN_PROGRESS',
  'consultation is not waiting': 'CONSULTATION_NOT_WAITING',
  'consultation must be waiting to mark no-show': 'CONSULTATION_NOT_WAITING_NO_SHOW',
  'no-show waiting period has not elapsed': 'CONSULTATION_NO_SHOW_TOO_EARLY',
  'no-show policy is unavailable': 'CONSULTATION_NO_SHOW_POLICY_UNAVAILABLE',
  'only doctor can change the consultation request': 'ONLY_DOCTOR_CHANGE_REQUEST',
  'only doctor can start consultation': 'ONLY_DOCTOR_START_CONSULTATION',
  'only doctor can complete consultation': 'ONLY_DOCTOR_COMPLETE_CONSULTATION',
  'only doctor can mark a no-show': 'ONLY_DOCTOR_MARK_NO_SHOW',
  'consultation limit reached': 'CONSULTATION_QUOTA_LIMIT_REACHED',
  'consultation quota cannot be counted': 'CONSULTATION_QUOTA_COUNT_FAILED',
  'consultation quota cannot be released': 'CONSULTATION_QUOTA_RELEASE_FAILED',
  'consultation quota is not reserved': 'CONSULTATION_QUOTA_NOT_RESERVED',
  'consultation quota is unavailable': 'CONSULTATION_QUOTA_UNAVAILABLE',
  'not a participant of this consultation': 'NOT_CONSULTATION_PARTICIPANT',
  'sender is not a participant of this consultation': 'NOT_CONSULTATION_PARTICIPANT',
  'sendertype does not match sender role': 'SENDER_TYPE_ROLE_MISMATCH',
  'cannot send message in cancelled consultation': 'CHAT_CANCELLED_CONSULTATION',
  'cannot send message in completed consultation': 'CHAT_COMPLETED_CONSULTATION',
  'cannot send message in no-show consultation': 'CHAT_NO_SHOW_CONSULTATION',
  'message text or image is required': 'CHAT_EMPTY_MESSAGE',
  'message not found': 'NOT_FOUND',
  'only sender can delete message': 'CHAT_ONLY_SENDER_DELETE',
  'only sender can update message': 'CHAT_ONLY_SENDER_UPDATE',
  'this consultation has already been reviewed': 'REVIEW_ALREADY_SUBMITTED',
  'you have already reviewed this doctor': 'REVIEW_DOCTOR_ALREADY_REVIEWED',
  'a review can only be created after consultation completion': 'REVIEW_ONLY_COMPLETED',
  'review not found': 'REVIEW_NOT_FOUND',
  'you are not authorized to delete this review': 'REVIEW_DELETE_UNAUTHORIZED',
  'you are not authorized to update this review': 'REVIEW_UPDATE_UNAUTHORIZED',

  // Chronic care
  'alert action is forbidden': 'ALERT_ACTION_FORBIDDEN',
  'alert cannot be linked to a consultation': 'ALERT_CANNOT_LINK_CONSULTATION',
  'alert is not open': 'ALERT_NOT_OPEN',
  'alert is terminal': 'CARE_ALERT_TERMINAL',
  'alert not found': 'CARE_ALERT_NOT_FOUND',
  'alert was changed by another request': 'CARE_ALERT_REVISION_CONFLICT',
  'invalid doctor identity': 'INVALID_DOCTOR_IDENTITY',
  'scheduled consultation must be in the future': 'CARE_CONSULTATION_SCHEDULE_INVALID',
  'consultation capability is unavailable': 'CONSULTATION_CAPABILITY_UNAVAILABLE',
  'appointment linking is unavailable': 'APPOINTMENT_LINKING_UNAVAILABLE',
  'appointment task has no assigned doctor': 'APPOINTMENT_TASK_NO_DOCTOR',
  'appointment task was concurrently linked': 'APPOINTMENT_TASK_CONCURRENTLY_LINKED',
  'baseline answers do not match the enrollment schema': 'BASELINE_ANSWERS_SCHEMA_MISMATCH',
  'baseline schema must be a supported allowlisted schema': 'BASELINE_SCHEMA_NOT_ALLOWLISTED',
  'consent policy version does not match': 'CARE_CONSENT_VERSION_MISMATCH',
  'care enrollment is not active': 'CARE_ENROLLMENT_NOT_ACTIVE',
  'enrollment activation is blocked': 'CARE_ENROLLMENT_ACTIVATION_BLOCKED',
  'enrollment cannot be cancelled': 'ENROLLMENT_CANNOT_CANCEL',
  'enrollment not found': 'CARE_ENROLLMENT_NOT_FOUND',
  'enrollment revision is stale': 'ENROLLMENT_REVISION_STALE',
  'invalid enrollment state transition': 'INVALID_ENROLLMENT_STATE_TRANSITION',
  'only assigned doctor may transition enrollment': 'ONLY_ASSIGNED_DOCTOR_TRANSITION_ENROLLMENT',
  'only the assigned doctor can generate a report': 'ONLY_ASSIGNED_DOCTOR_GENERATE_REPORT',
  'patient is not active': 'CARE_PATIENT_NOT_ACTIVE',
  'patient is not eligible for another care program': 'PATIENT_NOT_ELIGIBLE_MORE_PROGRAMS',
  'custom setting is not allowed': 'CUSTOM_SETTING_NOT_ALLOWED',
  'program has no active rule': 'PROGRAM_NO_ACTIVE_RULE',
  'program is not a current draft version': 'PROGRAM_NOT_CURRENT_DRAFT',
  'program is not a current published version': 'PROGRAM_NOT_CURRENT_PUBLISHED',
  'program is not published': 'CARE_PROGRAM_NOT_PUBLISHED',
  'program must be published before rule activation': 'PROGRAM_PUBLISH_REQUIRED_FOR_RULE',
  'program not found': 'CARE_PROGRAM_NOT_FOUND',
  'care rule is not accessible': 'CARE_RULE_NOT_ACCESSIBLE',
  'care rule not found': 'CARE_RULE_NOT_FOUND',
  'care rule activation is forbidden': 'CARE_RULE_ACTIVATION_FORBIDDEN',
  'rule is not a current active version': 'RULE_NOT_CURRENT_ACTIVE',
  'rule is not a current draft version': 'RULE_NOT_CURRENT_DRAFT',
  'rule contains a disallowed declarative operator': 'RULE_DISALLOWED_OPERATOR',
  'rule facts must be covered by an approved data source mapping': 'RULE_FACTS_UNMAPPED',
  'care catalog action is forbidden': 'CARE_CATALOG_FORBIDDEN',
  'care resource is not accessible': 'CARE_RESOURCE_NOT_ACCESSIBLE',
  'care summary access is forbidden': 'CARE_SUMMARY_FORBIDDEN',
  'care report access is forbidden': 'CARE_REPORT_FORBIDDEN',
  'care report not found': 'CARE_REPORT_NOT_FOUND',
  'report cutoff is invalid': 'CARE_REPORT_CUTOFF_INVALID',
  'report source data exceeds the safe processing limit': 'CARE_REPORT_SOURCE_LIMIT_EXCEEDED',
  'care report export entitlement is unavailable': 'CARE_REPORT_EXPORT_ENTITLEMENT_UNAVAILABLE',
  'care report export is not configured': 'CARE_REPORT_EXPORT_CONFIGURATION_UNAVAILABLE',
  'care report export is not included in the current entitlement': 'CARE_REPORT_EXPORT_NOT_ENTITLED',
  'care report export not found': 'CARE_REPORT_EXPORT_NOT_FOUND',
  'care task can no longer be linked': 'CARE_TASK_CANNOT_LINK',
  'care task is linked to another consultation': 'CARE_TASK_LINKED_TO_OTHER_CONSULTATION',
  'consultation is linked to another care task': 'CONSULTATION_LINKED_TO_OTHER_CARE_TASK',
  'care task is outside its response window': 'CARE_TASK_OUTSIDE_RESPONSE_WINDOW',
  'care task no longer accepts responses': 'CARE_TASK_NO_LONGER_ACCEPTS_RESPONSES',
  'care task was already transitioned': 'CARE_TASK_ALREADY_TRANSITIONED',
  'task is not a doctor review task': 'TASK_NOT_DOCTOR_REVIEW',
  'task templates must use the supported daily schedule contract': 'TASK_TEMPLATES_INVALID_SCHEDULE',
  'metric tasks must be completed through health tracking (hlth-02)':
    'CARE_TASK_RESPONSE_USE_HEALTH_METRIC',
  'no approved check-in policy is configured for this task': 'NO_APPROVED_CHECKIN_POLICY',
  'no approved response policy is configured for this task':
    'CARE_TASK_RESPONSE_POLICY_NOT_CONFIGURED',
  'check-in contains a symptom code outside the task snapshot': 'CHECKIN_SYMPTOM_OUTSIDE_SNAPSHOT',
  'check-in evaluation delivery is unavailable': 'CHECKIN_EVALUATION_UNAVAILABLE',
  'check-in must contain exactly overallstatus, symptomcodes and severity': 'CHECKIN_FIELDS_INVALID',
  'severity none is only valid with an empty symptom list':
    'SEVERITY_NONE_REQUIRES_EMPTY_SYMPTOMS',
  'the immutable education content is unavailable': 'CARE_TASK_CONTENT_UNAVAILABLE',
  'unsupported response action': 'UNSUPPORTED_RESPONSE_ACTION',
  'original command result is unavailable': 'ORIGINAL_COMMAND_RESULT_UNAVAILABLE',

  // AI knowledge base, assistant, candidates & embeddings
  'ai quota exceeded': 'AI_QUOTA_EXCEEDED',
  'ai quota is unavailable': 'AI_QUOTA_UNAVAILABLE',
  'ai quota service is unavailable': 'AI_QUOTA_SERVICE_UNAVAILABLE',
  'invalid ai quota request': 'VALIDATION_ERROR',
  'message is too long': 'AI_MESSAGE_TOO_LONG',
  'only image files are supported': 'FILE_IMAGE_ONLY',
  'conversation not found': 'AI_CONVERSATION_NOT_FOUND',
  'you are not authorized to access this conversation': 'AI_CONVERSATION_ACCESS_UNAUTHORIZED',
  'you are not authorized to modify this conversation': 'AI_CONVERSATION_MODIFY_UNAUTHORIZED',
  'you are not authorized to delete this conversation': 'AI_CONVERSATION_DELETE_UNAUTHORIZED',
  'you are not authorized to rate this conversation': 'AI_CONVERSATION_RATE_UNAUTHORIZED',
  'rating must be between 1 and 5': 'AI_RATING_RANGE_INVALID',
  'health profile reader is unavailable': 'AI_HEALTH_READER_UNAVAILABLE',
  'knowledge document content hash is required': 'AI_DOC_HASH_REQUIRED',
  'only a pending knowledge document can be approved': 'AI_DOC_ONLY_PENDING_APPROVE',
  'only a pending knowledge document can be rejected': 'AI_DOC_ONLY_PENDING_REJECT',
  'only an approved and ingested knowledge document can be activated':
    'AI_DOC_ONLY_APPROVED_ACTIVATE',
  'only an ai manager may submit or update knowledge documents': 'AI_DOC_MANAGER_REQUIRED',
  'only a full administrator may review or activate knowledge documents':
    'AI_DOC_FULL_ADMIN_REQUIRED',
  'manual re-ingesting requires file payload and is not implemented yet. ingestion is triggered automatically on create.':
    'AI_DOC_MANUAL_INGEST_UNSUPPORTED',
  'document text is empty': 'AI_DOC_TEXT_EMPTY',
  'knowledge candidate not found': 'AI_CANDIDATE_NOT_FOUND',
  'this pubmed article is already a knowledge candidate': 'AI_CANDIDATE_DUPLICATE',
  'only a pending knowledge candidate can be promoted': 'AI_CANDIDATE_ONLY_PENDING_PROMOTE',
  'only a pending knowledge candidate can be rejected': 'AI_CANDIDATE_ONLY_PENDING_REJECT',
  'only an ai manager may view or propose knowledge candidates': 'AI_CANDIDATE_MANAGER_REQUIRED',
  'only a super administrator may review a knowledge candidate':
    'AI_CANDIDATE_SUPER_ADMIN_REQUIRED',
  'llm returned an empty json response': 'AI_EMPTY_LLM_RESPONSE',
  'llm returned an empty response': 'AI_EMPTY_LLM_RESPONSE',
  'mô hình ngôn ngữ trả về mô tả ảnh rỗng': 'AI_EMPTY_LLM_RESPONSE',
  'mô hình ngôn ngữ trả về phản hồi rỗng': 'AI_EMPTY_LLM_RESPONSE',
  'mô hình trả về tóm tắt rỗng': 'AI_EMPTY_LLM_RESPONSE',
  'gemini api key not configured. please set gemini_api_key in .env file and restart the server.':
    'GEMINI_KEY_MISSING',
  'chưa cấu hình gemini api key. vui lòng thiết lập gemini_api_key trong file .env và khởi động lại máy chủ.':
    'GEMINI_KEY_MISSING',
  'gemini_api_key is not configured for embedding service': 'GEMINI_KEY_MISSING',
  'không thể khởi tạo gemini client': 'GEMINI_KEY_MISSING',
  'missing llama_cloud_api_key (or llamaparse_api_key) for document parsing':
    'LLAMAPARSE_CONFIG_MISSING',
  'failed to initialize embedding service': 'EMBEDDING_SERVICE_ERROR',
  'embedding retry attempts exceeded': 'EMBEDDING_SERVICE_ERROR',
  'embedding fallback retry attempts exceeded': 'EMBEDDING_SERVICE_ERROR',
  'embedding output count does not match chunk count': 'EMBEDDING_SERVICE_ERROR',
  'vectors count does not match chunks count for upsert': 'EMBEDDING_SERVICE_ERROR',
  'invalid documentid for vector upsert': 'EMBEDDING_SERVICE_ERROR',
  'no valid chunk content for embedding': 'EMBEDDING_SERVICE_ERROR',
  'no valid chunks to upsert': 'EMBEDDING_SERVICE_ERROR',
  'query is required for embedding': 'EMBEDDING_SERVICE_ERROR',
  'texts are empty after normalization': 'EMBEDDING_SERVICE_ERROR',
  'texts are required for embedding': 'EMBEDDING_SERVICE_ERROR',

  // Billing & VNPAY
  'billing access is forbidden': 'BILLING_FORBIDDEN',
  'payment order projection is unavailable': 'PAYMENT_ORDER_PROJECTION_UNAVAILABLE',
  'payment order not found': 'PAYMENT_ORDER_NOT_FOUND',
  'paid order not found': 'PAYMENT_PAID_ORDER_NOT_FOUND',
  'unpaid order not found': 'PAYMENT_UNPAID_ORDER_NOT_FOUND',
  'invalid payment order identifier': 'INVALID_PAYMENT_ORDER_ID',
  'invalid plan code': 'INVALID_PLAN_CODE',
  'published plan not found': 'PAYMENT_PUBLISHED_PLAN_NOT_FOUND',
  'draft plan not found': 'PAYMENT_DRAFT_PLAN_NOT_FOUND',
  'plan is not available for vnpay payment': 'PAYMENT_PLAN_VNPAY_INELIGIBLE',
  'free plan must be replaced by publishing a newer draft': 'FREE_PLAN_REPLACE_BY_DRAFT',
  'a plan change is already scheduled': 'PAYMENT_PLAN_CHANGE_SCHEDULED',
  'vnpay payments are disabled': 'PAYMENT_VNPAY_UNAVAILABLE',
  'vnpay payments are not available': 'PAYMENT_VNPAY_UNAVAILABLE',
  'unable to create payment order': 'PAYMENT_ORDER_CREATE_FAILED',

  // Health metrics & statistics
  'health metric not found': 'HEALTH_METRIC_NOT_FOUND',
  'health metric already has a correction': 'HEALTH_METRIC_ALREADY_CORRECTED',
  'health metric cannot be voided': 'HEALTH_METRIC_CANNOT_VOID',
  'only a valid metric can be corrected': 'HEALTH_METRIC_ONLY_VALID_CORRECTABLE',
  'health metric changed concurrently': 'HEALTH_METRIC_CONCURRENT_CHANGE',
  'not allowed to view patient metrics': 'FORBIDDEN',
  'invalid metric type': 'INVALID_METRIC_TYPE',
  'no metrics found for this type': 'NO_METRICS_FOR_TYPE',
  'no numeric values found in metrics': 'NO_NUMERIC_METRIC_VALUES',
  'invalid statistics date range': 'INVALID_STATS_DATE_RANGE',
  'from must be before or equal to to': 'FROM_AFTER_TO_INVALID',

  // Idempotency & DTO constraints
  'idempotency-key header is required': 'IDEMPOTENCY_KEY_REQUIRED',
  'idempotency-key is required': 'IDEMPOTENCY_KEY_REQUIRED',
  'idempotency-key is invalid': 'IDEMPOTENCY_KEY_INVALID',
  'idempotency key is already in use': 'IDEMPOTENCY_CONFLICT',
  'this idempotency key has already completed; retrieve the conversation result instead.':
    'IDEMPOTENCY_CONFLICT',
  'this idempotency key cannot be processed again.': 'IDEMPOTENCY_CONFLICT',
  'idempotency key was reused with a different request': 'IDEMPOTENCY_KEY_REUSED_DIFF_PAYLOAD',
  'idempotency-key was already used with another payload': 'IDEMPOTENCY_KEY_REUSED_DIFF_PAYLOAD',
  'idempotency-key was reused with another payload': 'IDEMPOTENCY_KEY_REUSED_DIFF_PAYLOAD',
  'must be a valid cloudinary url (https://res.cloudinary.com/...)': 'INVALID_CLOUDINARY_URL',
  'note must be plain text without html markup': 'NOTE_PLAIN_TEXT_ONLY',

  // Uploads & generic HTTP messages
  'no file provided': 'FILE_REQUIRED',
  'no files provided': 'FILE_REQUIRED',
  'no avatar image provided': 'FILE_REQUIRED',
  'no verification documents provided': 'FILE_REQUIRED',
  'no files to delete': 'NO_FILES_TO_DELETE',
  'invalid folder type': 'INVALID_FOLDER_TYPE',
  'public id required for deletion': 'PUBLIC_ID_REQUIRED',
  'publicid query parameter required': 'PUBLIC_ID_REQUIRED',
  'file buffer is empty': 'FILE_EMPTY',
  'file not found': 'NOT_FOUND',
  'invalid file type': 'FILE_TYPE_UNSUPPORTED',
  'invalid file type. only jpeg and png images are allowed': 'FILE_IMAGE_ONLY',
  'file mimetype is required': 'FILE_TYPE_UNSUPPORTED',
  'upload failed: no response from cloudinary': 'FILE_UPLOAD_FAILED',
  'too many socket events': 'TOO_MANY_REQUESTS',
  'unauthenticated socket': 'UNAUTHORIZED',
  'internal server error': 'INTERNAL_SERVER_ERROR',
  'bad request': 'HTTP_400',
  'unauthorized': 'UNAUTHORIZED',
  'forbidden': 'FORBIDDEN',
  'forbidden resource': 'FORBIDDEN',
  'not found': 'NOT_FOUND',
  'resource not found': 'NOT_FOUND',
  'too many requests': 'TOO_MANY_REQUESTS',
  'service unavailable': 'SERVICE_UNAVAILABLE',
  'notification not found': 'NOT_FOUND',
  'a valid consultation id is required': 'INVALID_ID',
  'consultationid is required': 'INVALID_ID',
  'invalid user id': 'INVALID_ID',
  'invalid doctor id': 'INVALID_ID',
  'invalid consultation id': 'INVALID_ID',
  'invalid sender id': 'INVALID_ID',
  'invalid message cursor': 'VALIDATION_ERROR',
  'invalid message id': 'INVALID_ID',
  'invalid patient id': 'INVALID_ID',
  'invalid review cursor': 'VALIDATION_ERROR',
  'invalid review id': 'INVALID_ID',
};

const PATTERN_MESSAGE_RULES: ReadonlyArray<{
  pattern: RegExp;
  key: ApiErrorTranslationKey;
}> = [
  { pattern: /^ai document with id .+ not found$/i, key: 'AI_DOC_NOT_FOUND' },
  { pattern: /^chunk with id .+ not found$/i, key: 'AI_CHUNK_NOT_FOUND' },
  { pattern: /^ai feedback with id .+ not found/i, key: 'AI_FEEDBACK_NOT_FOUND' },
  { pattern: /^blacklist with id .+ not found$/i, key: 'BLACKLIST_NOT_FOUND' },
  { pattern: /^violation #\S+ not found$/i, key: 'VIOLATION_NOT_FOUND' },
  { pattern: /^slot cannot be changed from status /i, key: 'SLOT_NOT_MUTABLE' },
  { pattern: /minimum notice/i, key: 'MIN_NOTICE_NOT_MET' },
  { pattern: /^invalid .+ id$/i, key: 'INVALID_ID' },
  { pattern: /^invalid .+ cursor$/i, key: 'VALIDATION_ERROR' },
  { pattern: /^values for .+ must contain/i, key: 'HEALTH_METRIC_INVALID_VALUES' },
  { pattern: /^no unit configuration found for type /i, key: 'INVALID_METRIC_TYPE' },
  { pattern: /^failed to delete file on cloudinary/i, key: 'FILE_DELETE_FAILED' },
  { pattern: /^failed to create (?:ai document|blacklist|ai feedback|chunk)/i, key: 'VALIDATION_ERROR' },
  { pattern: /^delete failed:/i, key: 'FILE_DELETE_FAILED' },
  { pattern: /^ai service error:/i, key: 'AI_SERVICE_ERROR' },
  { pattern: /^ai provider/i, key: 'AI_SERVICE_ERROR' },
  { pattern: /^gemini /i, key: 'AI_SERVICE_ERROR' },
  { pattern: /^embedding /i, key: 'EMBEDDING_SERVICE_ERROR' },
  { pattern: /^llamaparse /i, key: 'LLAMAPARSE_CONFIG_MISSING' },
  { pattern: /^invalid embedding vector/i, key: 'EMBEDDING_SERVICE_ERROR' },
  { pattern: /^(?:image|document) too large/i, key: 'FILE_TOO_LARGE' },
  { pattern: /^file .+ exceeds maximum/i, key: 'FILE_TOO_LARGE' },
  { pattern: /^file size .+ exceeds maximum/i, key: 'FILE_TOO_LARGE' },
  { pattern: /^too many files\./i, key: 'FILE_TOO_MANY' },
  { pattern: /^unsupported file type/i, key: 'FILE_TYPE_UNSUPPORTED' },
  { pattern: /^file type .+ not allowed/i, key: 'FILE_TYPE_UNSUPPORTED' },
  { pattern: /^invalid file type/i, key: 'FILE_TYPE_UNSUPPORTED' },
  { pattern: /^cannot extract readable text from file/i, key: 'AI_DOC_TEXT_EMPTY' },
  { pattern: /too many requests/i, key: 'TOO_MANY_REQUESTS' },
];

const HTTP_STATUS_MAP: Record<number, ApiErrorTranslationKey> = {
  400: 'HTTP_400',
  401: 'HTTP_401',
  402: 'HTTP_402',
  403: 'HTTP_403',
  404: 'HTTP_404',
  409: 'HTTP_409',
  422: 'HTTP_422',
  429: 'HTTP_429',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'SERVICE_UNAVAILABLE',
  503: 'SERVICE_UNAVAILABLE',
  504: 'SERVICE_UNAVAILABLE',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMessageString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const joined = value.map(String).filter(Boolean).join(', ').trim();
    return joined || undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
}

function isGenericAxiosTransportMessage(message: string | undefined): boolean {
  if (!message) return false;
  return /^Request failed with status code \d+$/i.test(message);
}

/**
 * Extracts structured code, details, status, Axios code, and raw message from any thrown error.
 */
export function extractApiErrorContext(err: unknown): ApiErrorContext {
  if (typeof err === 'string') {
    return { rawMessage: err.trim() || undefined };
  }

  if (!err || typeof err !== 'object') {
    return {};
  }

  const record = err as Record<string, unknown>;
  const axiosCode = typeof record.code === 'string' ? record.code : undefined;
  const response = isRecord(record.response) ? record.response : undefined;
  const status = typeof response?.status === 'number' ? response.status : undefined;
  const data = response?.data;

  let code: string | undefined;
  let details: Record<string, unknown> | undefined;
  let rawMessage: string | undefined;

  if (typeof data === 'string') {
    rawMessage = data.trim() || undefined;
  } else if (Array.isArray(data)) {
    rawMessage = normalizeMessageString(data);
  } else if (isRecord(data)) {
    const nestedError = isRecord(data.error) ? data.error : undefined;
    code =
      typeof data.code === 'string'
        ? data.code
        : typeof nestedError?.code === 'string'
          ? nestedError.code
          : undefined;

    if (isRecord(data.details)) {
      details = data.details;
    } else if (isRecord(nestedError?.details)) {
      details = nestedError.details;
    }

    rawMessage =
      normalizeMessageString(data.message) ??
      normalizeMessageString(nestedError?.message) ??
      normalizeMessageString(data.error) ??
      normalizeMessageString(data.detail) ??
      normalizeMessageString(data.details);

    if (!rawMessage && Array.isArray(data.errors)) {
      const parts = data.errors
        .map((item) =>
          typeof item === 'string'
            ? item
            : isRecord(item)
              ? normalizeMessageString(item.message ?? item.msg)
              : undefined,
        )
        .filter((item): item is string => Boolean(item));
      if (parts.length > 0) {
        rawMessage = parts.join(', ');
      }
    }
  } else {
    code = typeof record.code === 'string' ? record.code : undefined;
    details = isRecord(record.details) ? record.details : undefined;
    rawMessage =
      normalizeMessageString(record.message) ??
      normalizeMessageString(record.error) ??
      normalizeMessageString(record.detail);
  }

  if (!rawMessage && typeof record.message === 'string') {
    const candidate = record.message.trim();
    if (candidate && !isGenericAxiosTransportMessage(candidate)) {
      rawMessage = candidate;
    }
  }

  return {
    code,
    details,
    rawMessage: rawMessage && !isGenericAxiosTransportMessage(rawMessage) ? rawMessage : undefined,
    status,
    axiosCode,
  };
}

function buildResolved(
  key: ApiErrorTranslationKey,
  params?: Record<string, unknown>,
): ResolvedApiError {
  const entry = API_ERROR_MESSAGES[key];
  return {
    key,
    params,
    fallbackEn: entry.en,
    fallbackVi: entry.vi,
  };
}

/**
 * Resolves a backend error payload, error code, plain exception message, or HTTP/network
 * failure into a canonical `apiErrors.<key>` entry for bilingual UI rendering.
 */
export function resolveApiError(err: unknown): ResolvedApiError | null {
  const ctx = extractApiErrorContext(err);

  // 1. Parameterized structured codes first (e.g. MIN_NOTICE_NOT_MET carrying minNoticeMinutes)
  if (ctx.code === 'MIN_NOTICE_NOT_MET') {
    const minutes =
      typeof ctx.details?.minNoticeMinutes === 'number' &&
      Number.isFinite(ctx.details.minNoticeMinutes)
        ? ctx.details.minNoticeMinutes
        : 60;
    return buildResolved('MIN_NOTICE_NOT_MET', { minutes });
  }

  // 2. Specific plain/DTO exception messages take precedence over umbrella codes
  //    (e.g. FORBIDDEN / CARE_FORBIDDEN / VALIDATION_ERROR / CARE_ENROLLMENT_INVALID_STATE)
  if (ctx.rawMessage) {
    const rawCodeKey =
      CODE_ALIAS_MAP[ctx.rawMessage] ??
      (ctx.rawMessage in API_ERROR_MESSAGES
        ? (ctx.rawMessage as ApiErrorTranslationKey)
        : undefined);
    if (rawCodeKey) {
      return buildResolved(rawCodeKey);
    }

    const normalized = ctx.rawMessage.toLowerCase();
    const exactKey = EXACT_MESSAGE_MAP[normalized];
    if (exactKey) {
      return buildResolved(exactKey);
    }

    for (const rule of PATTERN_MESSAGE_RULES) {
      if (rule.pattern.test(ctx.rawMessage)) {
        if (rule.key === 'MIN_NOTICE_NOT_MET') {
          const minutes =
            typeof ctx.details?.minNoticeMinutes === 'number' &&
            Number.isFinite(ctx.details.minNoticeMinutes)
              ? ctx.details.minNoticeMinutes
              : 60;
          return buildResolved(rule.key, { minutes });
        }
        return buildResolved(rule.key);
      }
    }
  }

  // 3. Structured backend error code fallback
  if (ctx.code) {
    const mappedKey =
      CODE_ALIAS_MAP[ctx.code] ??
      (ctx.code in API_ERROR_MESSAGES ? (ctx.code as ApiErrorTranslationKey) : undefined);

    if (mappedKey) {
      return buildResolved(mappedKey);
    }
  }

  // 4. Network & timeout detection
  if (ctx.axiosCode === 'ECONNABORTED' || (ctx.rawMessage && /timeout/i.test(ctx.rawMessage))) {
    return buildResolved('NETWORK_TIMEOUT');
  }
  if (ctx.axiosCode === 'ERR_NETWORK' || (ctx.rawMessage && /network error/i.test(ctx.rawMessage))) {
    return buildResolved('NETWORK_ERROR');
  }

  // 5. HTTP status fallback (only when there is no specific unrecognized domain message)
  if (!ctx.rawMessage && typeof ctx.status === 'number') {
    const statusKey = HTTP_STATUS_MAP[ctx.status];
    if (statusKey) {
      return buildResolved(statusKey);
    }
  }

  return null;
}

/**
 * Convenience resolver for code-only calls (without full error wrapper).
 */
export function resolveApiErrorByCode(
  code: string | undefined,
  details?: Record<string, unknown>,
): ResolvedApiError | null {
  if (!code) return null;
  return resolveApiError({ code, details });
}
