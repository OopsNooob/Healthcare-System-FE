import { extractApiErrorContext } from "@healthcare/api-client";
import {
  extractApiErrorMessage,
  generateIdempotencyKey,
  webAdminApi,
  type FeTypes,
} from "@/lib/api";

export const HCMC_DISTRICT_OPTIONS = [
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 6",
  "Quận 7",
  "Quận 8",
  "Quận 10",
  "Quận 11",
  "Quận 12",
  "Bình Tân",
  "Bình Thạnh",
  "Gò Vấp",
  "Phú Nhuận",
  "Tân Bình",
  "Tân Phú",
  "Thành phố Thủ Đức",
  "Huyện Bình Chánh",
  "Huyện Cần Giờ",
  "Huyện Củ Chi",
  "Huyện Hóc Môn",
  "Huyện Nhà Bè",
] as const;

export const DIRECTORY_FACILITY_TYPES: FeTypes.DirectoryFacilityType[] = [
  "hospital",
  "general_hospital",
  "medical_center",
  "clinic",
];

export const GOOGLE_PLACE_TYPE_OPTIONS: FeTypes.GooglePlaceTypeFilter[] = [
  "hospital",
  "general_hospital",
  "medical_center",
  "medical_clinic",
  "doctor",
  "dental_clinic",
  "dentist",
  "medical_lab",
  "pharmacy",
  "drugstore",
  "physiotherapist",
  "chiropractor",
  "skin_care_clinic",
  "wellness_center",
];

export interface CareProgramOption {
  programCode: string;
  name: string;
  diseaseKey: string;
}

export type ParsedFacilityError =
  | {
      kind: "possible_duplicate";
      message: string;
      candidates: FeTypes.FacilityDirectoryDuplicateCandidate[];
      truncated: boolean;
    }
  | {
      kind: "place_already_linked";
      message: string;
      facility?: FeTypes.FacilityDirectoryAdminRecord;
    }
  | { kind: "candidate_not_current"; message: string }
  | { kind: "review_limit_reached"; message: string }
  | { kind: "directory_disabled"; message: string }
  | { kind: "provider_unavailable"; message: string; code?: string }
  | { kind: "forbidden"; message: string }
  | { kind: "generic"; message: string; code?: string };

function unwrapEnvelope<T>(response: unknown): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as { data?: T }).data !== undefined
  ) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export function parseFacilityError(err: unknown): ParsedFacilityError {
  const ctx = extractApiErrorContext(err);
  const message = extractApiErrorMessage(err);
  const code = ctx.code;

  if (code === "FACILITY_DIRECTORY_DISABLED") {
    return { kind: "directory_disabled", message };
  }
  if (
    code === "MAP_PROVIDER_DISABLED" ||
    code === "MAP_PROVIDER_UNAVAILABLE" ||
    code === "MAP_PROVIDER_RATE_LIMITED" ||
    code === "MAP_PROVIDER_RATE_LIMIT_UNAVAILABLE"
  ) {
    return { kind: "provider_unavailable", message, code };
  }
  if (code === "FACILITY_POSSIBLE_DUPLICATE") {
    const rawDetails = ctx.details as
      | {
          candidates?: FeTypes.FacilityDirectoryDuplicateCandidate[];
          truncated?: boolean;
        }
      | undefined;
    return {
      kind: "possible_duplicate",
      message,
      candidates: Array.isArray(rawDetails?.candidates)
        ? rawDetails.candidates
        : [],
      truncated: Boolean(rawDetails?.truncated),
    };
  }
  if (code === "FACILITY_GOOGLE_PLACE_ALREADY_LINKED") {
    const rawDetails = ctx.details as
      | { facility?: FeTypes.FacilityDirectoryAdminRecord }
      | undefined;
    return {
      kind: "place_already_linked",
      message,
      facility: rawDetails?.facility,
    };
  }
  if (code === "FACILITY_DUPLICATE_REVIEW_CANDIDATE_NOT_CURRENT") {
    return { kind: "candidate_not_current", message };
  }
  if (code === "FACILITY_DUPLICATE_REVIEW_LIMIT_REACHED") {
    return { kind: "review_limit_reached", message };
  }
  if (ctx.status === 403 || code === "SUPER_ADMIN_REQUIRED") {
    return { kind: "forbidden", message };
  }
  return { kind: "generic", message, code };
}

export function getDisplayFacilityDetails(
  record: FeTypes.FacilityDirectoryAdminRecord,
): FeTypes.FacilityDirectoryStoredDetails | undefined {
  return record.draftDetails ?? record.details ?? record.currentDetails;
}

