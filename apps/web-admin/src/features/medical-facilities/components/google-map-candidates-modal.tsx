import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { showToast } from "@repo/ui/components/ui/toasts";
import type { FeTypes } from "@/lib/api";
import {
  GOOGLE_PLACE_TYPE_OPTIONS,
  HCMC_DISTRICT_OPTIONS,
} from "../services/medical-facilities.service";

interface GoogleMapCandidatesModalProps {
  isOpen: boolean;
  specialties: FeTypes.FacilityDirectoryAdminSpecialty[];
  isSearching?: boolean;
  isCreatingFromPlace?: boolean;
  candidates: FeTypes.FacilityDirectoryMapCandidate[];
  errorMessage?: string | null;
  lastCreatedPlaceId?: string | null;
  onClose: () => void;
  onSearch: (
    request: FeTypes.FacilityDirectoryAdminMapSearchRequest,
  ) => Promise<void>;
  onCreateFromCandidate: (
    candidate: FeTypes.FacilityDirectoryMapCandidate,
  ) => Promise<void>;
}

export function GoogleMapCandidatesModal({
  isOpen,
  specialties,
  isSearching = false,
  isCreatingFromPlace = false,
  candidates,
  errorMessage,
  onClose,
  onSearch,
  onCreateFromCandidate,
}: GoogleMapCandidatesModalProps) {
  const { t } = useTranslation();
  const [searchMode, setSearchMode] = useState<"query" | "specialty">("query");
  const [queryText, setQueryText] = useState("");
  const [specialtyCode, setSpecialtyCode] = useState("");
  const [scopeMode, setScopeMode] = useState<"none" | "area" | "location">(
    "area",
  );
  const [area, setArea] = useState("Quận 1");
  const [latitude, setLatitude] = useState("10.7769");
  const [longitude, setLongitude] = useState("106.7009");
  const [radiusKm, setRadiusKm] = useState("10");
  const [placeType, setPlaceType] = useState<
    FeTypes.GooglePlaceTypeFilter | ""
  >("");
  const [creatingPlaceId, setCreatingPlaceId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeSpecialties = specialties.filter((s) => s.status === "active");
  const busy =
    isSearching || isCreatingFromPlace || creatingPlaceId !== null;

  const buildSearchRequest =
    (): FeTypes.FacilityDirectoryAdminMapSearchRequest | null => {
      const optionalPlaceType = placeType ? { placeType } : {};

      if (scopeMode === "area" && area.trim() && area.trim().length < 2) {
        showToast.warning(t("medicalFacilities.mapModal.areaLengthError"));
        return null;
      }

      if (searchMode === "specialty" && !specialtyCode) {
        showToast.warning(t("medicalFacilities.mapModal.specialtyRequired"));
        return null;
      }

      if (searchMode === "specialty" && scopeMode === "none") {
        showToast.warning(
          t("medicalFacilities.mapModal.specialtyScopeRequired"),
        );
        return null;
      }

      let locationObj: FeTypes.FacilityDirectoryLocationRequest | undefined;
      let parsedRadius: number | undefined;
      if (scopeMode === "location") {
        const lat = Number(latitude);
        const lng = Number(longitude);
        const rad = Number(radiusKm || "10");
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          showToast.warning(t("medicalFacilities.formModal.coordinatesInvalid"));
          return null;
        }
        if (!Number.isInteger(rad) || rad < 1 || rad > 50) {
          showToast.warning(t("medicalFacilities.mapModal.radiusInvalid"));
          return null;
        }
        locationObj = { latitude: lat, longitude: lng };
        parsedRadius = rad;
      }

      if (searchMode === "query") {
        const trimmedQuery = queryText.trim();
        if (trimmedQuery.length < 2 || trimmedQuery.length > 180) {
          showToast.warning(t("medicalFacilities.mapModal.queryLengthError"));
          return null;
        }
        if (scopeMode === "location" && locationObj) {
          return {
            query: trimmedQuery,
            location: locationObj,
            radiusKm: parsedRadius,
            ...optionalPlaceType,
          };
        }
        if (scopeMode === "area" && area.trim()) {
          return {
            query: trimmedQuery,
            area: area.trim(),
            ...optionalPlaceType,
          };
        }
        return { query: trimmedQuery, ...optionalPlaceType };
      }

      if (scopeMode === "location" && locationObj) {
        return {
          specialtyCode,
          location: locationObj,
          radiusKm: parsedRadius,
          ...optionalPlaceType,
        };
      }
      if (!area.trim()) {
        showToast.warning(t("medicalFacilities.mapModal.areaLengthError"));
        return null;
      }
      return {
        specialtyCode,
        area: area.trim(),
        ...optionalPlaceType,
      };
    };

  const handleRunSearch = async () => {
    if (busy) return;
    const req = buildSearchRequest();
    if (!req) return;
    await onSearch(req);
  };

  const handleSelectCandidate = async (
    candidate: FeTypes.FacilityDirectoryMapCandidate,
  ) => {
    if (busy) return;
    setCreatingPlaceId(candidate.placeId);
    try {
      await onCreateFromCandidate(candidate);
    } finally {
      setCreatingPlaceId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MapPin className="text-brand" size={22} />
              {t("medicalFacilities.mapModal.title")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("medicalFacilities.mapModal.subtitle")}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm">
          {/* Selector Mode Switch */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setSearchMode("query")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                searchMode === "query"
                  ? "bg-slate-900 text-white dark:bg-brand dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {t("medicalFacilities.mapModal.modeQuery")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSearchMode("specialty");
                if (scopeMode === "none") setScopeMode("area");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                searchMode === "specialty"
                  ? "bg-slate-900 text-white dark:bg-brand dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {t("medicalFacilities.mapModal.modeSpecialty")}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {searchMode === "query" ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("medicalFacilities.mapModal.queryLabel")} *
                </label>
                <input
                  type="text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  disabled={busy}
                  placeholder={t("medicalFacilities.mapModal.queryPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("medicalFacilities.mapModal.specialtyLabel")} *
                </label>
                <select
                  value={specialtyCode}
                  onChange={(e) => setSpecialtyCode(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                >
                  <option value="">{t("common.select", "Select...")}</option>
                  {activeSpecialties.map((sp) => (
                    <option key={sp.code} value={sp.code}>
                      {sp.nameVi} ({sp.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.mapModal.placeTypeLabel")}
              </label>
              <select
                value={placeType}
                onChange={(e) =>
                  setPlaceType(
                    e.target.value as FeTypes.GooglePlaceTypeFilter | "",
                  )
                }
                disabled={busy}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              >
                <option value="">
                  {t("medicalFacilities.mapModal.allPlaceTypes")}
                </option>
                {GOOGLE_PLACE_TYPE_OPTIONS.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scope Filter */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {t("medicalFacilities.mapModal.scopeLabel")}:
              </span>
              {searchMode === "query" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setScopeMode("none")}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    scopeMode === "none"
                      ? "bg-brand text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t("medicalFacilities.mapModal.scopeNone")}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setScopeMode("area")}
                className={`px-2.5 py-1 rounded-lg font-semibold ${
                  scopeMode === "area"
                    ? "bg-brand text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {t("medicalFacilities.mapModal.scopeArea")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setScopeMode("location")}
                className={`px-2.5 py-1 rounded-lg font-semibold ${
                  scopeMode === "location"
                    ? "bg-brand text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {t("medicalFacilities.mapModal.scopeLocation")}
              </button>
            </div>

            {scopeMode === "area" && (
              <div>
                <input
                  list="map-hcmc-districts"
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  disabled={busy}
                  placeholder={t("medicalFacilities.mapModal.areaPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                />
                <datalist id="map-hcmc-districts">
                  {HCMC_DISTRICT_OPTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            )}

            {scopeMode === "location" && (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  disabled={busy}
                  placeholder="Lat (10.7769)"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
                />
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  disabled={busy}
                  placeholder="Lng (106.7009)"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  disabled={busy}
                  placeholder="Radius km"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRunSearch()}
                className="px-4 py-2 rounded-xl bg-brand text-slate-900 font-bold text-xs shadow-sm hover:bg-brand/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Search size={14} />
                {isSearching
                  ? t("medicalFacilities.searching")
                  : t("medicalFacilities.mapModal.searchButton")}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRunSearch()}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold flex items-center gap-1 hover:bg-rose-700 disabled:opacity-50 shrink-0"
              >
                <RefreshCw size={12} />
                {t("common.retry", "Retry")}
              </button>
            </div>
          )}

          {/* Results */}
          {isSearching ? (
            <div className="space-y-2.5">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : candidates.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {t("medicalFacilities.mapModal.resultsCount", {
                    count: candidates.length,
                  })}
                </span>
                <Badge variant="outline" className="text-[11px]">
                  Attribution: Google Maps
                </Badge>
              </div>
              {candidates.map((item) => (
                <div
                  key={item.placeId}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {item.name || item.placeId}
                      </span>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none text-[10px]">
                        {t("medicalFacilities.notVerifiedInternally")}
                      </Badge>
                    </div>
                    {item.address && (
                      <div className="text-slate-600 dark:text-slate-300">
                        {item.address}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono">Place ID: {item.placeId}</span>
                      <span>Attribution: {item.attribution}</span>
                      {item.mapsUrl && (
                        <a
                          href={item.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          <ExternalLink size={11} />
                          {t("medicalFacilities.openGoogleMaps")}
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSelectCandidate(item)}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    {creatingPlaceId === item.placeId
                      ? t("medicalFacilities.saving")
                      : t("medicalFacilities.mapModal.createDraftButton")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {t("medicalFacilities.mapModal.emptyHint")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

