import avatarA from "@/app/assets/banneravtars/Screenshot_2026-06-26_at_11.20.32_AM-removebg-preview.png";
import avatarB from "@/app/assets/banneravtars/Screenshot_2026-06-26_at_11.20.37_AM-removebg-preview.png";
import avatarC from "@/app/assets/banneravtars/Screenshot_2026-06-26_at_11.20.41_AM-removebg-preview.png";
import avatarD from "@/app/assets/banneravtars/Screenshot_2026-06-26_at_11.20.45_AM-removebg-preview.png";
import avatarE from "@/app/assets/banneravtars/Screenshot_2026-06-26_at_11.20.48_AM-removebg-preview.png";
import scheduleAvatar from "@/app/assets/banneravtars/schedule.png";
import trackingAvatar from "@/app/assets/banneravtars/tracking.png";
import ownerExecutive from "@/app/assets/ownerbanner/4d847ac5-9a47-42a3-a453-e1cceb684a04_removalai_preview.png";
import ownerFinance from "@/app/assets/ownerbanner/73ed3e09-5916-4795-a069-f3cb30fb0e30_removalai_preview.png";
import ownerDispatch from "@/app/assets/ownerbanner/Screenshot_2026-06-26_at_1.12.29_PM-removebg-preview.png";
import ownerProcurement from "@/app/assets/ownerbanner/Screenshot_2026-06-26_at_1.12.41_PM-removebg-preview.png";
import ownerField from "@/app/assets/ownerbanner/Screenshot_2026-06-26_at_1.12.50_PM-removebg-preview.png";

/** Banner carousel 3D avatars from `src/app/assets/banneravtars`. */
export const DASHBOARD_AVATARS = {
  priyaSharma: avatarA,
  rajeshMehta: avatarB,
  anitaVerma: avatarC,
  vikramSingh: avatarD,
  sudarshanOwner: avatarE,
  kiranDesai: avatarA,
  arunNair: avatarB,
  schedule: scheduleAvatar,
  tracking: trackingAvatar,
} as const;

/** Owner dashboard banners from `src/app/assets/ownerbanner`. */
export const OWNER_BANNER_AVATARS = {
  executive: ownerExecutive,
  finance: ownerFinance,
  dispatch: ownerDispatch,
  procurement: ownerProcurement,
  field: ownerField,
} as const;

export const bannerAvatarSrc = (avatar: { src: string } | string) =>
  typeof avatar === "string" ? avatar : avatar.src;
