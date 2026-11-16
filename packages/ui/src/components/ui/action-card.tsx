import { type ReactNode, useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

export type ActionCardItem = {
  id: string;
  title: string;
  icon: ReactNode;
  iconColor?: string;
  disabled?: boolean;
  onHandle: () => void;
};

interface ActionCardProps {
  actions?: ActionCardItem[];
  className?: string;
  onClickOutside?: () => void;
  anchorRect?: DOMRect | null;
}

export function ActionCard({
  actions = [],
  className = "",
  onClickOutside,
  anchorRect = null,
}: ActionCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!cardRef.current) return;
      const target = event.target as Node | null;
      if (target && !cardRef.current.contains(target)) {
        onClickOutside?.();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClickOutside]);

  const style = useMemo<CSSProperties | undefined>(() => {
    if (!anchorRect) {
      return undefined;
    }

    const minCardWidth = 220;
    const viewportPadding = 8;
    const estimatedHeight = Math.min(actions.length * 40 + 12, 280);
    const spaceBelow = window.innerHeight - anchorRect.bottom - viewportPadding;
    const spaceAbove = anchorRect.top - viewportPadding;
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const right = Math.max(
      viewportPadding,
      Math.min(
        window.innerWidth - anchorRect.right,
        window.innerWidth - minCardWidth - viewportPadding,
      ),
    );

    if (openUpward) {
      return {
        position: "fixed",
        top: "auto",
        bottom: Math.max(viewportPadding, window.innerHeight - anchorRect.top + 6),
        right,
        zIndex: 9999,
      };
    }

    return {
      position: "fixed",
      top: Math.max(viewportPadding, anchorRect.bottom + 8),
      bottom: "auto",
      right,
      zIndex: 9999,
    };
  }, [actions.length, anchorRect]);

  if (actions.length === 0) {
    return null;
  }

  const card = (
    <div
      ref={cardRef}
      data-actions-root="true"
      style={style}
      className={`${anchorRect ? "" : "right-0 top-8 "}z-50 w-max min-w-[220px] max-w-[300px] max-h-[280px] overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-xl ${className}`}
    >
      <ul>
        {actions.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={item.disabled ? undefined : item.onHandle}
              disabled={item.disabled}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 ${item.iconColor ?? "text-slate-600 dark:text-slate-300"}`}
              >
                {item.icon}
              </span>
              <span
                className={`whitespace-nowrap ${item.iconColor ?? "text-slate-700 dark:text-slate-200"}`}
              >
                {item.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  if (anchorRect) {
    return createPortal(card, document.body);
  }

  return card;
}
