import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Calendar as CalendarIcon, Clock, TrendingUp, Bell } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { tw } from '@/tw';

export default function DoctorHomeScreen() {
  const router = useRouter();

  const stats = [
    { title: 'Total Patients', value: '1,248', icon: <Users color="#3b82f6" size={24} />, bg: 'bg-blue-50', trend: '+12%' },
    { title: 'Consultations', value: '142', icon: <CalendarIcon color="#10b981" size={24} />, bg: 'bg-emerald-50', trend: '+5%' },
    { title: 'Hours Online', value: '64h', icon: <Clock color="#f59e0b" size={24} />, bg: 'bg-yellow-50', trend: '+2%' },
  ];

  const todayQueue = [
    { id: 1, name: 'Alex Johnson', time: '10:30 AM', status: 'Waiting', type: 'Video Call' },
    { id: 2, name: 'Maria Garcia', time: '11:00 AM', status: 'Upcoming', type: 'Chat' },
    { id: 3, name: 'James Smith', time: '02:15 PM', status: 'Upcoming', type: 'Video Call' },
  ];

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw('flex-row justify-between items-center px-6 pt-6 pb-4')}>
          <View>
            <Text style={tw('text-gray-500 text-sm')}>Good morning,</Text>
            <Text style={tw('text-2xl font-bold text-[#313A34]')}>Dr. Sarah Connor</Text>
          </View>
          <TouchableOpacity 
            style={tw('p-2 bg-white rounded-full shadow-sm border border-gray-100 relative')}
            onPress={() => router.push('/(doctor)/notifications')}
          >
            <Bell color="#1E1E1E" size={24} />
            <View style={tw('absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white')} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={tw('px-6 mb-8')}>
          <Text style={tw('text-lg font-bold text-[#313A34] mb-4')}>Overview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw('-mx-6 px-6')}>
            <View style={tw('flex-row gap-4')}>
              {stats.map((stat, idx) => (
                <View key={idx} style={tw('bg-white p-5 rounded-3xl shadow-sm border border-gray-100 w-40')}>
                  <View style={tw(`w-12 h-12 rounded-2xl ${stat.bg} items-center justify-center mb-4`)}>
                    {stat.icon}
                  </View>
                  <Text style={tw('text-2xl font-bold text-[#313A34]')}>{stat.value}</Text>
                  <Text style={tw('text-sm text-gray-500 mb-2')}>{stat.title}</Text>
                  <View style={tw('flex-row items-center gap-1')}>
                    <TrendingUp color="#10b981" size={14} />
                    <Text style={tw('text-xs font-bold text-emerald-500')}>{stat.trend}</Text>
                    <Text style={tw('text-xs text-gray-400')}>this month</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Consultations Chart */}
        <View style={tw('px-6 mb-8')}>
          <Text style={tw('text-lg font-bold text-[#313A34] mb-4')}>Consultations Over Time</Text>
          <View style={tw('bg-white p-4 rounded-3xl shadow-sm border border-gray-100')}>
            <LineChart
              data={{
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [
                  {
                    data: [12, 19, 15, 25, 22, 10, 14]
                  }
                ]
              }}
              width={Dimensions.get("window").width - 80}
              height={220}
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: "#10b981"
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
                marginLeft: -10
              }}
            />
          </View>
        </View>

        {/* Today's Queue */}
        <View style={tw('px-6')}>
          <View style={tw('flex-row justify-between items-end mb-4')}>
            <Text style={tw('text-lg font-bold text-[#313A34]')}>Today's Queue</Text>
            <TouchableOpacity onPress={() => router.push('/(doctor)/consultations')}>
              <Text style={tw('text-sm font-medium text-blue-500')}>View Schedule</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            {todayQueue.map((item) => (
              <View 
                key={item.id}
                style={tw('flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100')}
              >
                <View style={tw('flex-1')}>
                  <Text style={tw('text-base font-bold text-[#313A34]')}>{item.name}</Text>
                  <Text style={tw('text-sm text-gray-500 mt-0.5')}>{item.type} • {item.time}</Text>
                </View>
                <View style={tw('items-end')}>
                  <View style={tw(`px-3 py-1 rounded-full ${item.status === 'Waiting' ? 'bg-orange-100' : 'bg-gray-100'}`)}>
                    <Text style={tw(`text-xs font-bold ${item.status === 'Waiting' ? 'text-orange-600' : 'text-gray-600'}`)}>
                      {item.status}
                    </Text>
                  </View>
                  {item.status === 'Waiting' && (
                    <TouchableOpacity 
                      style={tw('mt-2 bg-blue-500 px-4 py-1.5 rounded-full')}
                      onPress={() => router.push('/(doctor)/video-call')}
                    >
                      <Text style={tw('text-white text-xs font-bold')}>Start</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
