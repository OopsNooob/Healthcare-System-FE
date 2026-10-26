import { Clock, Dot, MessageCircleIcon } from "lucide-react";

interface HistoryCardProps {
  title: string;
  createdAt: Date;
  isCurrent?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function HistoryCard({
  title,
  isCurrent = false,
  isSelected = false,
  onClick,
}: HistoryCardProps) {

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors cursor-pointer ${
        isSelected
          ? "border-brand/35 bg-brand-light/50"
          : "border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center ${
          isSelected ? "text-brand" : "text-slate-400"
        }`}
      >
        {isCurrent ? (
          <MessageCircleIcon className="h-4 w-4 text-brand" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-base font-semibold ${
            isSelected ? "text-brand" : "text-slate-600"
          }`}
          title={title}
        >
          {title}
        </p>
        {/* <p
          className={`mt-0.5 text-sm ${isSelected ? "text-brand/70" : "text-slate-400"}`}
        >
          {displayTime}
        </p> */}
      </div>

      {isCurrent ? <Dot className="h-6 w-6 shrink-0 text-brand" /> : null}
    </button>
  );
}
