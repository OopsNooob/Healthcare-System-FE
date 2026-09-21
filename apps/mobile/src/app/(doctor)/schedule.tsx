import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Switch } from 'react-native';
import { Calendar, Plus, Clock, Copy, Trash2 } from 'lucide-react-native';
import { tw } from '@/tw';

export default function DoctorScheduleScreen() {
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

  const handleAddSlot = () => {
    alert('Open Time picker to add new slot');
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      {/* Header */}
      <View style={tw('px-6 pt-6 pb-4 bg-white border-b border-slate-100')}>
        <Text style={tw('text-2xl font-bold text-slate-900')}>My Schedule</Text>
        <Text style={tw('text-slate-500 text-sm mt-1')}>Manage your working hours and slots</Text>
        
        <View style={tw('flex-row items-center justify-between mt-6 bg-slate-50 p-4 rounded-2xl')}>
          <View>
            <Text style={tw('font-bold text-slate-900')}>Accepting Appointments</Text>
            <Text style={tw('text-xs text-slate-500')}>Patients can book available slots</Text>
          </View>
          <Switch 
            value={isAcceptingAppts}
            onValueChange={setIsAcceptingAppts}
            trackColor={{ false: '#cbd5e1', true: '#34d399' }}
            thumbColor={'#ffffff'}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Date Selector */}
        <View style={tw('py-6 bg-white border-b border-slate-100')}>
          <View style={tw('flex-row justify-between items-center px-6 mb-4')}>
            <Text style={tw('text-lg font-bold text-slate-900')}>October 2023</Text>
            <TouchableOpacity style={tw('flex-row items-center')}>
              <Calendar color="#64748b" size={16} style={tw('mr-2')} />
              <Text style={tw('text-slate-600 font-medium')}>Pick Date</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw('px-6')} contentContainerStyle={tw('gap-3 pr-12')}>
            {dates.map((d) => (
              <TouchableOpacity 
                key={d.date}
                onPress={() => setSelectedDate(d.date)}
                style={tw(`w-16 h-20 items-center justify-center rounded-2xl border ${selectedDate === d.date ? 'bg-brand border-brand' : 'bg-slate-50 border-slate-200'}`)}
              >
                <Text style={tw(`text-xs font-bold mb-1 ${selectedDate === d.date ? 'text-slate-700' : 'text-slate-400'}`)}>{d.dayName}</Text>
                <Text style={tw(`text-xl font-bold ${selectedDate === d.date ? 'text-slate-900' : 'text-slate-700'}`)}>{d.dayNum}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Slots */}
        <View style={tw('p-6')}>
          <View style={tw('flex-row justify-between items-center mb-6')}>
            <Text style={tw('text-lg font-bold text-slate-900')}>Time Slots</Text>
            <TouchableOpacity onPress={handleAddSlot} style={tw('w-10 h-10 bg-slate-900 rounded-full items-center justify-center')}>
              <Plus color="#ffffff" size={20} />
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            {timeSlots.map(slot => (
              <View key={slot.id} style={tw(`flex-row items-center p-4 rounded-2xl border ${slot.status === 'Booked' ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 border-dashed'}`)}>
                <View style={tw('flex-row items-center flex-1')}>
                  <View style={tw(`w-2 h-2 rounded-full mr-3 ${slot.status === 'Booked' ? 'bg-red-500' : 'bg-emerald-500'}`)} />
                  <View>
                    <Text style={tw('text-lg font-bold text-slate-900 mb-0.5')}>{slot.time}</Text>
                    {slot.status === 'Booked' ? (
                      <Text style={tw('text-sm text-slate-500')}>Booked by: <Text style={tw('font-bold text-slate-700')}>{slot.patient}</Text></Text>
                    ) : (
                      <Text style={tw('text-sm text-emerald-600 font-medium')}>Available</Text>
                    )}
                  </View>
                </View>
                {slot.status === 'Available' && (
                  <TouchableOpacity style={tw('p-2')}>
                    <Trash2 color="#ef4444" size={20} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity style={tw('mt-8 py-4 bg-white border border-slate-200 rounded-2xl flex-row items-center justify-center border-dashed')}>
            <Copy color="#64748b" size={18} style={tw('mr-2')} />
            <Text style={tw('text-slate-600 font-bold')}>Copy schedule to next week</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
