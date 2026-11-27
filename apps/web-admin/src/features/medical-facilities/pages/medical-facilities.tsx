import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  GitBranch,
  GitBranchPlus,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { showToast } from "@repo/ui/components/ui/toasts";
import {
  generateIdempotencyKey,
  normalizePaginatedList,
  webAdminApi,
  type FeTypes,
} from "@/lib/api";
import {
  type CareProgramOption,
  getDisplayFacilityDetails,
  medicalFacilitiesAdminService,
  parseFacilityError,
} from "../services/medical-facilities.service";
import { FacilityFormModal } from "../components/facility-form-modal";
import {
  FacilityDecisionModal,
  type DecisionTarget,
} from "../components/facility-decision-modal";
import { GoogleMapCandidatesModal } from "../components/google-map-candidates-modal";
import { DuplicateReviewModal } from "../components/duplicate-review-modal";
import { SpecialtyFormModal } from "../components/specialty-form-modal";
import { MappingFormModal } from "../components/mapping-form-modal";

type DirectoryTab = "facilities" | "specialties" | "mappings";

type PendingDuplicateRetry =
  | {
      kind: "createDraft";
      details: FeTypes.FacilityDirectoryDraftDetailsRequest;
    }
  | {
      kind: "createFromMap";
      placeId: string;
    }
  | {
      kind: "verifyFacility";
      facility: FeTypes.FacilityDirectoryAdminRecord;
      providerReviewed: boolean;
    };

function formatAddress(address?: FeTypes.FacilityDirectoryAddress): string {
  if (!address) return "--";
  return (
    [address.street, address.ward, address.district, address.province]
      .filter(Boolean)
      .join(", ") || "--"
  );
}

