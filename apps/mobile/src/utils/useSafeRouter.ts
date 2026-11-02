import { useRouter } from 'expo-router';
import { useRef, useCallback, useMemo } from 'react';

export function useSafeRouter() {
  const router = useRouter();
  const isNavigating = useRef(false);

  const push = useCallback((href: Parameters<typeof router.push>[0], options?: any) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push(href as any, options);
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  }, [router]);

  const replace = useCallback((href: Parameters<typeof router.replace>[0], options?: any) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.replace(href as any, options);
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  }, [router]);
  
  const back = useCallback((fallbackHref?: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackHref) {
      router.replace(fallbackHref as any);
    } else {
      router.back();
    }
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  }, [router]);

  return useMemo(() => ({
    ...router,
    push,
    replace,
    back
  }), [router, push, replace, back]);
}
