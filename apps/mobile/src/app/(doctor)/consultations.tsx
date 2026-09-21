import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { Calendar, Clock, MessageCircle, Search, CheckCircle, XCircle, AlertTriangle, FileText, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { tw } from '@/tw';

export default function DoctorConsultationsScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [doctorNote, setDoctorNote] = useState('');

  const pendingRequests = [
    { id: '1', patientName: 'Alex Johnson', time: '10:30 AM', date: 'Today', type: 'Chat', age: 28, gender: 'Male', reason: 'Mild headache and dizziness for 2 days.' },
  ];

  const activeSessions = [
    { id: '2', patientName: 'Maria Garcia', time: '11:00 AM', date: 'Today', type: 'Chat', status: 'In Progress', age: 34, gender: 'Female', reason: 'Follow-up on blood test results.' },
  ];

  const history = [
    { id: '3', patientName: 'James Smith', time: '02:15 PM', date: 'Yesterday', type: 'Chat', status: 'Completed', age: 45, gender: 'Male', rating: 5, review: 'Very helpful doctor.' },
  ];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setPending(pendingRequests);
      setActive(activeSessions);
      setHist(history);
      setLoading(false);
    }, 1000);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm')}>
      <View style={tw('flex-row justify-between items-start mb-3')}>
        <View>
          <View style={tw('w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
          <View style={tw('w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
        </View>
        <View style={tw('w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-full')} />
      </View>
      <View style={tw('w-full h-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4')} />
      <View style={tw('flex-row gap-3 mt-2')}>
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
      </View>
    </View>
  );

  const handleAction = (action: string) => {
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: `${action} successful`,
    });
  };

  const handleEndSubmit = () => {
    setEndModalVisible(false);
    setDoctorNote('');
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Consultation Ended',
    });
  };

  const handleReportSubmit = () => {
    setReportModalVisible(false);
    setReportReason('');
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Report Submitted',
    });
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>{t('mobile.consultations', `Consultations`)}</Text>
        <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-1')}>{t('mobile.manage_your_appointments_and_c', `Manage your appointments and chats`)}</Text>
      </View>

      {/* Tabs */}
      <View style={tw('flex-row px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <TouchableOpacity 
          onPress={() => setActiveTab('pending')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'pending' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'pending' ? 'text-brand' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`)}>{t('mobile.pending', `Pending`)}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('active')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'active' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'active' ? 'text-brand' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`)}>{t('mobile.active', `Active`)}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('history')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'history' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'history' ? 'text-brand' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`)}>{t('mobile.history', `History`)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={tw('p-6 pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
      >
        {/* Pending Requests */}
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : activeTab === 'pending' && pending.length > 0 ? pending.map(req => (
          <View key={req.id} style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm')}>
            <View style={tw('flex-row justify-between items-start mb-3')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{req.patientName}</Text>
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{req.age} {t('mobile.yrs', 'yrs')} • {req.gender}</Text>
              </View>
              <View style={tw('px-3 py-1 bg-amber-50 rounded-full border border-amber-100')}>
                <Text style={tw('text-xs font-bold text-amber-600')}>{t('mobile.pending_request', `Pending Request`)}</Text>
              </View>
            </View>
            <Text style={tw('text-slate-700 dark:text-slate-200 text-sm mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl')}>{req.reason}</Text>
            <View style={tw('flex-row gap-3 mt-2')}>
              <TouchableOpacity onPress={() => handleAction('Accepted')} style={tw('flex-1 bg-brand py-3 rounded-xl flex-row justify-center items-center')}>
                <CheckCircle color="white" size={18} style={tw('mr-2')} />
                <Text style={tw('text-white font-bold text-sm')}>{t('mobile.accept', `Accept`)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAction('Declined')} style={tw('flex-1 bg-red-50 py-3 rounded-xl border border-red-100 flex-row justify-center items-center')}>
                <XCircle color="#ef4444" size={18} style={tw('mr-2')} />
                <Text style={tw('text-red-500 font-bold text-sm')}>{t('mobile.decline', `Decline`)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : activeTab === 'pending' && (
          <View style={tw('items-center justify-center py-12')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_pending_requests', `No pending requests`)}</Text>
          </View>
        )}

        {/* Active Sessions */}
        {!loading && activeTab === 'active' && active.length > 0 ? active.map(session => (
          <View key={session.id} style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm')}>
            <View style={tw('flex-row justify-between items-start mb-3')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{session.patientName}</Text>
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500')}>{session.age} {t('mobile.yrs', 'yrs')} • {session.gender}</Text>
              </View>
              <View style={tw('flex-row gap-2')}>
                <TouchableOpacity onPress={() => setReportModalVisible(true)} style={tw('w-8 h-8 rounded-full bg-red-50 items-center justify-center')}>
                  <AlertTriangle color="#ef4444" size={16} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={tw('flex-row gap-3 mt-4')}>
              <TouchableOpacity onPress={() => router.push(`/(doctor)/chat/${session.id}` as any)} style={tw('flex-1 bg-brand-light py-3 rounded-xl flex-row justify-center items-center')}>
                <MessageCircle color="#10b981" size={18} style={tw('mr-2')} />
                <Text style={tw('text-brand font-bold text-sm')}>{t('mobile.open_chat', `Open Chat`)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEndModalVisible(true)} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3 rounded-xl flex-row justify-center items-center')}>
                <CheckCircle color="#64748b" size={18} style={tw('mr-2')} />
                <Text style={tw('text-slate-600 dark:text-slate-300 font-bold text-sm')}>{t('mobile.end_session', `End Session`)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : !loading && activeTab === 'active' && (
          <View style={tw('items-center justify-center py-12')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_active_sessions', `No active sessions`)}</Text>
          </View>
        )}

        {/* History */}
        {!loading && activeTab === 'history' && hist.length > 0 ? hist.map(session => (
          <View key={session.id} style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm')}>
            <View style={tw('flex-row justify-between items-start mb-2')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{session.patientName}</Text>
                <Text style={tw('text-xs text-slate-400 dark:text-slate-500')}>{session.date} • {session.time}</Text>
              </View>
              <View style={tw('px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full')}>
                <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>{session.status}</Text>
              </View>
            </View>
            
            <View style={tw('mt-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl')}>
              <Text style={tw('text-sm text-slate-700 dark:text-slate-200 font-medium mb-1')}>{t('mobile.patient_review', `Patient Review:`)}</Text>
              <Text style={tw('text-sm text-slate-600 dark:text-slate-300 italic')}>"{session.review}" (Rating: {session.rating}/5)</Text>
            </View>

            <View style={tw('flex-row gap-3 mt-4')}>
              <TouchableOpacity onPress={() => router.push(`/(doctor)/chat/${session.id}` as any)} style={tw('flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 py-2 rounded-xl flex-row justify-center items-center')}>
                <MessageCircle color="#64748b" size={16} style={tw('mr-2')} />
                <Text style={tw('text-slate-600 dark:text-slate-300 font-bold text-sm')}>{t('mobile.view_log', `View Log`)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReportModalVisible(true)} style={tw('flex-1 bg-red-50 py-2 border border-red-100 rounded-xl flex-row justify-center items-center')}>
                <AlertTriangle color="#ef4444" size={16} style={tw('mr-2')} />
                <Text style={tw('text-red-500 font-bold text-sm')}>{t('mobile.report', `Report`)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : !loading && activeTab === 'history' && (
          <View style={tw('items-center justify-center py-12')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium')}>{t('mobile.no_consultation_history', `No consultation history`)}</Text>
          </View>
        )}

      </ScrollView>

      {/* End Consultation Modal */}
      <Modal visible={endModalVisible} transparent animationType="slide" onRequestClose={() => setEndModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.end_consultation', `End Consultation`)}</Text>
              <TouchableOpacity onPress={() => setEndModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.doctors_note_optional', `Doctor's Note (Optional)`)}</Text>
              <TextInput
                value={doctorNote}
                onChangeText={setDoctorNote}
                placeholder={t('mobile.write_diagnostic_notes', 'Write your diagnostic notes here...')}
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white h-32')}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity onPress={handleEndSubmit} style={tw('bg-brand py-4 rounded-xl items-center')}>
              <Text style={tw('text-white font-bold text-base')}>{t('mobile.end_and_save_note', `End and Save Note`)}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end bg-black/40')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.report_patient', `Report Patient`)}</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}><X color="#64748b" size={24} /></TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.reason_for_report', `Reason for Report`)}</Text>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder={t('mobile.inappropriate_behavior', 'Inappropriate behavior, spam...')}
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white h-32')}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity onPress={handleReportSubmit} style={tw('bg-red-500 py-4 rounded-xl items-center')}>
              <Text style={tw('text-white font-bold text-base')}>{t('mobile.submit_report', `Submit Report`)}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
