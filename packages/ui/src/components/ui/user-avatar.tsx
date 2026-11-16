import { useState } from "react";

interface UserAvatarProps {
  name: string;
  url?: string;
  isOnline?: boolean;
  avtStyle?: string;
}

function getAvatarColor(seed: string) {
  const palette = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  const safeSeed = seed?.trim() || "U";
  const index = safeSeed.charCodeAt(0) % palette.length;
  return palette[index];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserAvatar({
  name,
  url,
  isOnline = false,
  avtStyle,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const showImage = Boolean(url) && !imageError;
  const safeName = name?.trim() || "Unknown user";

  return (
    <div className="inline-flex items-center">
      <div className="relative inline-flex">
        {showImage ? (
          <img
            src={url}
            alt={safeName}
            onError={() => setImageError(true)}
            className={`h-12 w-12 rounded-2xl object-cover ${avtStyle ?? ""}`}
          />
        ) : (
          <div
            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white ${avtStyle ?? ""} ${getAvatarColor(name)}`}
          >
            {getInitials(safeName)}
          </div>
        )}

        <span
          className={`absolute -bottom-0.5 -right-0.5 inline-block h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
            isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
          aria-label={isOnline ? "online status" : "offline status"}
        />
      </div>
    </div>
  );
}
