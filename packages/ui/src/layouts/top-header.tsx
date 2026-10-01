import { Bell, CheckCheck, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemeLanguageToggle } from "../components/ThemeLanguageToggle";
import {
  NotificationDetailCard,
  type NotificationType,
  notificationTypeMap,
} from "../components/ui/noti-detail-card";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time?: string;
  createdAt: string;
  read: boolean;
  type: NotificationType;
  primaryActionLabel?: string;
};

type TopHeaderProps = {
  notifications?: NotificationItem[];
  unreadCount?: number;
  isLoading?: boolean;
  error?: string | null;
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPrimaryAction?: (id: string) => void;
};

function formatNotificationTime(createdAt?: string) {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function TopHeader({
  notifications = [],
  unreadCount,
  isLoading = false,
  error,
  onMarkAllAsRead,
  onMarkAsRead,
  onDelete,
  onPrimaryAction,
}: TopHeaderProps) {
  const { t } = useTranslation();
  const [notificationOpen, setNotificationOpen] = useState(false);

  const [showAllNoti, setShowAllNoti] = useState(false);

  const handleShowAllNoti = () => {
    setShowAllNoti((show) => !show);
  };

  const handleToggleNotificationDropdown = () => {
    setNotificationOpen((prev) => {
      const next = !prev;
      if (!next) {
        setShowAllNoti(false);
      }
      return next;
    });
  };

  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);

  const resolvedUnreadCount = useMemo(() => {
    if (typeof unreadCount === "number") return unreadCount;
    return notifications.filter((item) => !item.read).length;
  }, [notifications, unreadCount]);

  const selectedNotification = notifications.find(
    (item) => item.id === selectedNotificationId,
  );

  const handleOpenNotificationDetail = (id: string) => {
    onMarkAsRead?.(id);
    setSelectedNotificationId(id);
    setNotificationOpen(false);
    setShowAllNoti(false);
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 shadow-sm border-b border-transparent dark:border-slate-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h3 className="text-xlg font-semibold text-gray-800">
          {/* {roleNames[role as keyof typeof roleNames]} */}
        </h3>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder={t('topHeader.searchPlaceholder', 'Tìm kiếm...')}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#84cc16] w-64"
          />
        </div>

        {/* Theme & Language Toggle */}
        <ThemeLanguageToggle />

        {/* Notification */}
        <div className="relative">
          <button
            type="button"
            onClick={handleToggleNotificationDropdown}
            className="relative flex items-center justify-center text-[#6B7280] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {resolvedUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 text-center font-semibold">
                {resolvedUnreadCount > 9 ? "9+" : resolvedUnreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-12 w-80 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {t("topHeader.notifications")}
                </p>
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="inline-flex items-center gap-1 text-sm text-[#3B7BF8] hover:opacity-80"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t("topHeader.markAsRead")}
                </button>
              </div>

              {error && (
                <div className="px-4 py-2 text-xs text-rose-600">{error}</div>
              )}

              {isLoading && (
                <div className="px-4 py-2 text-xs text-slate-500">
                  {t("topHeader.loadingNotifications")}
                </div>
              )}

              <ul
                className={`py-1 ${showAllNoti ? "max-h-[36rem] overflow-y-auto" : ""}`}
              >
                {(showAllNoti ? notifications : notifications.slice(0, 5)).map(
                  (item) => {
                    const currentType = notificationTypeMap[item.type];
                    const ItemIcon = currentType.icon;
                    const displayTime =
                      item.time || formatNotificationTime(item.createdAt);

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenNotificationDetail(item.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${item.read ? "bg-white dark:bg-slate-900" : "bg-[#F9FAFB] dark:bg-slate-800/50"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative mt-0.5">
                              <div
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${currentType.iconBg}`}
                              >
                                <ItemIcon
                                  className={`h-4.5 w-4.5 ${currentType.iconColor}`}
                                />
                              </div>
                              {!item.read && (
                                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {item.message}
                              </p>
                              {displayTime && (
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {displayTime}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>

              <div className="border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleShowAllNoti}
                  className="w-full py-3 text-sm text-center text-[#3B7BF8] font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors rounded-b-xl"
                >
                  {showAllNoti ? t("topHeader.showLess") : t("topHeader.viewAllNotifications")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedNotification && (
        <NotificationDetailCard
          id={selectedNotification.id}
          title={selectedNotification.title}
          message={selectedNotification.message}
          isRead={selectedNotification.read}
          createdAt={selectedNotification.createdAt}
          type={selectedNotification.type}
          isOpen={true}
          onClose={() => setSelectedNotificationId(null)}
          onDismiss={() => {
            onDelete?.(selectedNotification.id);
            setSelectedNotificationId(null);
          }}
          onPrimaryAction={() => {
            onPrimaryAction?.(selectedNotification.id);
            setSelectedNotificationId(null);
          }}
          primaryActionLabel={selectedNotification.primaryActionLabel}
        />
      )}
    </header>
  );
}
// @ts-nocheck
