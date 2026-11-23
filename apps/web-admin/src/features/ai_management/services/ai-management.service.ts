import {
  normalizePaginatedList,
  webAdminApi,
  type AiDocumentChunksUpdateChunkRequest,
  type KnowledgeCandidateStatus,
  type KnowledgeDocumentReviewStatus,
  type KnowledgeDocumentStatus,
  type KnowledgeDocumentUpdateRequest,
  type PaginatedResult,
  type ProposeKnowledgeCandidateRequest,
} from "@/lib/api";

export type DocumentStatus = KnowledgeDocumentStatus;
export type DocumentType = "pdf" | "doc" | "docx" | "txt";
export type DocumentReviewStatus = KnowledgeDocumentReviewStatus;
export type CandidateStatus = KnowledgeCandidateStatus;

export interface DocumentItem {
  id: string;
  title: string;
  fileType: DocumentType;
  status: DocumentStatus;
  reviewStatus: DocumentReviewStatus;
  documentVersion: number;
  parentDocumentId?: string | null;
  scope: string;
  knowledgeLanguage: string;
  source: string;
  uploadedBy: string;
  validUntil?: string;
  reviewedBy?: string | null;
  reviewedAt?: string;
  reviewReason?: string | null;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  isEnabled: boolean;
}

export interface KnowledgeCandidateItem {
  id: string;
  pmid: string;
  title: string;
  sourceUrl: string;
  status: CandidateStatus;
  reviewedAt?: string;
  reviewReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentChunkItem {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
  isActive: boolean;
  reviewStatus?: DocumentReviewStatus;
  validUntil?: string;
  createdAt?: string;
}

export interface AiFeedbackItem {
  id: string;
  patientId: string;
  aiConversationId: string;
  content: string;
  helpfulCount: number;
  verified: boolean;
  createdAt: string;
}

type RawRecord = Record<string, unknown>;

function formatDisplayDate(value?: unknown, locale = "vi-VN"): string {
  if (typeof value !== "string" || !value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeDocType(value: unknown): DocumentType {
  if (value === "pdf" || value === "doc" || value === "docx" || value === "txt") {
    return value;
  }
  return "pdf";
}

function normalizeDocStatus(value: unknown): DocumentStatus {
  if (
    value === "pending_ingestion" ||
    value === "processing" ||
    value === "ready_for_activation" ||
    value === "active" ||
    value === "error" ||
    value === "inactive"
  ) {
    return value;
  }
  return "pending_ingestion";
}

function normalizeReviewStatus(
  value: unknown,
  docStatus: DocumentStatus,
): DocumentReviewStatus {
  if (
    value === "pending_review" ||
    value === "approved" ||
    value === "rejected" ||
    value === "archived"
  ) {
    return value;
  }
  if (docStatus === "active" || docStatus === "ready_for_activation") {
    return "approved";
  }
  if (docStatus === "inactive") return "archived";
  return "pending_review";
}

function normalizeCandidateStatus(value: unknown): CandidateStatus {
  if (value === "promoted" || value === "rejected" || value === "pending_review") {
    return value;
  }
  return "pending_review";
}

function extractActorLabel(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const obj = value as RawRecord;
    if (typeof obj.fullName === "string" && obj.fullName.trim()) {
      return obj.fullName.trim();
    }
    if (typeof obj.email === "string" && obj.email.trim()) {
      return obj.email.trim();
    }
    if (typeof obj._id === "string" && obj._id.trim()) {
      return obj._id.trim();
    }
  }
  return "-";
}

function extractOptionalActorLabel(value: unknown): string | undefined {
  const label = extractActorLabel(value);
  return label === "-" ? undefined : label;
}

function mapDocToUi(raw: RawRecord, locale = "vi-VN"): DocumentItem | null {
  const id =
    typeof raw._id === "string"
      ? raw._id
      : typeof raw.id === "string"
        ? raw.id
        : "";
  if (!id) return null;

  const status = normalizeDocStatus(raw.status);

  return {
    id,
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title
        : "Untitled document",
    fileType: normalizeDocType(raw.fileType),
    status,
    reviewStatus: normalizeReviewStatus(raw.reviewStatus, status),
    documentVersion:
      typeof raw.documentVersion === "number" && raw.documentVersion > 0
        ? raw.documentVersion
        : 1,
    parentDocumentId:
      typeof raw.parentDocumentId === "string"
        ? raw.parentDocumentId
        : raw.parentDocumentId === null
          ? null
          : undefined,
    scope:
      typeof raw.scope === "string" && raw.scope.trim() ? raw.scope : "global",
    knowledgeLanguage:
      typeof raw.knowledgeLanguage === "string" && raw.knowledgeLanguage.trim()
        ? raw.knowledgeLanguage
        : "vi",
    source:
      typeof raw.source === "string" && raw.source.trim()
        ? raw.source
        : "upload",
    uploadedBy: extractActorLabel(raw.uploadedBy),
    validUntil: typeof raw.validUntil === "string" ? raw.validUntil : undefined,
    reviewedBy: extractOptionalActorLabel(raw.reviewedBy) ?? null,
    reviewedAt:
      typeof raw.reviewedAt === "string"
        ? formatDisplayDate(raw.reviewedAt, locale)
        : undefined,
    reviewReason:
      typeof raw.reviewReason === "string"
        ? raw.reviewReason
        : raw.reviewReason === null
          ? null
          : undefined,
    approvedBy: extractOptionalActorLabel(raw.approvedBy),
    approvedAt:
      typeof raw.approvedAt === "string"
        ? formatDisplayDate(raw.approvedAt, locale)
        : undefined,
    createdAt: formatDisplayDate(raw.createdAt, locale),
    updatedAt:
      typeof raw.updatedAt === "string"
        ? formatDisplayDate(raw.updatedAt, locale)
        : undefined,
    isEnabled: status === "active",
  };
}

function mapCandidateToUi(
  raw: RawRecord,
  locale = "vi-VN",
): KnowledgeCandidateItem | null {
  const id =
    typeof raw._id === "string"
      ? raw._id
      : typeof raw.id === "string"
        ? raw.id
        : "";
  if (!id) return null;

  return {
    id,
    pmid: typeof raw.pmid === "string" ? raw.pmid : "",
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title
        : "Untitled PubMed candidate",
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : "",
    status: normalizeCandidateStatus(raw.status),
    reviewedAt:
      typeof raw.reviewedAt === "string"
        ? formatDisplayDate(raw.reviewedAt, locale)
        : undefined,
    reviewReason:
      typeof raw.reviewReason === "string"
        ? raw.reviewReason
        : raw.reviewReason === null
          ? null
          : undefined,
    createdAt: formatDisplayDate(raw.createdAt, locale),
    updatedAt:
      typeof raw.updatedAt === "string"
        ? formatDisplayDate(raw.updatedAt, locale)
        : undefined,
  };
}

function mapChunkToUi(raw: RawRecord): DocumentChunkItem | null {
  const id =
    typeof raw._id === "string"
      ? raw._id
      : typeof raw.id === "string"
        ? raw.id
        : "";
  if (!id) return null;

  return {
    id,
    documentId:
      typeof raw.documentId === "string" ? raw.documentId : "",
    chunkIndex:
      typeof raw.chunkIndex === "number" ? raw.chunkIndex : 0,
    content: typeof raw.content === "string" ? raw.content : "",
    tokenCount:
      typeof raw.tokenCount === "number" ? raw.tokenCount : undefined,
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
    reviewStatus:
      raw.reviewStatus === "approved" ||
      raw.reviewStatus === "rejected" ||
      raw.reviewStatus === "pending_review" ||
      raw.reviewStatus === "archived"
        ? raw.reviewStatus
        : undefined,
    validUntil:
      typeof raw.validUntil === "string" ? raw.validUntil : undefined,
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : undefined,
  };
}

export async function getDocumentList(params: {
  page?: number;
  limit?: number;
  status?: DocumentStatus;
  search?: string;
  locale?: string;
} = {}): Promise<PaginatedResult<DocumentItem>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const locale = params.locale ?? "vi-VN";

  const trimmedSearch = params.search?.trim();
  if (trimmedSearch && !params.status) {
    const rawSearch = await webAdminApi.aiDocumentsSearchDocuments({
      params: { query: trimmedSearch },
    });
    const list = normalizePaginatedList<RawRecord>(rawSearch, 1, 50);
    return {
      ...list,
      items: list.items
        .map((item) => mapDocToUi(item, locale))
        .filter((item): item is DocumentItem => item !== null),
    };
  }

  const raw = await webAdminApi.aiDocumentsGetAllDocuments({
    query: {
      page,
      limit,
      status: params.status,
      search: trimmedSearch || undefined,
      sortBy: "createdAt",
      sortOrder: -1,
    },
  });

  const normalized = normalizePaginatedList<RawRecord>(raw, page, limit);
  return {
    ...normalized,
    items: normalized.items
      .map((item) => mapDocToUi(item, locale))
      .filter((item): item is DocumentItem => item !== null),
  };
}

export async function getDocumentById(
  id: string,
  locale = "vi-VN",
): Promise<DocumentItem | null> {
  const raw = await webAdminApi.aiDocumentsGetDocument({ params: { id } });
  const record =
    raw && typeof raw === "object" && "data" in raw && raw.data
      ? (raw.data as RawRecord)
      : (raw as unknown as RawRecord);
  return mapDocToUi(record, locale);
}

export async function createAiDocument(
  file: File,
  title?: string,
  validUntil?: string | null,
) {
  const formData = new FormData();
  formData.append("file", file);
  const normalizedTitle = title?.trim();
  if (normalizedTitle) {
    formData.append("title", normalizedTitle);
  }
  if (validUntil) {
    formData.append("validUntil", validUntil);
  }
  return webAdminApi.aiDocumentsCreate(formData);
}

export async function updateAiDocument(
  id: string,
  body: KnowledgeDocumentUpdateRequest,
) {
  return webAdminApi.aiDocumentsUpdateDocument({
    params: { id },
    body,
  });
}

export async function approveAiDocument(id: string) {
  return webAdminApi.aiDocumentsApprove({ params: { id } });
}

export async function rejectAiDocument(id: string, reason?: string) {
  const normalizedReason = reason?.trim();
  return webAdminApi.aiDocumentsReject({
    params: { id },
    body: normalizedReason ? { reason: normalizedReason } : {},
  });
}

export async function activateAiDocument(id: string) {
  return webAdminApi.aiDocumentsActivate({ params: { id } });
}

export async function replaceAiDocumentVersion(
  id: string,
  file: File,
  title?: string,
  validUntil?: string | null,
) {
  const formData = new FormData();
  formData.append("file", file);
  const normalizedTitle = title?.trim();
  if (normalizedTitle) {
    formData.append("title", normalizedTitle);
  }
  if (validUntil) {
    formData.append("validUntil", validUntil);
  }
  return webAdminApi.aiDocumentsReplaceVersion({
    params: { id },
    body: formData,
  });
}

export async function archiveAiDocument(id: string) {
  return webAdminApi.aiDocumentsArchiveDocument({ params: { id } });
}

export async function deleteDocument(id: string) {
  return webAdminApi.aiDocumentsDeleteDocument({ params: { id } });
}

export async function getKnowledgeCandidates(
  locale = "vi-VN",
): Promise<KnowledgeCandidateItem[]> {
  const raw = await webAdminApi.aiKnowledgeCandidatesList();
  const list = Array.isArray(raw)
    ? (raw as unknown as RawRecord[])
    : raw &&
        typeof raw === "object" &&
        "data" in raw &&
        Array.isArray((raw as RawRecord).data)
      ? ((raw as RawRecord).data as RawRecord[])
      : [];
  return list
    .map((item) => mapCandidateToUi(item, locale))
    .filter((item): item is KnowledgeCandidateItem => item !== null);
}

export async function proposeKnowledgeCandidate(
  input: ProposeKnowledgeCandidateRequest,
  locale = "vi-VN",
): Promise<KnowledgeCandidateItem | null> {
  const raw: unknown = await webAdminApi.aiKnowledgeCandidatesPropose({
    pmid: input.pmid.trim(),
    title: input.title.trim(),
    sourceUrl: input.sourceUrl.trim(),
  });
  const record =
    raw && typeof raw === "object" && "data" in raw && (raw as RawRecord).data
      ? ((raw as RawRecord).data as RawRecord)
      : (raw as RawRecord);
  return mapCandidateToUi(record, locale);
}

export async function promoteKnowledgeCandidate(id: string) {
  return webAdminApi.aiKnowledgeCandidatesPromote({ params: { id } });
}

export async function rejectKnowledgeCandidate(id: string, reason?: string) {
  const normalizedReason = reason?.trim();
  return webAdminApi.aiKnowledgeCandidatesReject({
    params: { id },
    body: normalizedReason ? { reason: normalizedReason } : {},
  });
}

export async function getDocumentChunks(params: {
  documentId: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResult<DocumentChunkItem>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const raw = await webAdminApi.aiDocumentChunksGetDocumentChunks({
    params: { documentId: params.documentId },
    query: {
      page,
      limit,
      search: params.search?.trim() || undefined,
      sortBy: "chunkIndex",
      sortOrder: 1,
    },
  });
  const normalized = normalizePaginatedList<RawRecord>(raw, page, limit);
  return {
    ...normalized,
    items: normalized.items
      .map(mapChunkToUi)
      .filter((item): item is DocumentChunkItem => item !== null),
  };
}

export async function getChunkDetail(
  id: string,
): Promise<DocumentChunkItem | null> {
  const raw = await webAdminApi.aiDocumentChunksGetChunk({ params: { id } });
  const record =
    raw && typeof raw === "object" && "data" in raw && raw.data
      ? (raw.data as RawRecord)
      : (raw as unknown as RawRecord);
  return mapChunkToUi(record);
}

export async function searchDocumentChunks(
  query: string,
  documentId?: string,
): Promise<DocumentChunkItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const raw = await webAdminApi.aiDocumentChunksSearchChunks({
    params: { query: trimmed },
  });
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as unknown as { data?: unknown[] })?.data)
      ? ((raw as unknown as { data?: unknown[] }).data as unknown[])
      : [];

  return list
    .map((item) => mapChunkToUi(item as RawRecord))
    .filter((item): item is DocumentChunkItem => {
      if (!item) return false;
      if (documentId && item.documentId && item.documentId !== documentId) {
        return false;
      }
      return true;
    });
}

