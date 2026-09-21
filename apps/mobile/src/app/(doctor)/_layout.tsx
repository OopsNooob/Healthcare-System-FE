import { Tabs } from "expo-router";
import { Home, Calendar, User, MessageCircle } from "lucide-react-native";

export default function DoctorLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#2563eb" }}>
      <Tabs.Screen name="index" options={{ title: "Overview", tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule", tabBarIcon: ({ color }) => <Calendar color={color} size={24} /> }} />
      <Tabs.Screen name="consultations" options={{ title: "Consultations", tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
      <Tabs.Screen name="chat" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
      
      {/* Hide video-call, incoming-call and notifications from tabs */}
      <Tabs.Screen name="video-call" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="incoming-call" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
