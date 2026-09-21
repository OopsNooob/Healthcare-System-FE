import { useTranslation } from 'react-i18next';
import { Redirect } from "expo-router";
import { useSharedAuthStore as useAuthStore } from "@repo/shared-hooks";
import { useEffect, useState } from "react";
import { View, Text } from 'react-native';
import { tw } from '../tw';

export default function Index() {
  const { t } = useTranslation();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <View style={tw("flex-1 items-center justify-center bg-white dark:bg-zinc-900")}>
        <Text style={tw("text-zinc-500")}>{t('mobile.loading', `Loading...`)}</Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === "doctor") {
    return <Redirect href="/(doctor)" />;
  }

  return <Redirect href="/(patient)" />;
}
