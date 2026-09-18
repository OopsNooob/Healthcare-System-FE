import { Tabs } from "expo-router";
import { Home, Activity, MessageCircle, User, Users } from "lucide-react-native";

export default function PatientLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#10b981" }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} />
      <Tabs.Screen name="my-doctors" options={{ title: "My Doctors", tabBarIcon: ({ color }) => <Users color={color} size={24} /> }} />
      <Tabs.Screen name="health-metric" options={{ title: "Metrics", tabBarIcon: ({ color }) => <Activity color={color} size={24} /> }} />
      <Tabs.Screen name="chat-hub" options={{ title: "Chat", tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
      
      {/* Hide these from tab bar, but keep them in the layout for routing */}
      <Tabs.Screen name="ai-chat/index" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="ai-chat/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="doctor-chat" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="video-call" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
