import {
  webAdminApi,
  type PlansCreateResponse,
  type PlansListResponse,
  type PaymentsGetEvidenceResponse,
} from "@/lib/api";

export interface PlanVersionRecord {
  id: string;
  code: string;
  version: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  aiRequestLimit: number;
  aiTokenLimit: number;
  aiQuotaPeriod: "day" | "subscription_cycle";
  consultationLimitPerCycle: number;
  activeCareProgramLimit: number;
  benefits: Record<string, unknown>;
  refundPolicy: Record<string, unknown>;
  status: "draft" | "published" | "retired";
  publishedAt?: string;
  retiredAt?: string;
}

export interface CreatePlanDraftInput {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationDays: number;
  aiRequestLimit: number;
  aiTokenLimit: number;
  aiQuotaPeriod: "day" | "subscription_cycle";
  consultationLimitPerCycle: number;
  activeCareProgramLimit: number;
  benefits: Record<string, unknown>;
  refundPolicy: Record<string, unknown>;
}

function mapRawPlan(raw: Record<string, unknown>, idx: number): PlanVersionRecord {
  const id = String(raw._id || raw.id || `${String(raw.code || "PLAN")}-v${String(raw.version || idx)}`);
  const statusRaw = String(raw.status || "draft");
  const status: PlanVersionRecord["status"] =
    statusRaw === "published" || statusRaw === "retired" ? statusRaw : "draft";

  return {
    id,
    code: String(raw.code || "CUSTOM"),
    version: Number(raw.version ?? 1),
    name: String(raw.name || raw.code || "Subscription Plan"),
    description: typeof raw.description === "string" ? raw.description : "",
    price: Number(raw.price ?? 0),
    currency: typeof raw.currency === "string" ? raw.currency : "VND",
    durationDays: Number(raw.durationDays ?? 30),
    aiRequestLimit: Number(raw.aiRequestLimit ?? 0),
    aiTokenLimit: Number(raw.aiTokenLimit ?? 0),
    aiQuotaPeriod:
      raw.aiQuotaPeriod === "day" ? "day" : "subscription_cycle",
    consultationLimitPerCycle: Number(raw.consultationLimitPerCycle ?? 0),
    activeCareProgramLimit: Number(raw.activeCareProgramLimit ?? 0),
    benefits:
      raw.benefits && typeof raw.benefits === "object"
        ? (raw.benefits as Record<string, unknown>)
        : {},
    refundPolicy:
      raw.refundPolicy && typeof raw.refundPolicy === "object"
        ? (raw.refundPolicy as Record<string, unknown>)
        : {},
    status,
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : undefined,
    retiredAt: typeof raw.retiredAt === "string" ? raw.retiredAt : undefined,
  };
}

export const premiumManagementService = {
  async listPlans(): Promise<PlanVersionRecord[]> {
    const res: PlansListResponse = await webAdminApi.plansList();
    if (!Array.isArray(res)) return [];
    return res.map((item, idx) => mapRawPlan(item as unknown as Record<string, unknown>, idx));
  },

  async deployDefaults(): Promise<PlanVersionRecord[]> {
    const res = await webAdminApi.plansDeployDefaults();
    if (!Array.isArray(res)) return [];
    return res.map((item, idx) => mapRawPlan(item as unknown as Record<string, unknown>, idx));
  },

  async createDraft(input: CreatePlanDraftInput): Promise<PlanVersionRecord> {
    const created: PlansCreateResponse = await webAdminApi.plansCreate({
      body: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        price: Math.max(0, Math.round(input.price)),
        currency: input.currency || "VND",
        durationDays: Math.max(1, Math.min(366, Math.round(input.durationDays))),
        aiRequestLimit: Math.max(0, Math.round(input.aiRequestLimit)),
        aiTokenLimit: Math.max(0, Math.round(input.aiTokenLimit)),
        aiQuotaPeriod: input.aiQuotaPeriod,
        consultationLimitPerCycle: Math.max(0, Math.round(input.consultationLimitPerCycle)),
        activeCareProgramLimit: Math.max(0, Math.min(100, Math.round(input.activeCareProgramLimit))),
        benefits: input.benefits,
        refundPolicy: input.refundPolicy,
      },
    } as never);
    return mapRawPlan(created as unknown as Record<string, unknown>, 0);
  },

  async publishPlan(id: string): Promise<PlanVersionRecord> {
    const res = await webAdminApi.plansPublish({ params: { id } });
    return mapRawPlan(res as unknown as Record<string, unknown>, 0);
  },

  async retirePlan(id: string): Promise<PlanVersionRecord> {
    const res = await webAdminApi.plansRetire({ params: { id } });
    return mapRawPlan(res as unknown as Record<string, unknown>, 0);
  },

  async getPaymentEvidence(orderId: string): Promise<PaymentsGetEvidenceResponse> {
    return webAdminApi.paymentsGetEvidence({ params: { id: orderId.trim() } });
  },
};

export type PaymentOrderStatus =
  | "paid"
  | "pending"
  | "processing"
  | "refund_pending"
  | "refunded"
  | "failed"
  | "expired"
  | "cancelled";

export type CashFlowDirection = "inflow" | "outflow" | "pending" | "none";

export interface PaymentTransactionRecord {
  id: string;
  mongoOrderId?: string;
  user: string;
  userEmail: string;
  planCode: "FREE" | "PLUS" | "CARE";
  planName: string;
  planVersion: string;
  amount: number;
  currency: string;
  paymentGateway: "vnpay";
  bankCode: string;
  maskedReference: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  status: PaymentOrderStatus;
  subscriptionGranted: boolean;
  grantPeriod?: string;
  outboxStatus: "delivered" | "pending" | "processing" | "none";
  refundNote?: string;
  refundNoteKey?: string;
}

/**
 * Classifies a payment order into an admin cash-flow direction.
 */
export function getCashFlowDirection(status: PaymentOrderStatus): CashFlowDirection {
  if (status === "paid") return "inflow";
  if (status === "refunded" || status === "refund_pending") return "outflow";
  if (status === "pending" || status === "processing") return "pending";
  return "none";
}