export const medicalFacilitiesAdminService = {
  async listFacilities(query: {
    status?: FeTypes.DirectoryFacilityStatus;
    needsRecheck?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    items: FeTypes.FacilityDirectoryAdminRecord[];
    total: number;
    page?: number;
    limit?: number;
  }> {
    const res = await webAdminApi.adminMedicalFacilitiesList({ query });
    const data = unwrapEnvelope<{
      items?: FeTypes.FacilityDirectoryAdminRecord[];
      total?: number;
      page?: number;
      limit?: number;
    }>(res);
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total ?? 0),
      page: data?.page,
      limit: data?.limit,
    };
  },

  async getFacility(id: string): Promise<FeTypes.FacilityDirectoryAdminRecord> {
    const res = await webAdminApi.adminMedicalFacilitiesGet({ params: { id } });
    return unwrapEnvelope<FeTypes.FacilityDirectoryAdminRecord>(res);
  },

  async createDraft(
    input: FeTypes.FacilityDirectoryCreateDraftRequest,
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryAdminRecord> {
    const res = await webAdminApi.adminMedicalFacilitiesCreateDraft({
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body: input,
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryAdminRecord>(res);
  },

  async searchMapCandidates(
    body: FeTypes.FacilityDirectoryAdminMapSearchRequest,
  ): Promise<FeTypes.FacilityDirectoryExternalSearchResponse["data"]> {
    const res = await webAdminApi.adminMedicalFacilitiesSearchMapCandidates({
      body,
    });
    return unwrapEnvelope<
      FeTypes.FacilityDirectoryExternalSearchResponse["data"]
    >(res);
  },

  async createFromMapCandidate(
    body: FeTypes.FacilityDirectoryCreateFromMapRequest,
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryCreateFromMapResponse["data"]> {
    const res = await webAdminApi.adminMedicalFacilitiesCreateFromMap({
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<
      FeTypes.FacilityDirectoryCreateFromMapResponse["data"]
    >(res);
  },

  async getMapCandidatePreview(
    id: string,
  ): Promise<FeTypes.FacilityDirectoryMapPreview> {
    const res = await webAdminApi.adminMedicalFacilitiesGetMapCandidatePreview({
      params: { id },
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryMapPreview>(res);
  },

  async updateDraft(
    id: string,
    body: {
      revisionId?: string;
      expectedRevision: number;
      details: FeTypes.FacilityDirectoryDraftDetailsRequest;
    },
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryAdminRecord> {
    const res = await webAdminApi.adminMedicalFacilitiesUpdateDraft({
      params: { id },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryAdminRecord>(res);
  },

  async createRevision(
    id: string,
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryRevision> {
    const res = await webAdminApi.adminMedicalFacilitiesCreateRevision({
      params: { id },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryRevision>(res);
  },

  async verifyFacility(
    id: string,
    body: FeTypes.FacilityDirectoryVerifyRevisionRequest,
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryAdminRecord> {
    const res = await webAdminApi.adminMedicalFacilitiesVerify({
      params: { id },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryAdminRecord>(res);
  },

  async retireFacility(
    id: string,
    body: { reason: string; expectedRevision: number },
    idempotencyKey?: string,
  ): Promise<{ retired: true }> {
    const res = await webAdminApi.adminMedicalFacilitiesRetire({
      params: { id },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<{ retired: true }>(res);
  },

  async linkPlaceId(
    id: string,
    body: FeTypes.FacilityDirectoryUpdateFacilityMetadataRequest,
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryAdminRecord> {
    const res = await webAdminApi.adminMedicalFacilitiesLinkPlaceId({
      params: { id },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryAdminRecord>(res);
  },

  async listSpecialties(
    status?: "active" | "retired",
  ): Promise<FeTypes.FacilityDirectoryAdminSpecialty[]> {
    const res = await webAdminApi.adminMedicalSpecialtiesList({
      query: status ? { status } : undefined,
    });
    const data = unwrapEnvelope<FeTypes.FacilityDirectoryAdminSpecialty[]>(res);
    return Array.isArray(data) ? data : [];
  },

  async createSpecialty(
    body: { code: string; nameVi: string; synonyms?: string[] },
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryAdminSpecialty> {
    const res = await webAdminApi.adminMedicalSpecialtiesCreate({
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryAdminSpecialty>(res);
  },

  async updateSpecialty(
    code: string,
    body: { nameVi: string; synonyms?: string[]; expectedRevision: number },
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryAdminSpecialty> {
    const res = await webAdminApi.adminMedicalSpecialtiesUpdate({
      params: { code },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryAdminSpecialty>(res);
  },

  async retireSpecialty(
    code: string,
    body: { reason: string; expectedRevision: number },
    idempotencyKey?: string,
  ): Promise<{ retired: true }> {
    const res = await webAdminApi.adminMedicalSpecialtiesRetire({
      params: { code },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<{ retired: true }>(res);
  },

  async listMappings(query?: {
    scope?: FeTypes.DirectoryMappingScope;
    scopeKey?: string;
    status?: FeTypes.DirectoryMappingStatus;
  }): Promise<FeTypes.FacilityDirectoryMapping[]> {
    const res = await webAdminApi.adminDiseaseSpecialtyMappingsList({ query });
    const data = unwrapEnvelope<FeTypes.FacilityDirectoryMapping[]>(res);
    return Array.isArray(data) ? data : [];
  },

  async createMapping(
    body: {
      scope: FeTypes.DirectoryMappingScope;
      scopeKey: string;
      specialtyCodes: string[];
      sourceReferences: string[];
    },
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryMapping> {
    const res = await webAdminApi.adminDiseaseSpecialtyMappingsCreate({
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryMapping>(res);
  },

  async updateMapping(
    id: string,
    body: {
      specialtyCodes: string[];
      sourceReferences: string[];
      expectedRevision: number;
    },
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryMapping> {
    const res = await webAdminApi.adminDiseaseSpecialtyMappingsUpdate({
      params: { id },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryMapping>(res);
  },

  async publishMapping(
    id: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<FeTypes.FacilityDirectoryMapping> {
    const res = await webAdminApi.adminDiseaseSpecialtyMappingsPublish({
      params: { id },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body: { expectedRevision },
    });
    return unwrapEnvelope<FeTypes.FacilityDirectoryMapping>(res);
  },

  async retireMapping(
    id: string,
    body: { reason: string; expectedRevision: number },
    idempotencyKey?: string,
  ): Promise<{ retired: true }> {
    const res = await webAdminApi.adminDiseaseSpecialtyMappingsRetire({
      params: { id },
      headers: { "Idempotency-Key": idempotencyKey ?? generateIdempotencyKey() },
      body,
    });
    return unwrapEnvelope<{ retired: true }>(res);
  },
};

