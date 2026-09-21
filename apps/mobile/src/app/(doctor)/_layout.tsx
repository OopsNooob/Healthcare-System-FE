import { Tabs } from "expo-router";
import { Home, Calendar, User, Stethoscope } from "lucide-react-native";
import { useTranslation } from 'react-i18next';

export default function DoctorLayout() {
  const { t } = useTranslation();
  
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#2563eb" }}>
      <Tabs.Screen name="index" options={{ title: t('mobile.overview', "Overview"), tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} />
      <Tabs.Screen name="schedule" options={{ title: t('mobile.my_schedule', "Schedule"), tabBarIcon: ({ color }) => <Calendar color={color} size={24} /> }} />
      <Tabs.Screen name="consultations" options={{ title: t('mobile.consultations', "Consultations"), tabBarIcon: ({ color }) => <Stethoscope color={color} size={24} /> }} />
      <Tabs.Screen name="chat" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: t('mobile.profile', "Profile"), tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
      
      {/* Hide video-call, incoming-call and notifications from tabs */}
      <Tabs.Screen name="video-call" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="incoming-call" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
