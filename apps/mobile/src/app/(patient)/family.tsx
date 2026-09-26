import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Modal, TextInput, Switch, Image, KeyboardAvoidingView, RefreshControl } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { ArrowLeft, Users, Plus, Settings, X, ShieldAlert, CheckCircle2, UserX, PauseCircle, PlayCircle } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import Toast from 'react-native-toast-message';

export default function FamilyCompanionScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [emailToInvite, setEmailToInvite] = useState('');
  
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const [members, setMembers] = useState([
    {
      id: 1,
      name: 'Emily Watson (Daughter)',
      email: 'emily@example.com',
      avatar: 'https://i.pravatar.cc/150?img=5',
      permissions: {
        receiveReminders: true,
        viewProgress: true
      },
      status: 'active'
    },
    {
      id: 2,
      name: 'John Doe (Son)',
      email: 'john@example.com',
      avatar: 'https://i.pravatar.cc/150?img=11',
      permissions: {
        receiveReminders: true,
        viewProgress: false
      },
      status: 'pending'
    }
  ]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1200);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-100 dark:border-slate-800 flex-row items-center shadow-sm')}>
      <View style={tw('w-12 h-12 rounded-full mr-3 bg-slate-200 dark:bg-slate-700')} />
      <View style={tw('flex-1 justify-center')}>
        <View style={tw('w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-1/2 h-3 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
      <View style={tw('w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700')} />
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw('items-center justify-center py-10 px-6')}>
      <View style={tw('w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4')}>
        <Users color={twInstance.color('text-slate-400')} size={24} />
      </View>
      <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-1')}>{t('mobile.no_members_found', 'No members yet')}</Text>
      <Text style={tw('text-sm text-slate-500 text-center')}>{t('mobile.invite_family_empty_state', 'Invite a family member to share your health updates.')}</Text>
    </View>
  );

  const handleInvite = () => {
    if (!emailToInvite.trim()) return;
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: t('mobile.invite_sent', 'Invitation sent successfully.')
    });
    setInviteModalVisible(false);
    setEmailToInvite('');
  };

  const handleRevoke = () => {
    setMembers(prev => prev.filter(m => m.id !== selectedMember.id));
    setSettingsModalVisible(false);
    Toast.show({
      type: 'info',
      text1: t('mobile.access_revoked', 'Access Revoked'),
      text2: t('mobile.member_removed', 'The family member has been removed.')
    });
  };

  const handlePauseResume = () => {
    const isPausing = selectedMember.status === 'active';
    const newStatus = isPausing ? 'paused' : 'active';
    
    setSelectedMember((prev: any) => ({ ...prev, status: newStatus }));
    setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, status: newStatus } : m));
    
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: isPausing ? t('mobile.access_paused', 'Access has been paused.') : t('mobile.access_resumed', 'Access has been resumed.')
    });
  };

  const togglePermission = (key: 'receiveReminders' | 'viewProgress') => {
    setSelectedMember((prev: any) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
    
    // Also update main list
    setMembers(prev => prev.map(m => {
      if (m.id === selectedMember.id) {
        return {
          ...m,
          permissions: {
            ...m.permissions,
            [key]: !m.permissions[key]
          }
        };
      }
      return m;
    }));
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <View style={tw('flex-row justify-between items-center')}>
          <View style={tw('flex-row items-center')}>
            <TouchableOpacity onPress={() => router.back()} style={tw('p-2 -ml-2 mr-2')}>
              <ArrowLeft color={twInstance.color('text-slate-900 dark:text-white')} size={24} />
            </TouchableOpacity>
            <View>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.family_companion', 'Family Companion')}</Text>
              <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>{t('mobile.share_health_updates', 'Share health updates with loved ones')}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={tw('p-6 pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={twInstance.color('text-slate-900 dark:text-white')} />}
      >
        
        {/* Banner */}
        <View style={tw('bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl mb-6 border border-indigo-100 dark:border-indigo-800/50 flex-row items-center')}>
          <View style={tw('w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full items-center justify-center mr-4')}>
            <Users color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={24} />
          </View>
          <View style={tw('flex-1')}>
            <Text style={tw('font-bold text-indigo-900 dark:text-indigo-100 mb-1')}>{t('mobile.family_plan', 'Plus Plan: 2/3 Members')}</Text>
            <Text style={tw('text-sm text-indigo-700 dark:text-indigo-300 leading-5')}>{t('mobile.family_plan_desc', 'Invite family members to receive task reminders and view your progress.')}</Text>
          </View>
        </View>

        {/* Add Button */}
        <TouchableOpacity 
          onPress={() => setInviteModalVisible(true)}
          style={tw('flex-row items-center justify-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-2xl mb-6')}
        >
          <Plus color={twInstance.color('text-slate-500')} size={20} />
          <Text style={tw('font-bold text-slate-600 dark:text-slate-400 ml-2')}>{t('mobile.invite_member', 'Invite Family Member')}</Text>
        </TouchableOpacity>

        {/* List */}
        <Text style={tw('font-bold text-lg text-slate-900 dark:text-white mb-4')}>{t('mobile.linked_members', 'Linked Members')}</Text>
        
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : members.length > 0 ? (
          members.map(member => (
            <View key={member.id} style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-100 dark:border-slate-800 flex-row items-center shadow-sm')}>
              <Image source={{ uri: member.avatar }} style={tw('w-12 h-12 rounded-full mr-3 bg-slate-200 dark:bg-slate-800')} />
              <View style={tw('flex-1')}>
                <Text style={tw('font-bold text-slate-900 dark:text-white text-base')} numberOfLines={1}>{member.name}</Text>
                <View style={tw('flex-row items-center mt-1')}>
                  {member.status === 'active' ? (
                    <View style={tw('flex-row items-center')}>
                      <CheckCircle2 color="#10b981" size={14} />
                      <Text style={tw('text-emerald-600 dark:text-emerald-400 text-xs font-semibold ml-1')}>{t('mobile.active', 'Active')}</Text>
                    </View>
                  ) : member.status === 'paused' ? (
                    <View style={tw('flex-row items-center')}>
                      <PauseCircle color="#f59e0b" size={14} />
                      <Text style={tw('text-amber-500 dark:text-amber-400 text-xs font-semibold ml-1')}>{t('mobile.paused', 'Paused')}</Text>
                    </View>
                  ) : (
                    <View style={tw('flex-row items-center')}>
                      <Text style={tw('text-amber-500 dark:text-amber-400 text-xs font-semibold')}>{t('mobile.pending_invite', 'Pending Invite')}</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setSelectedMember(member);
                  setSettingsModalVisible(true);
                }}
                style={tw('p-2 bg-slate-50 dark:bg-slate-800 rounded-full')}
              >
                <Settings color={twInstance.color('text-slate-500 dark:text-slate-400')} size={20} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={inviteModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.invite_member', `Invite Member`)}</Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <X color={twInstance.color('text-slate-500')} size={24} />
              </TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>{t('mobile.email_address', `Email Address`)}</Text>
              <TextInput
                value={emailToInvite}
                onChangeText={setEmailToInvite}
                placeholder="family@example.com"
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={tw('text-xs text-slate-500 mt-2')}>{t('mobile.invite_note', 'Note: The invited person must have a regular Patient account registered with this email.')}</Text>
            </View>
            <TouchableOpacity onPress={handleInvite} style={tw('bg-brand py-4 rounded-xl items-center mt-2')}>
              <Text style={tw('text-slate-900 font-bold text-base')}>{t('mobile.send_invite', `Send Invite`)}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings/Permissions Modal */}
      <Modal visible={settingsModalVisible} animationType="slide" transparent={true}>
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.member_permissions', `Member Permissions`)}</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <X color={twInstance.color('text-slate-500')} size={24} />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <View>
                <View style={tw('flex-row items-center mb-6')}>
                  <Image source={{ uri: selectedMember.avatar }} style={tw('w-10 h-10 rounded-full mr-3 bg-slate-200 dark:bg-slate-800')} />
                  <Text style={tw('font-bold text-slate-900 dark:text-white text-base')} numberOfLines={1}>{selectedMember.name}</Text>
                </View>

                {/* Toggles */}
                <View style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-6')}>
                  <View style={tw('flex-row justify-between items-center mb-4')}>
                    <View style={tw('flex-1 pr-4')}>
                      <Text style={tw('font-bold text-slate-900 dark:text-white')}>{t('mobile.receive_reminders', 'Receive Reminders')}</Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>{t('mobile.receive_reminders_desc', 'Send push notifications if tasks are missed')}</Text>
                    </View>
                    <Switch 
                      value={selectedMember.permissions.receiveReminders} 
                      onValueChange={() => togglePermission('receiveReminders')}
                      trackColor={{ false: twInstance.color('slate-300'), true: twInstance.color('emerald-500') }}
                    />
                  </View>

                  <View style={tw('w-full h-[1px] bg-slate-200 dark:bg-slate-800 mb-4')} />

                  <View style={tw('flex-row justify-between items-center')}>
                    <View style={tw('flex-1 pr-4')}>
                      <Text style={tw('font-bold text-slate-900 dark:text-white')}>{t('mobile.view_progress', 'View Progress')}</Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>{t('mobile.view_progress_desc', 'Allow viewing health metrics and general progress')}</Text>
                    </View>
                    <Switch 
                      value={selectedMember.permissions.viewProgress} 
                      onValueChange={() => togglePermission('viewProgress')}
                      trackColor={{ false: twInstance.color('slate-300'), true: twInstance.color('emerald-500') }}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={tw('flex-row gap-3')}>
                  {selectedMember.status !== 'pending' && (
                    <TouchableOpacity 
                      onPress={handlePauseResume} 
                      style={tw(`flex-1 flex-row items-center justify-center py-4 rounded-xl ${selectedMember.status === 'active' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`)}
                    >
                      {selectedMember.status === 'active' ? (
                        <>
                          <PauseCircle color={twInstance.color('text-amber-600')} size={20} />
                          <Text style={tw('text-amber-700 dark:text-amber-500 font-bold ml-2')}>{t('mobile.pause_access', 'Pause Access')}</Text>
                        </>
                      ) : (
                        <>
                          <PlayCircle color={twInstance.color('text-emerald-600')} size={20} />
                          <Text style={tw('text-emerald-700 dark:text-emerald-500 font-bold ml-2')}>{t('mobile.resume_access', 'Resume Access')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleRevoke} style={tw('flex-1 flex-row items-center justify-center py-4 bg-red-50 dark:bg-red-900/20 rounded-xl')}>
                    <UserX color={twInstance.color('text-red-500')} size={20} />
                    <Text style={tw('text-red-600 dark:text-red-400 font-bold ml-2')}>{t('mobile.revoke_access', 'Revoke Access')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