function formatDateDisplay(value: string | undefined, locale: string): string {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MedicalFacilities() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";

  const [activeTab, setActiveTab] = useState<DirectoryTab>("facilities");
  const [directoryDisabled, setDirectoryDisabled] = useState(false);
  const [forbiddenError, setForbiddenError] = useState(false);

  // Facilities state
  const [facilities, setFacilities] = useState<
    FeTypes.FacilityDirectoryAdminRecord[]
  >([]);
  const [facilitiesTotal, setFacilitiesTotal] = useState(0);
  const [facilityPage, setFacilityPage] = useState(1);
  const facilityLimit = 20;
  const [facilityStatusFilter, setFacilityStatusFilter] = useState<
    "all" | FeTypes.DirectoryFacilityStatus
  >("all");
  const [needsRecheckOnly, setNeedsRecheckOnly] = useState(false);
  const [facilitySearch, setFacilitySearch] = useState("");
  const [loadingFacilities, setLoadingFacilities] = useState(true);

  // Specialties state
  const [specialties, setSpecialties] = useState<
    FeTypes.FacilityDirectoryAdminSpecialty[]
  >([]);
  const [specialtyStatusFilter, setSpecialtyStatusFilter] = useState<
    "all" | "active" | "retired"
  >("all");
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);

  // Mappings state
  const [mappings, setMappings] = useState<FeTypes.FacilityDirectoryMapping[]>(
    [],
  );
  const [mappingScopeFilter, setMappingScopeFilter] = useState<
    "all" | FeTypes.DirectoryMappingScope
  >("all");
  const [mappingStatusFilter, setMappingStatusFilter] = useState<
    "all" | FeTypes.DirectoryMappingStatus
  >("all");
  const [mappingScopeKeyFilter, setMappingScopeKeyFilter] = useState("");
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [carePrograms, setCarePrograms] = useState<CareProgramOption[]>([]);

  // Modal & Action states (with single-click guards)
  const [isMutating, setIsMutating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] =
    useState<FeTypes.FacilityDirectoryAdminRecord | null>(null);
  const [facilityPreview, setFacilityPreview] =
    useState<FeTypes.FacilityDirectoryMapPreview | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);

  const [decisionTarget, setDecisionTarget] = useState<DecisionTarget | null>(
    null,
  );

  // Google Maps Candidates Modal
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [mapCandidates, setMapCandidates] = useState<
    FeTypes.FacilityDirectoryMapCandidate[]
  >([]);
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);
  const mapFromCandidateKeyRef = useRef<{ placeId: string; key: string } | null>(
    null,
  );

  // Duplicate Review Modal (409 FACILITY_POSSIBLE_DUPLICATE)
  const [duplicateState, setDuplicateState] = useState<{
    isOpen: boolean;
    candidates: FeTypes.FacilityDirectoryDuplicateCandidate[];
    truncated: boolean;
    pending: PendingDuplicateRetry | null;
  }>({
    isOpen: false,
    candidates: [],
    truncated: false,
    pending: null,
  });

  // Specialty & Mapping Modals
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] =
    useState<FeTypes.FacilityDirectoryAdminSpecialty | null>(null);

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] =
    useState<FeTypes.FacilityDirectoryMapping | null>(null);

  const loadFacilities = useCallback(async () => {
    setLoadingFacilities(true);
    try {
      const res = await medicalFacilitiesAdminService.listFacilities({
        ...(facilityStatusFilter !== "all"
          ? { status: facilityStatusFilter }
          : {}),
        ...(needsRecheckOnly ? { needsRecheck: true } : {}),
        page: facilityPage,
        limit: facilityLimit,
      });
      setFacilities(res.items);
      setFacilitiesTotal(res.total);
      setDirectoryDisabled(false);
      setForbiddenError(false);
    } catch (err) {
      const parsed = parseFacilityError(err);
      if (parsed.kind === "directory_disabled") setDirectoryDisabled(true);
      else if (parsed.kind === "forbidden") setForbiddenError(true);
      else showToast.error(parsed.message);
    } finally {
      setLoadingFacilities(false);
    }
  }, [facilityPage, facilityStatusFilter, needsRecheckOnly]);

  const loadSpecialties = useCallback(async () => {
    setLoadingSpecialties(true);
    try {
      const items = await medicalFacilitiesAdminService.listSpecialties(
        specialtyStatusFilter === "all" ? undefined : specialtyStatusFilter,
      );
      setSpecialties(items);
      setDirectoryDisabled(false);
      setForbiddenError(false);
    } catch (err) {
      const parsed = parseFacilityError(err);
      if (parsed.kind === "directory_disabled") setDirectoryDisabled(true);
      else if (parsed.kind === "forbidden") setForbiddenError(true);
      else showToast.error(parsed.message);
    } finally {
      setLoadingSpecialties(false);
    }
  }, [specialtyStatusFilter]);

  const loadMappings = useCallback(async () => {
    setLoadingMappings(true);
    try {
      const items = await medicalFacilitiesAdminService.listMappings({
        ...(mappingScopeFilter !== "all" ? { scope: mappingScopeFilter } : {}),
        ...(mappingStatusFilter !== "all"
          ? { status: mappingStatusFilter }
          : {}),
        ...(mappingScopeKeyFilter.trim()
          ? { scopeKey: mappingScopeKeyFilter.trim() }
          : {}),
      });
      setMappings(items);
      setDirectoryDisabled(false);
      setForbiddenError(false);
    } catch (err) {
      const parsed = parseFacilityError(err);
      if (parsed.kind === "directory_disabled") setDirectoryDisabled(true);
      else if (parsed.kind === "forbidden") setForbiddenError(true);
      else showToast.error(parsed.message);
    } finally {
      setLoadingMappings(false);
    }
  }, [mappingScopeFilter, mappingScopeKeyFilter, mappingStatusFilter]);

  const loadCarePrograms = useCallback(async () => {
    try {
      const res = await webAdminApi.careProgramRuleListPrograms({
        query: { status: "published", limit: 50, page: 1 },
      });
      const page = normalizePaginatedList<Record<string, unknown>>(res);
      setCarePrograms(
        page.items
          .map((item) => ({
            programCode: String(item.programCode ?? ""),
            name: String(item.name ?? item.programCode ?? ""),
            diseaseKey: String(item.diseaseKey ?? ""),
          }))
          .filter((p) => Boolean(p.programCode)),
      );
    } catch {
      // Optional suggestions only
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadFacilities();
    });
    return () => {
      cancelled = true;
    };
  }, [loadFacilities]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadSpecialties();
    });
    return () => {
      cancelled = true;
    };
  }, [loadSpecialties]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadMappings();
    });
    return () => {
      cancelled = true;
    };
  }, [loadMappings]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadCarePrograms();
    });
    return () => {
      cancelled = true;
    };
  }, [loadCarePrograms]);

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadFacilities(),
        loadSpecialties(),
        loadMappings(),
        loadCarePrograms(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenFacilityDetail = async (id: string) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      const record = await medicalFacilitiesAdminService.getFacility(id);
      setEditingFacility(record);
      setFacilityPreview(null);
      setIsFormOpen(true);
    } catch (err) {
      showToast.error(parseFacilityError(err).message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleFacilityError = async (
    err: unknown,
    pending: PendingDuplicateRetry | null,
  ) => {
    const parsed = parseFacilityError(err);
    if (parsed.kind === "directory_disabled") {
      setDirectoryDisabled(true);
      showToast.error(parsed.message);
      return;
    }
    if (parsed.kind === "possible_duplicate" && pending) {
      setDuplicateState({
        isOpen: true,
        candidates: parsed.candidates,
        truncated: parsed.truncated,
        pending,
      });
      return;
    }
    if (parsed.kind === "place_already_linked") {
      showToast.warning(parsed.message);
      if (parsed.facility?.id) {
        setIsMapModalOpen(false);
        setDuplicateState({
          isOpen: false,
          candidates: [],
          truncated: false,
          pending: null,
        });
        await handleOpenFacilityDetail(parsed.facility.id);
      }
      return;
    }
    if (parsed.kind === "candidate_not_current") {
      showToast.warning(parsed.message);
      return;
    }
    if (parsed.kind === "review_limit_reached") {
      showToast.error(parsed.message);
      return;
    }
    showToast.error(parsed.message);
  };

  const handleSaveFacilityDraft = async (payload: {
    facilityId?: string;
    revisionId?: string;
    expectedRevision?: number;
    details: FeTypes.FacilityDirectoryDraftDetailsRequest;
  }) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      if (!payload.facilityId) {
        await medicalFacilitiesAdminService.createDraft({
          details: payload.details,
        });
        showToast.success(t("medicalFacilities.toasts.created"));
      } else {
        await medicalFacilitiesAdminService.updateDraft(payload.facilityId, {
          ...(payload.revisionId ? { revisionId: payload.revisionId } : {}),
          expectedRevision: payload.expectedRevision ?? 1,
          details: payload.details,
        });
        showToast.success(t("medicalFacilities.toasts.updated"));
      }
      setIsFormOpen(false);
      await loadFacilities();
    } catch (err) {
      if (!payload.facilityId) {
        await handleFacilityError(err, {
          kind: "createDraft",
          details: payload.details,
        });
      } else {
        showToast.error(parseFacilityError(err).message);
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateRevision = async (
    facility: FeTypes.FacilityDirectoryAdminRecord,
  ) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      await medicalFacilitiesAdminService.createRevision(facility.id);
      const updated = await medicalFacilitiesAdminService.getFacility(
        facility.id,
      );
      setEditingFacility(updated);
      setIsFormOpen(true);
      showToast.success(t("medicalFacilities.toasts.revisionCreated"));
      await loadFacilities();
    } catch (err) {
      showToast.error(parseFacilityError(err).message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleFetchFreshPreview = async (facilityId: string) => {
    if (fetchingPreview) return;
    setFetchingPreview(true);
    try {
      const preview =
        await medicalFacilitiesAdminService.getMapCandidatePreview(facilityId);
      setFacilityPreview(preview);
    } catch (err) {
      showToast.error(parseFacilityError(err).message);
    } finally {
      setFetchingPreview(false);
    }
  };

  const handleLinkPlaceId = async (
    facility: FeTypes.FacilityDirectoryAdminRecord,
    placeId: string,
  ) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      const updated = await medicalFacilitiesAdminService.linkPlaceId(
        facility.id,
        { placeId, expectedRevision: facility.revision },
      );
      setEditingFacility(updated);
      showToast.success(t("medicalFacilities.toasts.placeLinked"));
      await loadFacilities();
    } catch (err) {
      await handleFacilityError(err, null);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSearchMapCandidates = async (
    request: FeTypes.FacilityDirectoryAdminMapSearchRequest,
  ) => {
    if (isSearchingMap) return;
    setIsSearchingMap(true);
    setMapErrorMessage(null);
    try {
      const res =
        await medicalFacilitiesAdminService.searchMapCandidates(request);
      setMapCandidates(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      const parsed = parseFacilityError(err);
      setMapErrorMessage(parsed.message);
      setMapCandidates([]);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleCreateFromMapCandidate = async (
    candidate: FeTypes.FacilityDirectoryMapCandidate,
  ) => {
    if (isMutating) return;
    setIsMutating(true);

    // Keep same Idempotency-Key when retrying same placeId (before commit / provider 503)
    const cachedKey =
      mapFromCandidateKeyRef.current?.placeId === candidate.placeId
        ? mapFromCandidateKeyRef.current.key
        : generateIdempotencyKey();
    mapFromCandidateKeyRef.current = {
      placeId: candidate.placeId,
      key: cachedKey,
    };

    try {
      const created = await medicalFacilitiesAdminService.createFromMapCandidate(
        { placeId: candidate.placeId },
        cachedKey,
      );
      mapFromCandidateKeyRef.current = null;
      setIsMapModalOpen(false);
      setEditingFacility(created);
      setFacilityPreview(created.providerPreview ?? null);
      setIsFormOpen(true);
      showToast.success(t("medicalFacilities.toasts.createdFromMap"));
      await loadFacilities();
    } catch (err) {
      const parsed = parseFacilityError(err);
      if (parsed.kind === "possible_duplicate") {
        // After 409 conflict, next confirm submission with duplicateReview MUST use a new Idempotency-Key
        mapFromCandidateKeyRef.current = null;
      }
      await handleFacilityError(err, {
        kind: "createFromMap",
        placeId: candidate.placeId,
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmVerify = async (
    facility: FeTypes.FacilityDirectoryAdminRecord,
    providerReviewed: boolean,
  ) => {
    if (isMutating) return;
    const revisionId = facility.draftRevisionId ?? facility.currentRevisionId;
    if (!revisionId) {
      showToast.error(t("medicalFacilities.toasts.noDraftRevision"));
      return;
    }
    setIsMutating(true);
    try {
      await medicalFacilitiesAdminService.verifyFacility(facility.id, {
        revisionId,
        expectedRevision: facility.revision,
        ...(facility.googlePlaceId && providerReviewed
          ? { providerDataReviewedAgainstOfficialSource: true as const }
          : {}),
      });
      setDecisionTarget(null);
      showToast.success(t("medicalFacilities.toasts.verified"));
      await loadFacilities();
    } catch (err) {
      setDecisionTarget(null);
      await handleFacilityError(err, {
        kind: "verifyFacility",
        facility,
        providerReviewed,
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmRetire = async (reason: string) => {
    if (!decisionTarget || isMutating) return;
    setIsMutating(true);
    try {
      if (decisionTarget.kind === "facility") {
        await medicalFacilitiesAdminService.retireFacility(
          decisionTarget.record.id,
          { reason, expectedRevision: decisionTarget.record.revision },
        );
        showToast.info(t("medicalFacilities.toasts.retiredFacility"));
        await loadFacilities();
      } else if (decisionTarget.kind === "specialty") {
        await medicalFacilitiesAdminService.retireSpecialty(
          decisionTarget.record.code,
          { reason, expectedRevision: decisionTarget.record.revision },
        );
        showToast.info(t("medicalFacilities.toasts.retiredSpecialty"));
        await loadSpecialties();
      } else {
        await medicalFacilitiesAdminService.retireMapping(
          decisionTarget.record.id,
          { reason, expectedRevision: decisionTarget.record.revision },
        );
        showToast.info(t("medicalFacilities.toasts.retiredMapping"));
        await loadMappings();
      }
      setDecisionTarget(null);
    } catch (err) {
      showToast.error(parseFacilityError(err).message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDuplicateConfirmDistinct = async (
    review: FeTypes.FacilityDirectoryDuplicateReviewRequest,
  ) => {
    const pending = duplicateState.pending;
    if (!pending || isMutating) return;
    setIsMutating(true);
    // Always use a NEW Idempotency-Key because request body now carries duplicateReview
    const freshKey = generateIdempotencyKey();
    try {
      if (pending.kind === "createDraft") {
        await medicalFacilitiesAdminService.createDraft(
          { details: pending.details, duplicateReview: review },
          freshKey,
        );
        setDuplicateState({
          isOpen: false,
          candidates: [],
          truncated: false,
          pending: null,
        });
        setIsFormOpen(false);
        showToast.success(t("medicalFacilities.toasts.created"));
      } else if (pending.kind === "createFromMap") {
        const created =
          await medicalFacilitiesAdminService.createFromMapCandidate(
            { placeId: pending.placeId, duplicateReview: review },
            freshKey,
          );
        setDuplicateState({
          isOpen: false,
          candidates: [],
          truncated: false,
          pending: null,
        });
        setIsMapModalOpen(false);
        setEditingFacility(created);
        setFacilityPreview(created.providerPreview ?? null);
        setIsFormOpen(true);
        showToast.success(t("medicalFacilities.toasts.createdFromMap"));
      } else {
        const revisionId =
          pending.facility.draftRevisionId ??
          pending.facility.currentRevisionId;
        if (!revisionId) {
          showToast.error(t("medicalFacilities.toasts.noDraftRevision"));
          return;
        }
        await medicalFacilitiesAdminService.verifyFacility(
          pending.facility.id,
          {
            revisionId,
            expectedRevision: pending.facility.revision,
            ...(pending.facility.googlePlaceId && pending.providerReviewed
              ? { providerDataReviewedAgainstOfficialSource: true as const }
              : {}),
            duplicateReview: review,
          },
          freshKey,
        );
        setDuplicateState({
          isOpen: false,
          candidates: [],
          truncated: false,
          pending: null,
        });
        showToast.success(t("medicalFacilities.toasts.verified"));
      }
      await loadFacilities();
    } catch (err) {
      const parsed = parseFacilityError(err);
      if (parsed.kind === "possible_duplicate") {
        setDuplicateState({
          isOpen: true,
          candidates: parsed.candidates,
          truncated: parsed.truncated,
          pending,
        });
        showToast.warning(parsed.message);
        return;
      }
      if (parsed.kind === "place_already_linked" && parsed.facility?.id) {
        showToast.warning(parsed.message);
        setDuplicateState({
          isOpen: false,
          candidates: [],
          truncated: false,
          pending: null,
        });
        await handleOpenFacilityDetail(parsed.facility.id);
        return;
      }
      showToast.error(parsed.message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleLinkPlaceToCandidate = async (
    candidate: FeTypes.FacilityDirectoryDuplicateCandidate,
  ) => {
    const pending = duplicateState.pending;
    if (pending?.kind !== "createFromMap" || isMutating) return;
    setIsMutating(true);
    try {
      const updated = await medicalFacilitiesAdminService.linkPlaceId(
        candidate.id,
        {
          placeId: pending.placeId,
          expectedRevision: candidate.revision,
        },
      );
      setDuplicateState({
        isOpen: false,
        candidates: [],
        truncated: false,
        pending: null,
      });
      setIsMapModalOpen(false);
      setEditingFacility(updated);
      setFacilityPreview(null);
      setIsFormOpen(true);
      showToast.success(t("medicalFacilities.toasts.placeLinked"));
      await loadFacilities();
    } catch (err) {
      await handleFacilityError(err, null);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveSpecialty = async (payload: {
    mode: "create" | "update";
    code: string;
    nameVi: string;
    synonyms: string[];
    expectedRevision?: number;
  }) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      if (payload.mode === "create") {
        await medicalFacilitiesAdminService.createSpecialty({
          code: payload.code,
          nameVi: payload.nameVi,
          synonyms: payload.synonyms,
        });
        showToast.success(t("medicalFacilities.toasts.specialtyCreated"));
      } else {
        await medicalFacilitiesAdminService.updateSpecialty(payload.code, {
          nameVi: payload.nameVi,
          synonyms: payload.synonyms,
          expectedRevision: payload.expectedRevision ?? 1,
        });
        showToast.success(t("medicalFacilities.toasts.specialtyUpdated"));
      }
      setIsSpecialtyModalOpen(false);
      await loadSpecialties();
    } catch (err) {
      showToast.error(parseFacilityError(err).message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveMapping = async (payload: {
    mode: "create" | "update";
    id?: string;
    scope: FeTypes.DirectoryMappingScope;
    scopeKey: string;
    specialtyCodes: string[];
    sourceReferences: string[];
    expectedRevision?: number;
  }) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      if (payload.mode === "create") {
        await medicalFacilitiesAdminService.createMapping({
          scope: payload.scope,
          scopeKey: payload.scopeKey,
          specialtyCodes: payload.specialtyCodes,
          sourceReferences: payload.sourceReferences,
        });
        showToast.success(t("medicalFacilities.diseaseSpecialty.createdSuccess"));
      } else if (payload.id) {
        await medicalFacilitiesAdminService.updateMapping(payload.id, {
          specialtyCodes: payload.specialtyCodes,
          sourceReferences: payload.sourceReferences,
          expectedRevision: payload.expectedRevision ?? 1,
        });
        showToast.success(t("medicalFacilities.diseaseSpecialty.updatedSuccess"));
      }
      setIsMappingModalOpen(false);
      await loadMappings();
    } catch (err) {
      showToast.error(parseFacilityError(err).message);
    } finally {
      setIsMutating(false);
    }
  };

  const handlePublishMapping = async (
    mapping: FeTypes.FacilityDirectoryMapping,
  ) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      await medicalFacilitiesAdminService.publishMapping(
        mapping.id,
        mapping.revision,
      );
      showToast.success(t("medicalFacilities.toasts.mappingPublished"));
      await loadMappings();
    } catch (err) {
      showToast.error(parseFacilityError(err).message);
    } finally {
      setIsMutating(false);
    }
  };

  const filteredFacilities = facilities.filter((fac) => {
    const keyword = facilitySearch.trim().toLowerCase();
    if (!keyword) return true;
    const details = getDisplayFacilityDetails(fac);
    const addr = formatAddress(details?.address).toLowerCase();
    return (
      (details?.name ?? "").toLowerCase().includes(keyword) ||
      addr.includes(keyword) ||
      (fac.googlePlaceId ?? "").toLowerCase().includes(keyword)
    );
  });

  const totalPages = Math.max(1, Math.ceil(facilitiesTotal / facilityLimit));

  return (
    <div className="w-full p-6">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        {/* Top Header */}
        <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {t("sidebar.medicalFacilities")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("medicalFacilities.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isRefreshing || isMutating}
              onClick={() => void handleRefreshAll()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={isRefreshing ? "animate-spin" : ""}
              />
              <span>{t("common.refresh")}</span>
            </button>

            {activeTab === "facilities" && (
              <>
                <button
                  type="button"
                  disabled={directoryDisabled || forbiddenError || isMutating}
                  onClick={() => {
                    setMapErrorMessage(null);
                    setIsMapModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50"
                >
                  <MapPin size={15} />
                  <span>{t("medicalFacilities.findOnGoogleMaps")}</span>
                </button>
                <button
                  type="button"
                  disabled={directoryDisabled || forbiddenError || isMutating}
                  onClick={() => {
                    setEditingFacility(null);
                    setFacilityPreview(null);
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-slate-900 transition-colors hover:bg-brand/90 shadow-sm disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>{t("medicalFacilities.formModal.addTitle")}</span>
                </button>
              </>
            )}

            {activeTab === "specialties" && (
              <button
                type="button"
                disabled={directoryDisabled || forbiddenError || isMutating}
                onClick={() => {
                  setEditingSpecialty(null);
                  setIsSpecialtyModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-slate-900 transition-colors hover:bg-brand/90 shadow-sm disabled:opacity-50"
              >
                <Plus size={16} />
                <span>{t("medicalFacilities.specialtyModal.createTitle")}</span>
              </button>
            )}

            {activeTab === "mappings" && (
              <button
                type="button"
                disabled={directoryDisabled || forbiddenError || isMutating}
                onClick={() => {
                  setEditingMapping(null);
                  setIsMappingModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-slate-900 transition-colors hover:bg-brand/90 shadow-sm disabled:opacity-50"
              >
                <Plus size={16} />
                <span>{t("medicalFacilities.diseaseSpecialty.addTitle")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Service / Permission alerts */}
        {directoryDisabled && (
          <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-3">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{t("medicalFacilities.directoryDisabledNotice")}</span>
          </div>
        )}

        {forbiddenError && (
          <div className="mb-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-3">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{t("medicalFacilities.superAdminOnlyNotice")}</span>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("facilities")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === "facilities"
                ? "bg-slate-900 text-white dark:bg-brand dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Building2 size={15} />
            {t("medicalFacilities.tabFacilities")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("specialties")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === "specialties"
                ? "bg-slate-900 text-white dark:bg-brand dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Stethoscope size={15} />
            {t("medicalFacilities.tabSpecialties")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mappings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === "mappings"
                ? "bg-slate-900 text-white dark:bg-brand dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <GitBranch size={15} />
            {t("medicalFacilities.tabMappings")}
          </button>
        </div>

        {/* TAB 1: FACILITIES */}
        {activeTab === "facilities" && (
          <>
            <div className="mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={t("medicalFacilities.searchPlaceholder")}
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                />
              </div>
              <select
                value={facilityStatusFilter}
                onChange={(e) => {
                  setFacilityPage(1);
                  setFacilityStatusFilter(
                    e.target.value as "all" | FeTypes.DirectoryFacilityStatus,
                  );
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="all">{t("medicalFacilities.status.all")}</option>
                <option value="draft">
                  {t("medicalFacilities.status.draft")}
                </option>
                <option value="verified">
                  {t("medicalFacilities.status.verified")}
                </option>
                <option value="retired">
                  {t("medicalFacilities.status.retired")}
                </option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsRecheckOnly}
                  onChange={(e) => {
                    setFacilityPage(1);
                    setNeedsRecheckOnly(e.target.checked);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span>{t("medicalFacilities.needsRecheckOnly")}</span>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.table.facility")}
                    </th>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.table.location")}
                    </th>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.tableLastChecked")}
                    </th>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.table.status")}
                    </th>
                    <th className="px-6 py-4 text-right">
                      {t("medicalFacilities.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                  {loadingFacilities ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={`fac-skel-${idx}`}>
                        <td colSpan={5} className="px-6 py-4">
                          <Skeleton className="h-12 w-full rounded-xl" />
                        </td>
                      </tr>
                    ))
                  ) : filteredFacilities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        {t("medicalFacilities.emptyFacilities")}
                      </td>
                    </tr>
                  ) : (
                    filteredFacilities.map((fac) => {
                      const details = getDisplayFacilityDetails(fac);
                      const hasDraftToVerify = Boolean(fac.draftRevisionId);
                      return (
                        <tr
                          key={fac.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                <Building2
                                  className="text-indigo-600 dark:text-indigo-400"
                                  size={20}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {details?.name ||
                                    t("medicalFacilities.unnamedFacility")}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {details?.facilityType && (
                                    <span>
                                      {t(
                                        `medicalFacilities.facilityTypes.${details.facilityType}`,
                                      )}
                                    </span>
                                  )}
                                  <span>• rev {fac.revision}</span>
                                  {fac.googlePlaceId && (
                                    <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                                      • Google Place Linked
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-1.5 max-w-xs">
                              <MapPin
                                size={14}
                                className="text-slate-400 shrink-0 mt-0.5"
                              />
                              <span className="text-xs line-clamp-2">
                                {formatAddress(details?.address)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-xs">
                              {formatDateDisplay(fac.lastCheckedAt, dateLocale)}
                            </div>
                            {fac.needsRecheck && (
                              <Badge className="mt-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none text-[10px]">
                                {t("medicalFacilities.needsRecheckBadge")}
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              {fac.status === "verified" && (
                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none">
                                  <CheckCircle2 size={12} className="mr-1" />
                                  {t("medicalFacilities.status.verified")}
                                </Badge>
                              )}
                              {fac.status === "draft" && (
                                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none">
                                  <Clock size={12} className="mr-1" />
                                  {t("medicalFacilities.status.draft")}
                                </Badge>
                              )}
                              {fac.status === "retired" && (
                                <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none">
                                  <Archive size={12} className="mr-1" />
                                  {t("medicalFacilities.status.retired")}
                                </Badge>
                              )}
                              {fac.status === "verified" &&
                                fac.draftRevisionId && (
                                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                    {t("medicalFacilities.hasOpenDraftRevision")}
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  void handleOpenFacilityDetail(fac.id)
                                }
                                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                <Edit size={12} />
                                {t("medicalFacilities.actions.edit")}
                              </button>

                              {fac.status === "verified" &&
                                !fac.draftRevisionId && (
                                  <button
                                    type="button"
                                    disabled={isMutating}
                                    onClick={() => void handleCreateRevision(fac)}
                                    className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <GitBranchPlus size={12} />
                                    {t("medicalFacilities.createRevision")}
                                  </button>
                                )}

                              {fac.status !== "retired" && hasDraftToVerify && (
                                <button
                                  type="button"
                                  disabled={isMutating}
                                  onClick={() =>
                                    setDecisionTarget({
                                      kind: "facility",
                                      mode: "verify",
                                      record: fac,
                                    })
                                  }
                                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {t("medicalFacilities.verifyAction")}
                                </button>
                              )}

                              {fac.status !== "retired" && (
                                <button
                                  type="button"
                                  disabled={isMutating}
                                  onClick={() =>
                                    setDecisionTarget({
                                      kind: "facility",
                                      mode: "retire",
                                      record: fac,
                                    })
                                  }
                                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Archive size={12} />
                                  {t("medicalFacilities.retire")}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {facilitiesTotal > facilityLimit && (
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {t("medicalFacilities.paginationInfo", {
                    page: facilityPage,
                    totalPages,
                    total: facilitiesTotal,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={facilityPage <= 1 || loadingFacilities}
                    onClick={() => setFacilityPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    {t("common.previous", "Prev")}
                  </button>
                  <button
                    type="button"
                    disabled={facilityPage >= totalPages || loadingFacilities}
                    onClick={() => setFacilityPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    {t("common.next", "Next")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: SPECIALTIES */}
        {activeTab === "specialties" && (
          <>
            <div className="mb-4 flex items-center justify-end">
              <select
                value={specialtyStatusFilter}
                onChange={(e) =>
                  setSpecialtyStatusFilter(
                    e.target.value as "all" | "active" | "retired",
                  )
                }
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-xs outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="all">{t("medicalFacilities.status.all")}</option>
                <option value="active">
                  {t("medicalFacilities.diseaseSpecialty.active")}
                </option>
                <option value="retired">
                  {t("medicalFacilities.status.retired")}
                </option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.specialtyModal.codeLabel")}
                    </th>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.specialtyModal.nameViLabel")}
                    </th>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.specialtyModal.synonymsLabel")}
                    </th>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.table.status")}
                    </th>
                    <th className="px-6 py-4 text-right">
                      {t("medicalFacilities.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                  {loadingSpecialties ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={`sp-skel-${idx}`}>
                        <td colSpan={5} className="px-6 py-4">
                          <Skeleton className="h-10 w-full rounded-xl" />
                        </td>
                      </tr>
                    ))
                  ) : specialties.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        {t("medicalFacilities.emptySpecialties")}
                      </td>
                    </tr>
                  ) : (
                    specialties.map((sp) => (
                      <tr
                        key={sp.code}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {sp.code}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {sp.nameVi}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            rev {sp.revision}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {sp.synonyms?.length > 0
                              ? sp.synonyms.map((syn) => (
                                  <Badge
                                    key={syn}
                                    variant="outline"
                                    className="text-[11px]"
                                  >
                                    {syn}
                                  </Badge>
                                ))
                              : "--"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {sp.status === "active" ? (
                            <Badge className="bg-emerald-600 text-white text-xs border-none">
                              {t("medicalFacilities.diseaseSpecialty.active")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {t("medicalFacilities.status.retired")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {sp.status === "active" && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() => {
                                  setEditingSpecialty(sp);
                                  setIsSpecialtyModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 disabled:opacity-50"
                              >
                                <Edit size={12} />
                                {t("medicalFacilities.actions.edit")}
                              </button>
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  setDecisionTarget({
                                    kind: "specialty",
                                    mode: "retire",
                                    record: sp,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50"
                              >
                                {t("medicalFacilities.retire")}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB 3: MAPPINGS */}
        {activeTab === "mappings" && (
          <>
            <div className="mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                type="text"
                value={mappingScopeKeyFilter}
                onChange={(e) => setMappingScopeKeyFilter(e.target.value)}
                placeholder={t(
                  "medicalFacilities.diseaseSpecialty.filterScopeKeyPlaceholder",
                )}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
              <select
                value={mappingScopeFilter}
                onChange={(e) =>
                  setMappingScopeFilter(
                    e.target.value as "all" | FeTypes.DirectoryMappingScope,
                  )
                }
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="all">
                  {t("medicalFacilities.diseaseSpecialty.allScopes")}
                </option>
                <option value="program">
                  {t("medicalFacilities.diseaseSpecialty.scopeProgram")}
                </option>
                <option value="disease">
                  {t("medicalFacilities.diseaseSpecialty.scopeDisease")}
                </option>
              </select>
              <select
                value={mappingStatusFilter}
                onChange={(e) =>
                  setMappingStatusFilter(
                    e.target.value as "all" | FeTypes.DirectoryMappingStatus,
                  )
                }
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="all">{t("medicalFacilities.status.all")}</option>
                <option value="draft">
                  {t("medicalFacilities.status.draft")}
                </option>
                <option value="published">
                  {t("medicalFacilities.status.published")}
                </option>
                <option value="retired">
                  {t("medicalFacilities.status.retired")}
                </option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.diseaseSpecialty.tableDiseaseCode")}
                    </th>
                    <th className="px-6 py-4">
                      {t(
                        "medicalFacilities.diseaseSpecialty.tableRecommendedSpecialties",
                      )}
                    </th>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.diseaseSpecialty.sourcesColumn")}
                    </th>
                    <th className="px-6 py-4">
                      {t("medicalFacilities.diseaseSpecialty.tableStatus")}
                    </th>
                    <th className="px-6 py-4 text-right">
                      {t("medicalFacilities.diseaseSpecialty.tableActions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                  {loadingMappings ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={`map-skel-${idx}`}>
                        <td colSpan={5} className="px-6 py-4">
                          <Skeleton className="h-10 w-full rounded-xl" />
                        </td>
                      </tr>
                    ))
                  ) : mappings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        {t("medicalFacilities.emptyMappings")}
                      </td>
                    </tr>
                  ) : (
                    mappings.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {m.scopeKey}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {m.scope === "program"
                              ? t(
                                  "medicalFacilities.diseaseSpecialty.scopeProgram",
                                )
                              : t(
                                  "medicalFacilities.diseaseSpecialty.scopeDisease",
                                )}{" "}
                            • v{m.version} • rev {m.revision}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {m.specialtyCodes.map((sp) => (
                              <Badge
                                key={sp}
                                variant="outline"
                                className="text-xs font-semibold"
                              >
                                {sp}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="space-y-1">
                            {m.sourceReferences.map((url) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                              >
                                <ExternalLink size={11} className="shrink-0" />
                                <span className="truncate">{url}</span>
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {m.status === "published" && (
                            <Badge className="bg-emerald-600 text-white text-xs border-none">
                              {t("medicalFacilities.status.published")}
                            </Badge>
                          )}
                          {m.status === "draft" && (
                            <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none text-xs">
                              {t("medicalFacilities.status.draft")}
                            </Badge>
                          )}
                          {m.status === "retired" && (
                            <Badge variant="secondary" className="text-xs">
                              {t("medicalFacilities.status.retired")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {m.status === "draft" && (
                              <>
                                <button
                                  type="button"
                                  disabled={isMutating}
                                  onClick={() => {
                                    setEditingMapping(m);
                                    setIsMappingModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 disabled:opacity-50"
                                >
                                  <Edit size={12} />
                                  {t("medicalFacilities.actions.edit")}
                                </button>
                                <button
                                  type="button"
                                  disabled={isMutating}
                                  onClick={() => void handlePublishMapping(m)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <Send size={12} />
                                  {t("medicalFacilities.publishAction")}
                                </button>
                              </>
                            )}
                            {m.status !== "retired" && (
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() =>
                                  setDecisionTarget({
                                    kind: "mapping",
                                    mode: "retire",
                                    record: m,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50"
                              >
                                {t("medicalFacilities.retire")}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <FacilityFormModal
        key={
          editingFacility?.id
            ? `${editingFacility.id}-${editingFacility.revision}-${editingFacility.draftRevisionId ?? "nodraft"}`
            : isFormOpen
              ? "create-facility-open"
              : "create-facility-closed"
        }
        isOpen={isFormOpen}
        facility={editingFacility}
        providerPreview={facilityPreview}
        specialties={specialties}
        isSubmitting={isMutating}
        isFetchingPreview={fetchingPreview}
        onClose={() => setIsFormOpen(false)}
        onSaveDraft={handleSaveFacilityDraft}
        onCreateRevision={handleCreateRevision}
        onFetchFreshPreview={handleFetchFreshPreview}
        onLinkPlaceId={handleLinkPlaceId}
      />

      <FacilityDecisionModal
        key={
          decisionTarget
            ? `${decisionTarget.kind}-${decisionTarget.mode}-${"id" in decisionTarget.record ? decisionTarget.record.id : decisionTarget.record.code}`
            : "decision-closed"
        }
        isOpen={Boolean(decisionTarget)}
        target={decisionTarget}
        isSubmitting={isMutating}
        onClose={() => setDecisionTarget(null)}
        onConfirmVerify={handleConfirmVerify}
        onConfirmRetire={handleConfirmRetire}
      />

      <GoogleMapCandidatesModal
        isOpen={isMapModalOpen}
        specialties={specialties}
        isSearching={isSearchingMap}
        isCreatingFromPlace={isMutating}
        candidates={mapCandidates}
        errorMessage={mapErrorMessage}
        onClose={() => setIsMapModalOpen(false)}
        onSearch={handleSearchMapCandidates}
        onCreateFromCandidate={handleCreateFromMapCandidate}
      />

      <DuplicateReviewModal
        key={duplicateState.candidates.map((c) => c.id).join(",")}
        isOpen={duplicateState.isOpen}
        candidates={duplicateState.candidates}
        truncated={duplicateState.truncated}
        candidatePlaceId={
          duplicateState.pending?.kind === "createFromMap"
            ? duplicateState.pending.placeId
            : undefined
        }
        isSubmitting={isMutating}
        onClose={() =>
          setDuplicateState({
            isOpen: false,
            candidates: [],
            truncated: false,
            pending: null,
          })
        }
        onOpenCandidate={(id) => {
          setDuplicateState({
            isOpen: false,
            candidates: [],
            truncated: false,
            pending: null,
          });
          void handleOpenFacilityDetail(id);
        }}
        onLinkPlaceIdToCandidate={handleLinkPlaceToCandidate}
        onConfirmDistinct={handleDuplicateConfirmDistinct}
      />

      <SpecialtyFormModal
        key={editingSpecialty?.code ?? "create-specialty"}
        isOpen={isSpecialtyModalOpen}
        specialty={editingSpecialty}
        isSubmitting={isMutating}
        onClose={() => setIsSpecialtyModalOpen(false)}
        onSave={handleSaveSpecialty}
      />

      <MappingFormModal
        key={editingMapping?.id ?? "create-mapping"}
        isOpen={isMappingModalOpen}
        mapping={editingMapping}
        specialties={specialties}
        carePrograms={carePrograms}
        isSubmitting={isMutating}
        onClose={() => setIsMappingModalOpen(false)}
        onSave={handleSaveMapping}
      />
    </div>
  );
}
