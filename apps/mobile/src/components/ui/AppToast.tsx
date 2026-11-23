import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast, {
  BaseToast,
  type BaseToastProps,
  type ToastConfig,
  type ToastShowParams,
} from 'react-native-toast-message';
import { useThemeContext } from '@/context/ThemeContext';

interface RecordedToast {
  params: ToastShowParams;
  shownAt: number;
  expiresAt: number;
}

type ToastMethodFn = ((params: ToastShowParams) => void) & { __bridgeInstalled?: boolean };
type ToastHideFn = ((params?: unknown) => void) & { __bridgeInstalled?: boolean };

const originalShow = Toast.show.bind(Toast);
const originalHide = Toast.hide.bind(Toast);
let lastToast: RecordedToast | null = null;
let bridgeInstalled = false;

/**
 * Installs a safe non-destructive wrapper around `Toast.show` / `Toast.hide` so we can hand off
 * recent confirmation toasts when a modal unmounts immediately after triggering a toast.
 */
function installModalToastBridge(): void {
  if (bridgeInstalled) return;
  bridgeInstalled = true;

  const showDesc = Object.getOwnPropertyDescriptor(Toast, 'show');
  if (!showDesc || showDesc.writable || showDesc.configurable) {
    const wrappedShow: ToastMethodFn = (params: ToastShowParams) => {
      const now = Date.now();
      const vis = params.visibilityTime ?? 4000;
      const captured: RecordedToast = {
        params,
        shownAt: now,
        expiresAt: now + vis,
      };
      lastToast = captured;
      originalShow({
        ...params,
        onHide: () => {
          if (lastToast === captured) {
            lastToast = null;
          }
          params.onHide?.();
        },
      });
    };
    wrappedShow.__bridgeInstalled = true;
    try {
      Toast.show = wrappedShow;
    } catch {
      // Fallback: if runtime freezes Toast.show, keep original behavior safely.
    }
  }

  const hideDesc = Object.getOwnPropertyDescriptor(Toast, 'hide');
  if (!hideDesc || hideDesc.writable || hideDesc.configurable) {
    const wrappedHide: ToastHideFn = (params?: unknown) => {
      lastToast = null;
      originalHide(params as Parameters<typeof originalHide>[0]);
    };
    wrappedHide.__bridgeInstalled = true;
    try {
      Toast.hide = wrappedHide;
    } catch {
      // Fallback safely.
    }
  }
}

installModalToastBridge();

function buildVariantToast(
  props: BaseToastProps,
  isDark: boolean,
  accentColor: string
): React.ReactElement {
  const containerStyle: ViewStyle = {
    borderLeftColor: accentColor,
    borderColor: isDark ? '#334155' : '#e2e8f0',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderWidth: 1,
    borderLeftWidth: 5,
    borderRadius: 14,
    height: undefined,
    minHeight: 58,
    width: '92%',
    paddingVertical: 10,
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: isDark ? 0.45 : 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  };

  const contentStyle: ViewStyle = {
    paddingHorizontal: 14,
    paddingVertical: 2,
  };

  const titleStyle: TextStyle = {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#f8fafc' : '#0f172a',
    lineHeight: 20,
    marginBottom: 2,
  };

  const bodyStyle: TextStyle = {
    fontSize: 13,
    fontWeight: '500',
    color: isDark ? '#cbd5e1' : '#475569',
    lineHeight: 18,
  };

  return (
    <BaseToast
      {...props}
      style={[containerStyle, props.style]}
      contentContainerStyle={[contentStyle, props.contentContainerStyle]}
      text1Style={[titleStyle, props.text1Style]}
      text2Style={[bodyStyle, props.text2Style]}
      text1NumberOfLines={2}
      text2NumberOfLines={4}
    />
  );
}

/**
 * Shared light/dark multiline toast configuration for both Root and Modal toast hosts.
 */
export function createAppToastConfig(isDark: boolean): ToastConfig {
  return {
    success: (props) => buildVariantToast(props, isDark, '#10b981'),
    error: (props) => buildVariantToast(props, isDark, '#ef4444'),
    info: (props) => buildVariantToast(props, isDark, '#0ea5e9'),
  };
}

/**
 * Root toast host mounted once in `_layout.tsx`.
 */
export const AppToast: React.FC = () => {
  const { isDark } = useThemeContext();
  const insets = useSafeAreaInsets();
  const config = useMemo(() => createAppToastConfig(isDark), [isDark]);

  return <Toast config={config} topOffset={Math.max(insets.top + 8, 44)} />;
};

const ModalToastRunner: React.FC<{ isDark: boolean; topOffset: number }> = ({
  isDark,
  topOffset,
}) => {
  const mountedAtRef = useRef(Date.now());
  const config = useMemo(() => createAppToastConfig(isDark), [isDark]);

  useEffect(() => {
    const mountedAt = mountedAtRef.current;
    return () => {
      const pending = lastToast;
      if (!pending) return;
      const now = Date.now();
      const remaining = pending.expiresAt - now;
      if (
        pending.params.type !== 'error' &&
        pending.shownAt >= mountedAt &&
        now - pending.shownAt < 450 &&
        remaining > 300
      ) {
        lastToast = null;
        setTimeout(() => {
          originalShow({
            ...pending.params,
            visibilityTime: Math.max(1500, remaining),
          });
        }, 70);
      }
    };
  }, []);

  return <Toast config={config} topOffset={topOffset} />;
};

/**
 * Modal-scoped toast host. Mount inside any `<Modal>` where `Toast.show` may be called so that
 * native Android/iOS modal windows display toasts above their backdrop instead of dimmed behind it.
 */
export const AppModalToast: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  const { isDark } = useThemeContext();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const topOffset = Platform.OS === 'ios' ? Math.max(insets.top + 8, 16) : 16;
  return <ModalToastRunner isDark={isDark} topOffset={topOffset} />;
};

