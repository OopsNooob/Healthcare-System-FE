import {
  Bot,
  CircleAlert,
  Flag,
  MessageSquareX,
  ShieldAlert,
  TriangleAlert,
  User,
} from "lucide-react";

export type ReportType =
  | "harassment"
  | "spam"
  | "misinformation"
  | "inappropriate_content"
  | "impersonation"
  | "fraud"
  | "ai_hallucination"
  | "other";

export type ReportStatus = "pending" | "resolved" | "dismissed";
export type AccountStatus = "active" | "banned";
export type ResolutionAction = "warning" | "suspend" | "ban" | "none";

export type ViolationReportItem = {
  id: string;
  reportedUserId: string;
  reporterName: string;
  reportedAccount: string;
  reportType: ReportType;
  reason: string;
  status: ReportStatus;
  accountStatus: AccountStatus;
  createdAt: string;
};

export const REPORT_TYPE_META: Record<
  ReportType,
  {
    label: string;
    icon: typeof MessageSquareX;
    iconClassName: string;
    badgeClassName: string;
  }
> = {
  harassment: {
    label: "Harassment",
    icon: MessageSquareX,
    iconClassName: "text-red-600",
    badgeClassName: "bg-red-50 text-red-600 border-red-200",
  },
  spam: {
    label: "Spam",
    icon: ShieldAlert,
    iconClassName: "text-amber-600",
    badgeClassName: "bg-amber-50 text-amber-700 border-amber-200",
  },
  misinformation: {
    label: "Misinformation",
    icon: TriangleAlert,
    iconClassName: "text-violet-600",
    badgeClassName: "bg-violet-50 text-violet-600 border-violet-200",
  },
  inappropriate_content: {
    label: "Inappropriate",
    icon: Flag,
    iconClassName: "text-pink-600",
    badgeClassName: "bg-pink-50 text-pink-600 border-pink-200",
  },
  impersonation: {
    label: "Impersonation",
    icon: User,
    iconClassName: "text-blue-600",
    badgeClassName: "bg-blue-50 text-blue-600 border-blue-200",
  },
  fraud: {
    label: "Fraud",
    icon: TriangleAlert,
    iconClassName: "text-rose-600",
    badgeClassName: "bg-rose-50 text-rose-600 border-rose-200",
  },
  ai_hallucination: {
    label: "AI Hallucination",
    icon: Bot,
    iconClassName: "text-orange-600",
    badgeClassName: "bg-orange-50 text-orange-600 border-orange-200",
  },
  other: {
    label: "Other",
    icon: CircleAlert,
    iconClassName: "text-rose-600",
    badgeClassName: "bg-rose-50 text-rose-600 border-rose-200",
  },
};
