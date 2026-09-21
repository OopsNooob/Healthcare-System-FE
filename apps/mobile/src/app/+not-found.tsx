import { useTranslation } from 'react-i18next';
import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { tw } from '../tw';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={tw("flex-1 items-center justify-center p-5 bg-white dark:bg-zinc-900")}>
        <Text style={tw("text-xl font-bold dark:text-white")}>{t('mobile.this_screen_doesnt_exist', `This screen doesn't exist.`)}</Text>
        <Link href="/" style={tw("mt-4 py-4")}>
          <Text style={tw("text-blue-500")}>{t('mobile.go_to_home_screen', `Go to home screen!`)}</Text>
        </Link>
      </View>
    </>
  );
}
