import type { UsersFindProfileResponse } from "@healthcare/api-client";
import { webAdminApi } from "@/lib/api";

export interface Profile {
  userInformation: UserInformation;
}

export type ApiUser = {
  id: string;
};

export type UserInformation = UsersFindProfileResponse;

export type ProfileReport = NonNullable<UsersFindProfileResponse["reports"]>[number];
export type DoctorReview = NonNullable<UsersFindProfileResponse["doctor_reviews"]>[number];
export type DoctorReviewMetrics = NonNullable<UsersFindProfileResponse["doctor_review_metrics"]>;
export type DoctorRoleSpecific = NonNullable<UsersFindProfileResponse["role_specific"]>;

export async function getProfile(payload: ApiUser): Promise<Profile> {
  const userInformation = await webAdminApi.usersFindProfile({
    params: { id: payload.id },
  });

  return {
    userInformation,
  };
}
