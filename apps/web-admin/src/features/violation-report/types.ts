import {
  User,
  Zap,
  AlertTriangle,
  EyeOff,
  UserCheck,
  ShieldAlert,
  Bot,
  CircleAlert,
  type LucideIcon,
} from "lucide-react";

export type ReportStatus = "pending" | "processing" | "resolved" | "dismissed";

export type ReportType =
  | "harassment"
  | "spam"
  | "misinformation"
  | "inappropriate_content"
  | "impersonation"
  | "fraud"
  | "ai_hallucination"
  | "other";

export type ResolutionAction = "warning" | "suspend" | "ban" | "none";

export interface ViolationReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserEmail: string;
  reportedUserRole?: "patient" | "doctor" | "admin";
  reportedUserStatus?: "active" | "banned";
  reportType: ReportType;
  reason: string;
  status: ReportStatus;
  resolutionNote?: string;
  actionTaken?: ResolutionAction;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ViolationStatsOverview {
  total: number;
  pending: number;
  resolved: number;
  by_type: Record<string, number>;
}

export interface ReviewModerationItem {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  consultationId: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  flagged: boolean;
  adminNotes?: string;
  createdAt?: string;
}

export interface DoctorRatingSummary {
  doctorId: string;
  averageRating: number;
  totalReviews: number;
  starDistribution: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
}

export interface TopRatedDoctorItem {
  doctorId: string;
  doctorName: string;
  specialty?: string;
  avatarUrl: string;
  averageRating: number;
  totalReviews: number;
}

export interface ReportTypeMeta {
  label: string;
  labelKey: string;
  icon: LucideIcon;
  iconClassName: string;
  badgeClassName: string;
}

export const REPORT_TYPE_META: Record<ReportType, ReportTypeMeta> = {
  harassment: {
    label: "Harassment",
    labelKey: "harassment",
    icon: User,
    iconClassName: "text-red-600 dark:text-red-400",
    badgeClassName:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50",
  },
  spam: {
    label: "Spam",
    labelKey: "spam",
    icon: Zap,
    iconClassName: "text-amber-600 dark:text-amber-400",
    badgeClassName:
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
  },
  misinformation: {
    label: "Misinformation",
    labelKey: "misinformation",
    icon: AlertTriangle,
    iconClassName: "text-rose-600 dark:text-rose-400",
    badgeClassName:
      "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50",
  },
  inappropriate_content: {
    label: "Inappropriate Content",
    labelKey: "inappropriate_content",
    icon: EyeOff,
    iconClassName: "text-amber-600 dark:text-amber-400",
    badgeClassName:
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
  },
  impersonation: {
    label: "Impersonation",
    labelKey: "impersonation",
    icon: UserCheck,
    iconClassName: "text-indigo-600 dark:text-indigo-400",
    badgeClassName:
      "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50",
  },
  fraud: {
    label: "Fraud",
    labelKey: "fraud",
    icon: ShieldAlert,
    iconClassName: "text-rose-600 dark:text-rose-400",
    badgeClassName:
      "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50",
  },
  ai_hallucination: {
    label: "AI Hallucination",
    labelKey: "ai_hallucination",
    icon: Bot,
    iconClassName: "text-orange-600 dark:text-orange-400",
    badgeClassName:
      "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50",
  },
  other: {
    label: "Other",
    labelKey: "other",
    icon: CircleAlert,
    iconClassName: "text-slate-600 dark:text-slate-400",
    badgeClassName:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};
