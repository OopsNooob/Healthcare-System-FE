import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Activity, Heart, Droplet, Plus, Edit2, Trash2, Bot, X, AlertTriangle, AlertCircle, PhoneCall, CheckCircle2 } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import { useThemeContext } from '@/context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

type MetricEntry = {
  id: string;
  value: string;
  timestamp: number;
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
      id: 'blood_pressure',
      title: t('mobile.blood_pressure', 'Blood Pressure'),
      unit: 'mmHg',
      icon: <Activity color={twInstance.color('text-blue-500')} size={24} />,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      entries: [
        { id: '3', value: '120/80', timestamp: new Date(2023, 9, 12, 9, 0).getTime() },
      ],
    },
    {
      id: 'blood_sugar',
      title: t('mobile.blood_sugar', 'Blood Sugar'),
      unit: 'mg/dL',
      icon: <Droplet color={twInstance.color('text-amber-500')} size={24} />,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      entries: [
        { id: '4', value: '95', timestamp: new Date(2023, 9, 12, 8, 0).getTime() },
      ],
    },
    {
      id: 'heart_rate',
      title: t('mobile.heart_rate', 'Heart Rate'),
      unit: 'bpm',
      icon: <Heart color={twInstance.color('text-rose-500')} size={24} />,
      bg: 'bg-rose-100 dark:bg-rose-900/30',
      entries: [
        { id: '1', value: '72', timestamp: new Date(2023, 9, 12, 10, 0).getTime() },
        { id: '2', value: '75', timestamp: new Date(2023, 9, 11, 14, 0).getTime() },
      ],
    }
  ]);

  const [selectedMetricId, setSelectedMetricId] = useState<string>('blood_pressure');
  const selectedMetric = metrics.find(m => m.id === selectedMetricId) || metrics[0];

  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState('');
  const [formDateObj, setFormDateObj] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // Care Alerts State (DA2)
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'normal' | 'attention' | 'urgent'>('normal');
  const [alertReason, setAlertReason] = useState('');

  const { i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (date: Date) => {
    if (isVi) {
      return `Ngày ${date.getDate()} Thg ${date.getMonth() + 1}, ${date.getFullYear()}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const openAddModal = () => {
    setEditId(null);
    setFormValue('');
    setFormDateObj(new Date());
    setModalVisible(true);
  };

  const openEditModal = (entry: MetricEntry) => {
    setEditId(entry.id);
    setFormValue(entry.value);
    setFormDateObj(new Date(entry.timestamp));
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('mobile.delete_entry', 'Delete Entry'), t('mobile.confirm_delete', 'Are you sure you want to delete this entry?'), [
      { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
      { 
        text: t('mobile.delete', 'Delete'), 
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
    if (!formValue.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.please_fill_all', 'Please fill in all fields')
      });
      return;
    }

    // --- Mock Rule Engine for DA2 ---
    let newAlertType: 'normal' | 'attention' | 'urgent' = 'normal';
    let newAlertReason = '';

    if (selectedMetricId === 'blood_pressure') {
      const parts = formValue.split('/');
      if (parts.length === 2) {
        const sys = parseInt(parts[0]);
        const dia = parseInt(parts[1]);
        if (sys >= 180 || dia >= 120) {
          newAlertType = 'urgent';
          newAlertReason = `BP: ${sys}/${dia} mmHg. ` + t('mobile.reason_bp_urgent', 'Hypertensive crisis. Seek immediate medical attention.');
        } else if (sys >= 140 || dia >= 90) {
          newAlertType = 'attention';
          newAlertReason = `BP: ${sys}/${dia} mmHg. ` + t('mobile.reason_bp_attention', 'High blood pressure. Monitor closely.');
        }
      }
    } else if (selectedMetricId === 'blood_sugar') {
      const val = parseFloat(formValue);
      if (val < 70 || val >= 250) {
        newAlertType = 'urgent';
        newAlertReason = `BS: ${val} mg/dL. ` + t('mobile.reason_bs_urgent', 'Dangerous blood sugar level. Seek help.');
      } else if (val < 80 || val > 130) {
        newAlertType = 'attention';
        newAlertReason = `BS: ${val} mg/dL. ` + t('mobile.reason_bs_attention', 'Blood sugar out of target range.');
      }
    }

    // Save Data
    setMetrics(prev => prev.map(m => {
      if (m.id === selectedMetricId) {
        if (editId) {
          return {
            ...m,
            entries: m.entries.map(e => e.id === editId ? { ...e, value: formValue, timestamp: formDateObj.getTime() } : e)
          };
        } else {
          return {
            ...m,
            entries: [{ id: Date.now().toString(), value: formValue, timestamp: formDateObj.getTime() }, ...m.entries].sort((a, b) => b.timestamp - a.timestamp)
          };
        }
      }
      return m;
    }));
    
    setModalVisible(false);

    // Trigger Alert if not normal
    if (newAlertType !== 'normal') {
      setAlertType(newAlertType);
      setAlertReason(newAlertReason);
      setAlertVisible(true);
    } else {
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: editId ? t('mobile.entry_updated', 'Entry updated successfully') : t('mobile.new_entry_added', 'New entry added')
      });
    }
  };

  const handleAskAI = (entry: MetricEntry) => {
    const timeStr = formatTime(new Date(entry.timestamp));
    const dateStr = formatDate(new Date(entry.timestamp));
    const prompt = isVi ? `Đánh giá giúp tôi chỉ số ${selectedMetric.title} là ${entry.value} ${selectedMetric.unit} vừa đo lúc ${timeStr} ngày ${dateStr} có sao không?` : `Please evaluate my ${selectedMetric.title} which is ${entry.value} ${selectedMetric.unit} measured at ${timeStr} on ${dateStr}. Is it okay?`;
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
          <Text style={tw('text-slate-500 dark:text-slate-400 text-sm mt-1')}>{t('mobile.track_your_daily_health_status', `Track your daily health status`)}</Text>
        </View>
        <TouchableOpacity 
          onPress={openAddModal}
          style={tw('w-12 h-12 bg-emerald-500 dark:bg-emerald-600 rounded-full items-center justify-center shadow-sm')}
        >
          <Plus color="#ffffff" size={24} />
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
                style={tw(`flex-row items-center gap-2 px-4 py-3 rounded-2xl border ${isSelected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`)}
              >
                <View style={tw(`w-8 h-8 rounded-full ${metric.bg} items-center justify-center`)}>
                  {metric.icon}
                </View>
                <Text style={tw(`font-semibold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`)}>
                  {metric.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Entries List */}
      <ScrollView contentContainerStyle={tw('px-6 pb-20')} showsVerticalScrollIndicator={false}>
        <View style={tw('flex-row justify-between items-end mb-4')}>
          <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{t('mobile.recent_records', `Recent Records`)}</Text>
          <TouchableOpacity onPress={() => router.push('/(patient)/reports')}>
            <Text style={tw('text-sm text-emerald-600 dark:text-emerald-400 font-medium')}>{t('mobile.view_reports', 'View Reports ›')}</Text>
          </TouchableOpacity>
        </View>
        
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
                    {entry.value} <Text style={tw('text-sm text-slate-500 dark:text-slate-400 font-medium')}>{selectedMetric.unit}</Text>
                  </Text>
                  <Text style={tw('text-xs text-slate-400 dark:text-slate-500 mt-1')}>{formatTime(new Date(entry.timestamp))} • {formatDate(new Date(entry.timestamp))}</Text>
                </View>
                <View style={tw('flex-row gap-2')}>
                  <TouchableOpacity onPress={() => handleDelete(entry.id)} style={tw('w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-full items-center justify-center')}>
                    <Trash2 color={twInstance.color('text-red-500')} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Ask AI Button */}
              <TouchableOpacity 
                onPress={() => handleAskAI(entry)}
                style={tw('flex-row items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 py-2.5 rounded-xl mt-1 border border-indigo-100 dark:border-indigo-800/50')}
              >
                <Bot color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={18} />
                <Text style={tw('text-indigo-700 dark:text-indigo-300 font-bold text-sm')}>{t('mobile.ask_ai_about_this', `Ask AI about this`)}</Text>
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
          style={tw('flex-1 justify-end bg-slate-900/40 dark:bg-black/60')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {editId ? t('mobile.edit_record', 'Edit Record') : t('mobile.add_record', 'Add Record')} - {selectedMetric.title}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={tw('p-2 bg-slate-100 dark:bg-slate-800 rounded-full')}>
                <X color={twInstance.color('text-slate-500 dark:text-slate-400')} size={20} />
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
                  <TouchableOpacity
                    onPress={() => { setPickerMode('time'); setShowPicker(true); }}
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3')}
                  >
                    <Text style={tw('text-slate-900 dark:text-white font-medium')}>{formatTime(formDateObj)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.date', `Date`)}</Text>
                  <TouchableOpacity
                    onPress={() => { setPickerMode('date'); setShowPicker(true); }}
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3')}
                  >
                    <Text style={tw('text-slate-900 dark:text-white font-medium')}>{formatDate(formDateObj)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showPicker && (
                <DateTimePicker
                  value={formDateObj}
                  mode={pickerMode}
                  is24Hour={false}
                  onChange={(event, selectedDate) => {
                    setShowPicker(false);
                    if (selectedDate) setFormDateObj(selectedDate);
                  }}
                />
              )}

              <TouchableOpacity 
                onPress={handleSave}
                style={tw('bg-emerald-500 py-4 rounded-xl items-center mt-4')}
              >
                <Text style={tw('text-white font-bold text-base')}>{t('mobile.save_record', `Save Record`)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Care Alert Modal (DA2) */}
      <Modal
        visible={alertVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={tw('flex-1 justify-center items-center bg-slate-900/60 dark:bg-black/70 px-6')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-3xl w-full overflow-hidden shadow-2xl')}>
            {/* Header */}
            <View style={tw(`p-6 items-center ${alertType === 'urgent' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`)}>
              {alertType === 'urgent' ? (
                <AlertTriangle size={48} color={twInstance.color('text-red-500')} />
              ) : (
                <AlertCircle size={48} color={twInstance.color('text-amber-500')} />
              )}
              <Text style={tw(`text-xl font-bold mt-4 text-center ${alertType === 'urgent' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`)}>
                {alertType === 'urgent' ? t('mobile.alert_urgent', 'Khẩn Cấp!') : t('mobile.alert_attention', 'Cần Chú Ý!')}
              </Text>
            </View>
            
            {/* Content */}
            <View style={tw('p-6')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 text-center text-base mb-4')}>
                {alertReason}
              </Text>

              {/* Safety Instructions for Urgent */}
              {alertType === 'urgent' && (
                <View style={tw('bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-6 border border-red-100 dark:border-red-800/50')}>
                  <Text style={tw('text-red-800 dark:text-red-300 font-bold mb-2')}>{t('mobile.safety_instructions', 'Hướng dẫn an toàn:')}</Text>
                  <Text style={tw('text-red-700 dark:text-red-400 text-sm mb-3')}>
                    {t('mobile.alert_urgent_desc', 'Chỉ số sinh hiệu của bạn ở mức NGUY HIỂM. Vui lòng dừng mọi hoạt động và liên hệ cấp cứu hoặc đến cơ sở y tế gần nhất!')}
                  </Text>
                  <TouchableOpacity style={tw('flex-row items-center justify-center bg-red-600 py-3 rounded-xl gap-2')}>
                    <PhoneCall size={18} color="white" />
                    <Text style={tw('text-white font-bold')}>{t('mobile.call_emergency', 'Gọi cấp cứu 115')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Acknowledge Button */}
              <TouchableOpacity 
                onPress={() => setAlertVisible(false)}
                style={tw(`py-4 rounded-xl items-center ${alertType === 'urgent' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-amber-500'}`)}
              >
                <Text style={tw(`font-bold text-base ${alertType === 'urgent' ? 'text-slate-700 dark:text-slate-300' : 'text-white'}`)}>
                  {t('mobile.i_understand', 'Tôi đã hiểu')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
