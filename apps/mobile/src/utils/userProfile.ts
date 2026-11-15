import { mobileApi, type FeTypes } from '@repo/shared-hooks';
import type { VerificationDocument } from '@/components/modals/DocUploadModal';

export interface UserAddressFields {
  street: string;
  ward: string;
  district: string;
  city: string;
  country: string;
}

export type NormalizedGender = 'male' | 'female' | 'other' | '';

export interface NormalizedUserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  gender: NormalizedGender;
  dateOfBirth: string;
  avatarUrl: string;
  avatarPublicId: string;
  isOnline: boolean;
  role: string;
  accountStatus: string;
  address: UserAddressFields;
  doctorProfile?: {
    specialty: string;
    workplace: string;
    experienceYears: string;
    verificationStatus: string;
    verificationDocuments: string[];
    averageRating: number;
    totalReviews: number;
  };
}

export function extractUserProfileData(raw: unknown): NormalizedUserProfile {
  const root = (raw ?? {}) as Record<string, unknown>;
  const data =
    root.data &&
    typeof root.data === 'object' &&
    ('_id' in (root.data as object) ||
      'id' in (root.data as object) ||
      'email' in (root.data as object) ||
      'fullName' in (root.data as object))
      ? (root.data as Record<string, unknown>)
      : root;

  const addr = (data.address ?? {}) as Record<string, unknown>;
  const doc = (data.doctorProfile ?? null) as Record<string, unknown> | null;

  return {
    id: String(data._id ?? data.id ?? ''),
    email: String(data.email ?? ''),
    fullName: String(data.fullName ?? ''),
    phoneNumber: String(data.phoneNumber ?? ''),
    gender: normalizeGenderValue(typeof data.gender === 'string' ? data.gender : ''),
    dateOfBirth: formatDateInput(typeof data.dateOfBirth === 'string' ? data.dateOfBirth : ''),
    avatarUrl: String(data.avatarUrl ?? ''),
    avatarPublicId: String(data.avatarPublicId ?? ''),
    isOnline: Boolean(data.isOnline),
    role: String(data.role ?? ''),
    accountStatus: String(data.accountStatus ?? 'active'),
    address: {
      street: String(addr.street ?? ''),
      ward: String(addr.ward ?? ''),
      district: String(addr.district ?? ''),
      city: String(addr.city ?? ''),
      country: String(addr.country ?? ''),
    },
    ...(doc
      ? {
          doctorProfile: {
            specialty: String(doc.specialty ?? ''),
            workplace: String(doc.workplace ?? ''),
            experienceYears:
              doc.experienceYears !== undefined && doc.experienceYears !== null
                ? String(doc.experienceYears)
                : '',
            verificationStatus: String(doc.verificationStatus ?? 'pending'),
            verificationDocuments: Array.isArray(doc.verificationDocuments)
              ? doc.verificationDocuments.filter((v): v is string => typeof v === 'string' && v.length > 0)
              : [],
            averageRating: typeof doc.averageRating === 'number' ? doc.averageRating : 0,
            totalReviews: typeof doc.totalReviews === 'number' ? doc.totalReviews : 0,
          },
        }
      : {}),
  };
}

export function normalizeGenderValue(value?: string | null): NormalizedGender {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'male' || normalized === 'nam') return 'male';
  if (normalized === 'female' || normalized === 'nữ' || normalized === 'nu') return 'female';
  if (normalized === 'other' || normalized === 'khác' || normalized === 'khac') return 'other';
  return '';
}

export function formatDateInput(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function formatAddressSummary(address: UserAddressFields): string {
  return [address.street, address.ward, address.district, address.city, address.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

export function buildAvatarUploadBinary(uri: string): FeTypes.UploadBinary {
  const cleanName = uri.split('/').pop()?.split('?')[0] || `avatar_${Date.now()}.jpg`;
  const lower = cleanName.toLowerCase();
  const type = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return {
    uri,
    name: lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? cleanName : `${cleanName}.jpg`,
    type,
  } as unknown as FeTypes.UploadBinary;
}

export async function uploadAndPersistUserAvatar(params: {
  uri: string;
  previousPublicId?: string;
}): Promise<{ avatarUrl: string; avatarPublicId: string }> {
  const { uri, previousPublicId } = params;
  const uploadRes = await mobileApi.uploadUploadAvatar({
    file: buildAvatarUploadBinary(uri),
  });
  const firstFile = uploadRes?.data?.files?.[0];
  const avatarUrl = firstFile?.secureUrl ?? firstFile?.url ?? '';
  const avatarPublicId = firstFile?.publicId ?? '';

  if (!avatarUrl) {
    throw new Error('Avatar upload returned empty URL');
  }

  await mobileApi.usersUpdateMe({
    avatarUrl,
    ...(avatarPublicId ? { avatarPublicId } : {}),
  });

  if (previousPublicId && previousPublicId !== avatarPublicId) {
    mobileApi
      .uploadDeleteFile({
        query: { publicId: previousPublicId },
        body: { fileType: 'image' },
      })
      .catch(() => {});
  }

  return { avatarUrl, avatarPublicId };
}

export function mapVerificationUrlsToDocs(
  urls: string[],
  verificationStatus?: string
): VerificationDocument[] {
  const docStatus: 'verified' | 'pending' =
    verificationStatus === 'verified' ? 'verified' : 'pending';

  return urls.map((url, idx) => {
    const rawSegment = url.split('/').pop()?.split('?')[0] || `document-${idx + 1}.pdf`;
    let decodedName = rawSegment;
    try {
      decodedName = decodeURIComponent(rawSegment);
    } catch {
      decodedName = rawSegment;
    }
    return {
      id: `remote_${idx}_${decodedName}`,
      type: idx === 0 ? 'license' : idx === 1 ? 'degree' : 'id_card',
      title: decodedName,
      fileName: decodedName,
      fileSize: '',
      status: docStatus,
      uploadDate: '',
      uri: url,
      remoteUrl: url,
    };
  });
}

