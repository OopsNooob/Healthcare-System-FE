import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Building2, MapPin, Phone, Navigation, Clock, ShieldCheck, HeartPulse } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface FacilityDetailModalProps {
  visible: boolean;
  onClose: () => void;
  facility?: {
    id: string;
    name: string;
    specialty: string;
    address: string;
    distance: string;
    verified: boolean;
    phone?: string;
    hours?: string;
  };
}

export const FacilityDetailModal: React.FC<FacilityDetailModalProps> = ({
  visible,
  onClose,
  facility,
}) => {
  const { t } = useTranslation();

  const currentFacility = facility || {
    id: '1',
    name: 'Metropolis General Hospital',
    specialty: 'Multispecialty • Emergency Care',
    address: '100 Healthcare Blvd, District 1, Metropolis',
    distance: '1.2 km',
    verified: true,
    phone: '+1 800 555 0199',
    hours: '24/7 Emergency Care',
  };

  const handleCall = () => {
    Toast.show({
      type: 'info',
      text1: t('mobile.calling_facility', 'Calling Medical Facility'),
      text2: `${currentFacility.name}: ${currentFacility.phone || '+1 800 555 0199'}`,
    });
  };

  const handleDirections = () => {
    Toast.show({
      type: 'info',
      text1: t('mobile.launching_navigation', 'Opening Navigation Map'),
      text2: `${t('mobile.destination', 'Route to')}: ${currentFacility.address}`,
    });
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 items-center justify-center mr-3')}>
                <Building2 color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={24} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {currentFacility.name}
                </Text>
                <View style={tw('flex-row items-center mt-0.5')}>
                  <HeartPulse color="#ef4444" size={12} style={tw('mr-1')} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{currentFacility.specialty}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Quick Badges */}
            <View style={tw('flex-row gap-2')}>
              {currentFacility.verified && (
                <View style={tw('bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800/40 flex-row items-center')}>
                  <ShieldCheck color="#3b82f6" size={14} style={tw('mr-1')} />
                  <Text style={tw('text-xs font-bold text-blue-600 dark:text-blue-300')}>{t('mobile.verified_facility', 'Verified Center')}</Text>
                </View>
              )}
              <View style={tw('bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full flex-row items-center')}>
                <Clock color={twInstance.color('text-slate-500')} size={14} style={tw('mr-1')} />
                <Text style={tw('text-xs font-medium text-slate-600 dark:text-slate-300')}>{currentFacility.hours || '24/7'}</Text>
              </View>
            </View>

            {/* Address & Distance */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
              <View style={tw('flex-row items-start mb-2')}>
                <MapPin color={twInstance.color('text-slate-400')} size={18} style={tw('mr-2.5 mt-0.5')} />
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200')}>
                    {t('mobile.address', 'Address')}
                  </Text>
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-400 mt-0.5')}>
                    {currentFacility.address}
                  </Text>
                </View>
                <View style={tw('bg-brand/10 dark:bg-brand/20 px-2 py-0.5 rounded-md')}>
                  <Text style={tw('text-xs font-bold text-brand-dark dark:text-brand-light')}>{currentFacility.distance}</Text>
                </View>
              </View>

              <View style={tw('flex-row items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-800')}>
                <Phone color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                <Text style={tw('text-xs font-medium text-slate-700 dark:text-slate-300 flex-1')}>
                  {currentFacility.phone || '+1 800 555 0199'}
                </Text>
              </View>
            </View>

            {/* Services Available */}
            <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2')}>
                {t('mobile.specialized_departments', 'Specialized Departments')}
              </Text>
              <View style={tw('flex-row flex-wrap gap-2')}>
                {[
                  t('mobile.cardiology', 'Cardiology'),
                  t('mobile.endocrinology', 'Endocrinology'),
                  t('mobile.icu_emergency', 'ICU & Emergency'),
                  t('mobile.lab_diagnostics', 'Clinical Laboratory'),
                ].map((dep, idx) => (
                  <View key={idx} style={tw('bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl')}>
                    <Text style={tw('text-xs text-slate-700 dark:text-slate-300 font-medium')}>{dep}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Row */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={handleDirections}
              style={tw('flex-1 bg-brand py-3.5 rounded-xl flex-row items-center justify-center')}
            >
              <Navigation color="#0f172a" size={18} style={tw('mr-2')} />
              <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.directions', 'Directions')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCall}
              style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl flex-row items-center justify-center border border-slate-200 dark:border-slate-700')}
            >
              <Phone color={twInstance.color('text-slate-700 dark:text-slate-300')} size={18} style={tw('mr-2')} />
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.call_now', 'Call Now')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
