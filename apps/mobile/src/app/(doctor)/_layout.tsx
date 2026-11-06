import { Tabs } from "expo-router";
import { Home, Calendar, User, Users, Stethoscope } from "lucide-react-native";
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/context/ThemeContext';
import { tw } from '@/tw';

export default function DoctorLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';
  
  return (
    <Tabs 
      backBehavior="history"
      screenOptions={{ 
        headerShown: false, 
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          borderTopColor: isDark ? "#1e293b" : "#f1f5f9",
          height: 58,
          paddingBottom: 6,
          paddingTop: 4,
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('mobile.overview', "Overview"), tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} />
      <Tabs.Screen name="schedule" options={{ title: t('mobile.my_schedule', "Schedule"), tabBarIcon: ({ color }) => <Calendar color={color} size={24} /> }} />
      <Tabs.Screen name="patients" options={{ title: t('mobile.patients', "Patients"), tabBarIcon: ({ color }) => <Users color={color} size={24} /> }} />
      <Tabs.Screen name="consultations" options={{ title: t('mobile.consultations', "Consultations"), tabBarIcon: ({ color }) => <Stethoscope color={color} size={24} /> }} />
      <Tabs.Screen name="chat" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="profile" options={{ title: t('mobile.profile', "Profile"), tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
      
      {/* Hide video-call, incoming-call and notifications from tabs */}
      <Tabs.Screen name="video-call" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="incoming-call" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
