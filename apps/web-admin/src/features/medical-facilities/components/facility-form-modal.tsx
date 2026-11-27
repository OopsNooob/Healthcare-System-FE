import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  GitBranchPlus,
  Link2,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { showToast } from "@repo/ui/components/ui/toasts";
import type { FeTypes } from "@/lib/api";
import {
  DIRECTORY_FACILITY_TYPES,
  HCMC_DISTRICT_OPTIONS,
  getDisplayFacilityDetails,
} from "../services/medical-facilities.service";

interface FacilityFormModalProps {
  isOpen: boolean;
  facility: FeTypes.FacilityDirectoryAdminRecord | null;
  providerPreview?: FeTypes.FacilityDirectoryMapPreview | null;
  specialties: FeTypes.FacilityDirectoryAdminSpecialty[];
  isSubmitting?: boolean;
  isFetchingPreview?: boolean;
  onClose: () => void;
  onSaveDraft: (payload: {
    facilityId?: string;
    revisionId?: string;
    expectedRevision?: number;
    details: FeTypes.FacilityDirectoryDraftDetailsRequest;
  }) => Promise<void>;
  onCreateRevision?: (
    facility: FeTypes.FacilityDirectoryAdminRecord,
  ) => Promise<void>;
  onFetchFreshPreview?: (facilityId: string) => Promise<void>;
  onLinkPlaceId?: (
    facility: FeTypes.FacilityDirectoryAdminRecord,
    placeId: string,
  ) => Promise<void>;
}

function isValidPublicHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === "https:" &&
      Boolean(host) &&
      !parsed.username &&
      !parsed.password &&
      host !== "localhost" &&
      !host.endsWith(".localhost") &&
      !host.endsWith(".local") &&
      !host.endsWith(".internal")
    );
  } catch {
    return false;
  }
}

