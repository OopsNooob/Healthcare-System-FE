import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Switch, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Calendar, Plus, Clock, Copy, Trash2 } from 'lucide-react-native';
import { tw } from '@/tw';

export default function DoctorScheduleScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('2023-10-25');
  const [isAcceptingAppts, setIsAcceptingAppts] = useState(true);

  const dates = [
    { date: '2023-10-25', dayName: 'Mon', dayNum: '25' },
    { date: '2023-10-26', dayName: 'Tue', dayNum: '26' },
    { date: '2023-10-27', dayName: 'Wed', dayNum: '27' },
    { date: '2023-10-28', dayName: 'Thu', dayNum: '28' },
    { date: '2023-10-29', dayName: 'Fri', dayNum: '29' },
    { date: '2023-10-30', dayName: 'Sat', dayNum: '30' },
  ];

  const timeSlots = [
    { id: '1', time: '09:00 AM', status: 'Booked', patient: 'Alex Johnson' },
    { id: '2', time: '10:00 AM', status: 'Available' },
    { id: '3', time: '11:00 AM', status: 'Booked', patient: 'Maria Garcia' },
    { id: '4', time: '02:00 PM', status: 'Available' },
    { id: '5', time: '03:30 PM', status: 'Available' },
  ];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setSlots(timeSlots);
      setLoading(false);
    }, 1000);
  }, [selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderSlotSkeleton = () => (
    <View style={tw('flex-row items-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mb-4')}>
      <View style={tw('w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 mr-3')} />
      <View style={tw('flex-1')}>
        <View style={tw('w-24 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-1')} />
        <View style={tw('w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
    </View>
  );

  const handleAddSlot = () => {
    Toast.show({
      type: 'info',
      text1: 'Info',
      text2: 'Open Time picker to add new slot',
    });
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>{t('mobile.my_schedule', `My Schedule`)}</Text>
        <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-1')}>{t('mobile.manage_your_working_hours_and_', `Manage your working hours and slots`)}</Text>
        
        <View style={tw('flex-row items-center justify-between mt-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl')}>
          <View>
            <Text style={tw('font-bold text-slate-900 dark:text-white')}>{t('mobile.accepting_appointments', `Accepting Appointments`)}</Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{t('mobile.patients_can_book_available_sl', `Patients can book available slots`)}</Text>
          </View>
          <Switch 
            value={isAcceptingAppts}
            onValueChange={setIsAcceptingAppts}
            trackColor={{ false: '#cbd5e1', true: '#34d399' }}
            thumbColor={'#ffffff'}
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={tw('pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
      >
        {/* Date Selector */}
        <View style={tw('py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
          <View style={tw('flex-row justify-between items-center px-6 mb-4')}>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{t('mobile.october_2023', `October 2023`)}</Text>
            <TouchableOpacity style={tw('flex-row items-center')}>
              <Calendar color="#64748b" size={16} style={tw('mr-2')} />
              <Text style={tw('text-slate-600 dark:text-slate-300 font-medium')}>{t('mobile.pick_date', `Pick Date`)}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw('px-6')} contentContainerStyle={tw('gap-3 pr-12')}>
            {dates.map((d) => (
              <TouchableOpacity 
                key={d.date}
                onPress={() => setSelectedDate(d.date)}
                style={tw(`w-16 h-20 items-center justify-center rounded-2xl border ${selectedDate === d.date ? 'bg-brand border-brand' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'}`)}
              >
                <Text style={tw(`text-xs font-bold mb-1 ${selectedDate === d.date ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`)}>{d.dayName}</Text>
                <Text style={tw(`text-xl font-bold ${selectedDate === d.date ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`)}>{d.dayNum}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Slots */}
        <View style={tw('p-6')}>
          <View style={tw('flex-row justify-between items-center mb-6')}>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{t('mobile.time_slots', `Time Slots`)}</Text>
            <TouchableOpacity onPress={handleAddSlot} style={tw('w-10 h-10 bg-slate-900 rounded-full items-center justify-center')}>
              <Plus color="#ffffff" size={20} />
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            {loading ? (
              <>
                {renderSlotSkeleton()}
                {renderSlotSkeleton()}
                {renderSlotSkeleton()}
              </>
            ) : slots.length > 0 ? (
              slots.map(slot => (
                <View key={slot.id} style={tw(`flex-row items-center p-4 rounded-2xl border ${slot.status === 'Booked' ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 border-dashed'}`)}>
                  <View style={tw('flex-row items-center flex-1')}>
                    <View style={tw(`w-2 h-2 rounded-full mr-3 ${slot.status === 'Booked' ? 'bg-red-500' : 'bg-emerald-500'}`)} />
                    <View>
                      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-0.5')}>{slot.time}</Text>
                      {slot.status === 'Booked' ? (
                        <Text style={tw('text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{t('mobile.booked_by', 'Booked by')}: <Text style={tw('font-bold text-slate-700 dark:text-slate-200')}>{slot.patient}</Text></Text>
                      ) : (
                        <Text style={tw('text-sm text-emerald-600 font-medium')}>{t('mobile.available', `Available`)}</Text>
                      )}
                    </View>
                  </View>
                  {slot.status === 'Available' && (
                    <TouchableOpacity style={tw('p-2')}>
                      <Trash2 color="#ef4444" size={20} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={tw('items-center justify-center py-8 border border-slate-200 dark:border-slate-700 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-950')}>
                <Clock color="#94a3b8" size={32} style={tw('mb-2')} />
                <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_time_slots_for_this_date', `No time slots for this date`)}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={tw('mt-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex-row items-center justify-center border-dashed')}>
            <Copy color="#64748b" size={18} style={tw('mr-2')} />
            <Text style={tw('text-slate-600 dark:text-slate-300 font-bold')}>{t('mobile.copy_schedule_to_next_week', `Copy schedule to next week`)}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
