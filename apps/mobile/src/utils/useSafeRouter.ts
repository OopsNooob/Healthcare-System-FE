import { useRouter } from 'expo-router';
import { useRef } from 'react';

export function useSafeRouter() {
  const router = useRouter();
  const isNavigating = useRef(false);

  const push = (href: Parameters<typeof router.push>[0], options?: any) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push(href as any, options);
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  const replace = (href: Parameters<typeof router.replace>[0], options?: any) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.replace(href as any, options);
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };
  
  const back = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.back();
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  };

  return {
    ...router,
    push,
    replace,
    back
  };
}
