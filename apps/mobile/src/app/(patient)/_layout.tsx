import { Tabs } from "expo-router";
import { Home, Activity, MessageCircle, User, Users, Calendar } from "lucide-react-native";
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '@/context/ThemeContext';
import { tw } from '@/tw';

export default function PatientLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useThemeContext();
  
  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarActiveTintColor: "#10b981"
    }}>
      <Tabs.Screen name="index" options={{ title: t('mobile.overview', "Home"), tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} />
      <Tabs.Screen name="my-doctors" options={{ title: t('mobile.my_doctors', "My Doctors"), tabBarIcon: ({ color }) => <Users color={color} size={24} /> }} />
      <Tabs.Screen name="appointments" options={{ title: t('mobile.appointments', "Appointments"), tabBarIcon: ({ color }) => <Calendar color={color} size={24} /> }} />
      <Tabs.Screen name="health-metric" options={{ title: t('mobile.health_metrics', "Metrics"), tabBarIcon: ({ color }) => <Activity color={color} size={24} /> }} />
      <Tabs.Screen name="chat-hub" options={{ title: t('mobile.messages', "Chat"), tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('mobile.profile', "Profile"), tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
      
      {/* Hide these from tab bar, but keep them in the layout for routing */}
      <Tabs.Screen name="premium" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="ai-chat/index" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="ai-chat/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="doctor-chat" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="video-call" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="incoming-call" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