export async function createDocumentChunk(input: {
  documentId: string;
  content: string;
  chunkIndex: number;
}) {
  return webAdminApi.aiDocumentChunksCreate(input);
}

export async function createManyDocumentChunks(
  chunks: Array<{ documentId: string; content: string; chunkIndex: number }>,
) {
  return webAdminApi.aiDocumentChunksCreateMany({
    body: chunks as unknown as string[],
  });
}

export async function updateDocumentChunk(
  id: string,
  body: AiDocumentChunksUpdateChunkRequest["body"],
) {
  return webAdminApi.aiDocumentChunksUpdateChunk({
    params: { id },
    body,
  });
}

export async function deleteDocumentChunk(id: string) {
  return webAdminApi.aiDocumentChunksDeleteChunk({ params: { id } });
}

export async function deleteAllDocumentChunks(documentId: string) {
  return webAdminApi.aiDocumentChunksDeleteDocumentChunks({
    params: { documentId },
  });
}

export async function getAllAiFeedbacks(params: {
  page?: number;
  limit?: number;
  aiConversationId?: string;
  locale?: string;
} = {}): Promise<PaginatedResult<AiFeedbackItem>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const locale = params.locale ?? "vi-VN";

  const raw = await webAdminApi.aiFeedbacksGetAllFeedbacks({
    query: {
      page,
      limit,
      aiConversationId: params.aiConversationId?.trim() || undefined,
      sortBy: "createdAt",
      sortOrder: -1,
    },
  });

  const normalized = normalizePaginatedList<RawRecord>(raw, page, limit);
  return {
    ...normalized,
    items: normalized.items.map((item, idx) => ({
      id:
        typeof item._id === "string"
          ? item._id
          : typeof item.id === "string"
            ? item.id
            : `fb-${idx}`,
      patientId:
        item.patientId && typeof item.patientId === "object"
          ? String(
              (item.patientId as RawRecord).fullName ||
                (item.patientId as RawRecord)._id ||
                "-",
            )
          : String(item.patientId ?? "-"),
      aiConversationId: String(item.aiConversationId ?? "-"),
      content: typeof item.content === "string" ? item.content : "",
      helpfulCount:
        typeof item.helpfulCount === "number" ? item.helpfulCount : 0,
      verified: Boolean(
        item.isVerified ?? item.verified ?? item.verifiedByDoctor,
      ),
      createdAt: formatDisplayDate(item.createdAt, locale),
    })),
  };
}

export async function verifyAiFeedback(id: string) {
  return webAdminApi.aiFeedbacksVerifyFeedback({ params: { id } });
}

export async function markAiFeedbackHelpful(id: string) {
  return webAdminApi.aiFeedbacksMarkHelpful({ params: { id } });
}

export async function getConversationFeedbackCount(
  conversationId: string,
): Promise<number> {
  const res = await webAdminApi.aiFeedbacksGetConversationStats({
    params: { conversationId },
  });
  return res?.totalFeedbacks ?? 0;
}
