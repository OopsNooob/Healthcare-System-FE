import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Activity, Heart, Droplet, Plus, Edit2, Trash2, Bot, X } from 'lucide-react-native';
import { tw } from '@/tw';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useThemeContext } from '@/context/ThemeContext';

type MetricEntry = {
  id: string;
  value: string;
  time: string;
  date: string;
};

type Metric = {
  id: string;
  title: string;
  unit: string;
  icon: React.ReactNode;
  bg: string;
  entries: MetricEntry[];
};

export default function HealthMetricScreen() {
  const { t } = useTranslation();
  useThemeContext(); // Subscribe to theme changes

  const router = useRouter();
  
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      id: 'heart_rate',
      title: t('mobile.heart_rate', 'Heart Rate'),
      unit: 'bpm',
      icon: <Heart color="#ef4444" size={24} />,
      bg: 'bg-red-50',
      entries: [
        { id: '1', value: '72', time: '10:00 AM', date: 'Oct 12, 2023' },
        { id: '2', value: '75', time: '02:00 PM', date: 'Oct 11, 2023' },
      ],
    },
    {
      id: 'blood_pressure',
      title: t('mobile.blood_pressure', 'Blood Pressure'),
      unit: 'mmHg',
      icon: <Activity color="#3b82f6" size={24} />,
      bg: 'bg-blue-50',
      entries: [
        { id: '3', value: '120/80', time: '09:00 AM', date: 'Oct 12, 2023' },
      ],
    },
    {
      id: 'blood_sugar',
      title: t('mobile.blood_sugar', 'Blood Sugar'),
      unit: 'mg/dL',
      icon: <Droplet color="#f59e0b" size={24} />,
      bg: 'bg-yellow-50',
      entries: [
        { id: '4', value: '95', time: '08:00 AM', date: 'Oct 12, 2023' },
      ],
    }
  ]);

  const [selectedMetricId, setSelectedMetricId] = useState<string>('heart_rate');
  const selectedMetric = metrics.find(m => m.id === selectedMetricId) || metrics[0];

  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDate, setFormDate] = useState('');

  const openAddModal = () => {
    setEditId(null);
    setFormValue('');
    const now = new Date();
    setFormTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setFormDate(now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }));
    setModalVisible(true);
  };

  const openEditModal = (entry: MetricEntry) => {
    setEditId(entry.id);
    setFormValue(entry.value);
    setFormTime(entry.time);
    setFormDate(entry.date);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: () => {
          setMetrics(prev => prev.map(m => {
            if (m.id === selectedMetricId) {
              return { ...m, entries: m.entries.filter(e => e.id !== id) };
            }
            return m;
          }));
        }
      }
    ]);
  };

  const handleSave = () => {
    if (!formValue.trim() || !formTime.trim() || !formDate.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields'
      });
      return;
    }

    setMetrics(prev => prev.map(m => {
      if (m.id === selectedMetricId) {
        if (editId) {
          return {
            ...m,
            entries: m.entries.map(e => e.id === editId ? { ...e, value: formValue, time: formTime, date: formDate } : e)
          };
        } else {
          return {
            ...m,
            entries: [{ id: Date.now().toString(), value: formValue, time: formTime, date: formDate }, ...m.entries]
          };
        }
      }
      return m;
    }));
    
    setModalVisible(false);
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: editId ? 'Entry updated successfully' : 'New entry added'
    });
  };

  const handleAskAI = (entry: MetricEntry) => {
    const prompt = `Đánh giá giúp tôi chỉ số ${selectedMetric.title} là ${entry.value} ${selectedMetric.unit} vừa đo lúc ${entry.time} ngày ${entry.date} có sao không?`;
    router.push({
      pathname: '/(patient)/ai-chat',
      params: { prefill: prompt }
    });
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('flex-row justify-between items-center px-6 pt-6 pb-4')}>
        <View>
          <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>{t('mobile.health_metrics', `Health Metrics`)}</Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-1')}>{t('mobile.track_your_daily_health_status', `Track your daily health status`)}</Text>
        </View>
        <TouchableOpacity 
          onPress={openAddModal}
          style={tw('w-12 h-12 bg-brand-light rounded-full items-center justify-center')}
        >
          <Plus color="#a3e635" size={24} />
        </TouchableOpacity>
      </View>

      {/* Metric Selector (Horizontal Scroll) */}
      <View style={tw('mb-4')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw('px-6 gap-3')}>
          {metrics.map(metric => {
            const isSelected = selectedMetricId === metric.id;
            return (
              <TouchableOpacity
                key={metric.id}
                onPress={() => setSelectedMetricId(metric.id)}
                style={tw(`flex-row items-center gap-2 px-4 py-3 rounded-2xl border ${isSelected ? 'border-brand bg-brand-light' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`)}
              >
                <View style={tw(`w-8 h-8 rounded-full ${metric.bg} items-center justify-center`)}>
                  {metric.icon}
                </View>
                <Text style={tw(`font-semibold ${isSelected ? 'text-brand' : 'text-slate-700 dark:text-slate-200'}`)}>
                  {metric.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Entries List */}
      <ScrollView contentContainerStyle={tw('px-6 pb-20')} showsVerticalScrollIndicator={false}>
        <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-4')}>{t('mobile.recent_records', `Recent Records`)}</Text>
        
        {selectedMetric.entries.length === 0 ? (
          <View style={tw('items-center justify-center py-12')}>
            <Text style={tw('text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_records_found', `No records found`)}</Text>
          </View>
        ) : (
          selectedMetric.entries.map(entry => (
            <TouchableOpacity 
              key={entry.id} 
              onPress={() => openEditModal(entry)}
              style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-100 dark:border-slate-800 shadow-sm')}
            >
              <View style={tw('flex-row justify-between items-start mb-3')}>
                <View>
                  <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
                    {entry.value} <Text style={tw('text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{selectedMetric.unit}</Text>
                  </Text>
                  <Text style={tw('text-xs text-slate-400 dark:text-slate-500 mt-1')}>{entry.time} • {entry.date}</Text>
                </View>
                <View style={tw('flex-row gap-2')}>
                  <TouchableOpacity onPress={() => handleDelete(entry.id)} style={tw('w-8 h-8 bg-red-50 rounded-full items-center justify-center')}>
                    <Trash2 color="#ef4444" size={16} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Ask AI Button */}
              <TouchableOpacity 
                onPress={() => handleAskAI(entry)}
                style={tw('flex-row items-center justify-center gap-2 bg-ai-light py-2 rounded-xl mt-1')}
              >
                <Bot color="#6366f1" size={18} />
                <Text style={tw('text-ai font-bold text-sm')}>{t('mobile.ask_ai_about_this', `Ask AI about this`)}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/40')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {editId ? t('mobile.edit_record', 'Edit Record') : t('mobile.add_record', 'Add Record')} - {selectedMetric.title}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <View style={tw('gap-4')}>
              <View>
                <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.value', 'Value')} ({selectedMetric.unit})</Text>
                <TextInput
                  value={formValue}
                  onChangeText={setFormValue}
                   placeholder={t('mobile.enter_metric_value', `Enter ${selectedMetric.title}`)}
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium')}
                  keyboardType="default"
                />
              </View>

              <View style={tw('flex-row gap-4')}>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.time', `Time`)}</Text>
                  <TextInput
                    value={formTime}
                    onChangeText={setFormTime}
                    placeholder="10:00 AM"
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium')}
                  />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.date', `Date`)}</Text>
                  <TextInput
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="Oct 12, 2023"
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium')}
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSave}
                style={tw('bg-brand py-4 rounded-xl items-center mt-2')}
              >
                <Text style={tw('text-slate-900 dark:text-white font-bold text-base')}>{t('mobile.save_record', `Save Record`)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