export function FacilityFormModal({
  isOpen,
  facility,
  providerPreview,
  specialties,
  isSubmitting = false,
  isFetchingPreview = false,
  onClose,
  onSaveDraft,
  onCreateRevision,
  onFetchFreshPreview,
  onLinkPlaceId,
}: FacilityFormModalProps) {
  const { t } = useTranslation();
  const initialDetails = facility
    ? getDisplayFacilityDetails(facility)
    : undefined;

  const isCreate = !facility;
  const isVerifiedWithoutDraft =
    Boolean(facility) &&
    facility?.status === "verified" &&
    !facility?.draftRevisionId;
  const isRetired = facility?.status === "retired";
  const isFormReadOnly = isVerifiedWithoutDraft || isRetired;

  const [name, setName] = useState(initialDetails?.name ?? "");
  const [facilityType, setFacilityType] = useState<
    FeTypes.DirectoryFacilityType | ""
  >(initialDetails?.facilityType ?? "clinic");
  const [street, setStreet] = useState(initialDetails?.address?.street ?? "");
  const [ward, setWard] = useState(initialDetails?.address?.ward ?? "");
  const [district, setDistrict] = useState(
    initialDetails?.address?.district ?? "",
  );
  const [province, setProvince] = useState(
    initialDetails?.address?.province ?? "Thành phố Hồ Chí Minh",
  );
  const [longitude, setLongitude] = useState(
    initialDetails?.location?.coordinates?.[0] !== undefined
      ? String(initialDetails.location.coordinates[0])
      : "",
  );
  const [latitude, setLatitude] = useState(
    initialDetails?.location?.coordinates?.[1] !== undefined
      ? String(initialDetails.location.coordinates[1])
      : "",
  );
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    initialDetails?.specialtyCodes ?? [],
  );
  const [servicesInput, setServicesInput] = useState(
    initialDetails?.services?.join(", ") ?? "",
  );
  const [phone, setPhone] = useState(initialDetails?.contact?.phone ?? "");
  const [website, setWebsite] = useState(
    initialDetails?.contact?.website ?? "",
  );
  const [bookingUrl, setBookingUrl] = useState(
    initialDetails?.contact?.bookingUrl ?? "",
  );
  const [officialSourceUrl, setOfficialSourceUrl] = useState(
    initialDetails?.officialSourceUrl ?? "",
  );
  const [placeIdInput, setPlaceIdInput] = useState("");

  if (!isOpen) return null;

  const busy = isSubmitting || isFetchingPreview;

  const activeSpecialties = specialties.filter((s) => s.status === "active");
  const specialtyCodeSet = new Set(activeSpecialties.map((s) => s.code));
  const extraSelectedCodes = selectedSpecialties.filter(
    (code) => !specialtyCodeSet.has(code),
  );

  const toggleSpecialty = (code: string) => {
    if (isFormReadOnly || busy) return;
    setSelectedSpecialties((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    );
  };

  const handleSubmit = async () => {
    if (busy || isFormReadOnly) return;

    const trimmedName = name.trim();
    if (trimmedName && (trimmedName.length < 2 || trimmedName.length > 180)) {
      showToast.warning(t("medicalFacilities.formModal.nameLengthError"));
      return;
    }

    const latStr = latitude.trim();
    const lngStr = longitude.trim();
    let locationPayload: FeTypes.FacilityDirectoryLocationRequest | undefined;
    if (latStr || lngStr) {
      const parsedLat = Number(latStr);
      const parsedLng = Number(lngStr);
      if (
        !latStr ||
        !lngStr ||
        !Number.isFinite(parsedLat) ||
        !Number.isFinite(parsedLng) ||
        parsedLat < -90 ||
        parsedLat > 90 ||
        parsedLng < -180 ||
        parsedLng > 180
      ) {
        showToast.warning(t("medicalFacilities.formModal.coordinatesInvalid"));
        return;
      }
      locationPayload = { longitude: parsedLng, latitude: parsedLat };
    }

    const trimmedSource = officialSourceUrl.trim();
    if (trimmedSource && !isValidPublicHttpsUrl(trimmedSource)) {
      showToast.warning(t("medicalFacilities.formModal.sourceHttpsError"));
      return;
    }
    const trimmedWebsite = website.trim();
    if (trimmedWebsite && !isValidPublicHttpsUrl(trimmedWebsite)) {
      showToast.warning(t("medicalFacilities.formModal.websiteHttpsError"));
      return;
    }
    const trimmedBooking = bookingUrl.trim();
    if (trimmedBooking && !isValidPublicHttpsUrl(trimmedBooking)) {
      showToast.warning(t("medicalFacilities.formModal.bookingHttpsError"));
      return;
    }

    const contactPayload: FeTypes.FacilityDirectoryContact = {};
    if (phone.trim()) contactPayload.phone = phone.trim();
    if (trimmedWebsite) contactPayload.website = trimmedWebsite;
    if (trimmedBooking) contactPayload.bookingUrl = trimmedBooking;

    const trimmedProvince = province.trim();
    const hasAddressDetails = Boolean(
      street.trim() || ward.trim() || district.trim() || trimmedProvince,
    );
    const addressPayload = hasAddressDetails
      ? {
          ...(street.trim() ? { street: street.trim() } : {}),
          ...(ward.trim() ? { ward: ward.trim() } : {}),
          ...(district.trim() ? { district: district.trim() } : {}),
          province: trimmedProvince || "Thành phố Hồ Chí Minh",
        }
      : undefined;

    const servicesList = servicesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const details: FeTypes.FacilityDirectoryDraftDetailsRequest = {
      ...(trimmedName ? { name: trimmedName } : {}),
      ...(facilityType ? { facilityType } : {}),
      ...(addressPayload ? { address: addressPayload } : {}),
      ...(locationPayload ? { location: locationPayload } : {}),
      ...(selectedSpecialties.length > 0
        ? { specialtyCodes: selectedSpecialties }
        : {}),
      ...(servicesList.length > 0 ? { services: servicesList } : {}),
      ...(Object.keys(contactPayload).length > 0
        ? { contact: contactPayload }
        : {}),
      ...(trimmedSource ? { officialSourceUrl: trimmedSource } : {}),
    };

    if (isCreate && Object.keys(details).length === 0) {
      showToast.warning(t("medicalFacilities.formModal.emptyDetailsError"));
      return;
    }

    await onSaveDraft({
      facilityId: facility?.id,
      revisionId: facility?.draftRevisionId,
      expectedRevision: facility?.revision,
      details,
    });
  };

  const handleLinkPlace = async () => {
    if (!facility || !onLinkPlaceId || busy) return;
    const trimmedPlace = placeIdInput.trim();
    if (trimmedPlace.length < 5 || trimmedPlace.length > 256) {
      showToast.warning(t("medicalFacilities.formModal.placeIdLengthError"));
      return;
    }
    await onLinkPlaceId(facility, trimmedPlace);
    setPlaceIdInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="text-brand" size={22} />
              {isCreate
                ? t("medicalFacilities.formModal.createTitle")
                : t("medicalFacilities.formModal.editTitle")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("medicalFacilities.formModal.desc")}
            </p>
            {facility && (
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <Badge
                  variant="outline"
                  className="text-[11px] uppercase border-slate-300 dark:border-slate-700"
                >
                  {t(`medicalFacilities.status.${facility.status}`)}
                </Badge>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  rev {facility.revision}
                </span>
                {facility.needsRecheck && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none text-[11px]">
                    {t("medicalFacilities.needsRecheckBadge")}
                  </Badge>
                )}
                {facility.googlePlaceId && (
                  <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                    Place ID: {facility.googlePlaceId}
                  </span>
                )}
              </div>
            )}
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

        {/* Body */}
        <div className="space-y-4 py-4 text-sm">
          {/* Verified facility without open draft revision banner */}
          {isVerifiedWithoutDraft && facility && (
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  {t("medicalFacilities.formModal.verifiedReadOnlyNotice")}
                </span>
              </div>
              {onCreateRevision && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onCreateRevision(facility)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <GitBranchPlus size={14} />
                  {t("medicalFacilities.createRevision")}
                </button>
              )}
            </div>
          )}

          {/* Transient Google Places Preview (never auto-copied to form inputs) */}
          {facility?.googlePlaceId && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3.5 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <MapPin size={15} className="text-rose-500 shrink-0" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {t("medicalFacilities.formModal.providerPreviewTitle")}
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none text-[10px]">
                    {t("medicalFacilities.googleNeedsCheckLabel")}
                  </Badge>
                </div>
                {onFetchFreshPreview && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onFetchFreshPreview(facility.id)}
                    className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={12}
                      className={isFetchingPreview ? "animate-spin" : ""}
                    />
                    {t("medicalFacilities.formModal.refreshPreview")}
                  </button>
                )}
              </div>
              {providerPreview ? (
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  {providerPreview.name && (
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {providerPreview.name}
                    </div>
                  )}
                  {providerPreview.address && (
                    <div>{providerPreview.address}</div>
                  )}
                  {providerPreview.location && (
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      lat: {providerPreview.location.latitude}, lng:{" "}
                      {providerPreview.location.longitude}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t("medicalFacilities.formModal.attributionLabel")}:{" "}
                      {providerPreview.attribution}
                    </span>
                    {providerPreview.mapsUrl && (
                      <a
                        href={providerPreview.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        <ExternalLink size={12} />
                        {t("medicalFacilities.openGoogleMaps")}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 dark:text-slate-400">
                  {t("medicalFacilities.formModal.previewNotLoadedHint")}
                </div>
              )}
            </div>
          )}

          {/* First-time Google Place ID Link (when facility has no googlePlaceId & not retired) */}
          {facility &&
            !facility.googlePlaceId &&
            !isRetired &&
            onLinkPlaceId && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Link2 size={14} className="text-indigo-500" />
                  {t("medicalFacilities.formModal.linkPlaceTitle")}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={placeIdInput}
                    onChange={(e) => setPlaceIdInput(e.target.value)}
                    disabled={busy}
                    placeholder="ChIJxxxxxxxxxxxxxxxx"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    disabled={busy || placeIdInput.trim().length < 5}
                    onClick={() => void handleLinkPlace()}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                  >
                    {t("medicalFacilities.formModal.linkPlaceButton")}
                  </button>
                </div>
              </div>
            )}

          {/* Name & Facility Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isFormReadOnly || busy}
                placeholder={t("medicalFacilities.formModal.namePlaceholder")}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.facilityType")}
              </label>
              <select
                value={facilityType}
                onChange={(e) =>
                  setFacilityType(
                    e.target.value as FeTypes.DirectoryFacilityType | "",
                  )
                }
                disabled={isFormReadOnly || busy}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              >
                <option value="">{t("common.select", "Select...")}</option>
                {DIRECTORY_FACILITY_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {t(`medicalFacilities.facilityTypes.${ft}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* HCMC Address */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t("medicalFacilities.formModal.hcmcAddressSection")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t("medicalFacilities.formModal.street")}
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  disabled={isFormReadOnly || busy}
                  placeholder={t("medicalFacilities.formModal.streetPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t("medicalFacilities.formModal.ward")}
                </label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  disabled={isFormReadOnly || busy}
                  placeholder={t("medicalFacilities.formModal.wardPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t("medicalFacilities.formModal.district")}
                </label>
                <input
                  list="hcmc-district-list"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={isFormReadOnly || busy}
                  placeholder={t("medicalFacilities.formModal.districtPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
                />
                <datalist id="hcmc-district-list">
                  {HCMC_DISTRICT_OPTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t("medicalFacilities.formModal.province")}
                </label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  disabled={isFormReadOnly || busy}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* GeoJSON coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.latitude")} (-90..90)
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                disabled={isFormReadOnly || busy}
                placeholder="10.7769"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.longitude")} (-180..180)
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                disabled={isFormReadOnly || busy}
                placeholder="106.7009"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              />
            </div>
          </div>

          {/* Active Specialties Multi-select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("medicalFacilities.formModal.specialtiesLabel")}
            </label>
            {activeSpecialties.length === 0 ? (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                {t("medicalFacilities.formModal.noActiveSpecialtiesHint")}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeSpecialties.map((sp) => {
                  const selected = selectedSpecialties.includes(sp.code);
                  return (
                    <button
                      key={sp.code}
                      type="button"
                      disabled={isFormReadOnly || busy}
                      onClick={() => toggleSpecialty(sp.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-60 ${
                        selected
                          ? "bg-brand text-slate-900 border-brand"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {sp.nameVi} ({sp.code})
                    </button>
                  );
                })}
                {extraSelectedCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={isFormReadOnly || busy}
                    onClick={() => toggleSpecialty(code)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                  >
                    {code} ({t("medicalFacilities.retired")})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.formModal.servicesLabel")}
            </label>
            <input
              type="text"
              value={servicesInput}
              onChange={(e) => setServicesInput(e.target.value)}
              disabled={isFormReadOnly || busy}
              placeholder={t("medicalFacilities.formModal.servicesPlaceholder")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
            />
          </div>

          {/* Contact & Official Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.contactPhone")}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isFormReadOnly || busy}
                placeholder={t("medicalFacilities.formModal.phonePlaceholder")}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.websiteLabel")}
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isFormReadOnly || busy}
                placeholder="https://hospital.example.vn"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.bookingUrlLabel")}
              </label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                disabled={isFormReadOnly || busy}
                placeholder="https://booking.hospital.example.vn"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.officialSourceLabel")}
              </label>
              <input
                type="url"
                value={officialSourceUrl}
                onChange={(e) => setOfficialSourceUrl(e.target.value)}
                disabled={isFormReadOnly || busy}
                placeholder="https://medinet.hochiminhcity.gov.vn/..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t("medicalFacilities.formModal.verifyRequirementsHint")}
          </p>

          {/* Duplicate decisions history */}
          {facility?.duplicateDecisions &&
            facility.duplicateDecisions.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-3.5 text-xs space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {t("medicalFacilities.formModal.duplicateHistoryTitle", {
                    count: facility.duplicateDecisions.length,
                  })}
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {facility.duplicateDecisions.map((d) => (
                    <div
                      key={`${d.candidateFacilityId}-${d.reviewedAt}`}
                      className="text-slate-600 dark:text-slate-300 border-l-2 border-emerald-400 pl-2"
                    >
                      <span className="font-mono text-[11px]">
                        {d.candidateFacilityId}
                      </span>
                      : {d.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          {!isFormReadOnly && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSubmit()}
              className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold text-xs shadow-sm hover:bg-brand/90 disabled:opacity-50"
            >
              {isSubmitting
                ? t("medicalFacilities.saving")
                : t("medicalFacilities.formModal.save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
