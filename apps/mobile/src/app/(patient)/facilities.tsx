import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, ScrollView, TextInput, SafeAreaView, RefreshControl } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { ArrowLeft, MapPin, Search, ShieldCheck, Navigation, Phone, HeartPulse, Building2 } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export default function MedicalFacilitiesScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1200);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const filters = ['All', 'Cardiology', 'Endocrinology', 'General', 'Nearby'];

  const facilities = [
    {
      id: 1,
      name: 'Central Heart Hospital',
      address: '123 Health Ave, District 1',
      distance: '2.5 km',
      specialty: 'Cardiology',
      verified: true
    },
    {
      id: 2,
      name: 'City Care Clinic',
      address: '45 Wellness Blvd, District 3',
      distance: '5.0 km',
      specialty: 'General',
      verified: true
    },
    {
      id: 3,
      name: 'Endocrinology Center',
      address: '78 Sugar Free St, District 5',
      distance: '8.2 km',
      specialty: 'Endocrinology',
      verified: true
    }
  ];

  const filteredFacilities = facilities.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || f.specialty === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 dark:border-slate-800')}>
      <View style={tw('flex-row items-center mb-3')}>
        <View style={tw('w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl mr-3')} />
        <View style={tw('flex-1')}>
          <View style={tw('w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
          <View style={tw('w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
        </View>
      </View>
      <View style={tw('h-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4')} />
      <View style={tw('flex-row gap-3')}>
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw('items-center justify-center py-20')}>
      <View style={tw('w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4')}>
        <Building2 color={twInstance.color('text-slate-400')} size={32} />
      </View>
      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-2')}>{t('mobile.no_facilities_found', 'No facilities found')}</Text>
      <Text style={tw('text-slate-500 text-center px-6')}>{t('mobile.try_different_search', 'Try adjusting your search or filter to find medical facilities.')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('px-6 pt-6 pb-4 bg-white dark:bg-slate-900')}>
        <View style={tw('flex-row items-center mb-4')}>
          <TouchableOpacity onPress={() => router.back()} style={tw('p-2 -ml-2 mr-2')}>
            <ArrowLeft color={twInstance.color('text-slate-900 dark:text-white')} size={24} />
          </TouchableOpacity>
          <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.medical_facilities', 'Medical Facilities')}</Text>
        </View>

        <View style={tw('flex-row items-center bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm')}>
          <Search color={twInstance.color('text-slate-400')} size={20} style={tw('mr-2')} />
          <TextInput
            style={tw('flex-1 text-base text-slate-900 dark:text-white')}
            placeholder={t('mobile.search_facilities', 'Search hospital, clinic...')}
            placeholderTextColor={twInstance.color('text-slate-400')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={tw('bg-white dark:bg-slate-900 pb-2 border-b border-slate-100 dark:border-slate-800')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw('px-6 gap-2')}>
          {filters.map((filter) => (
            <TouchableOpacity 
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={tw(`px-4 py-2 rounded-full border ${activeFilter === filter ? 'bg-brand border-brand' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'}`)}
            >
              <Text style={tw(`font-bold text-sm ${activeFilter === filter ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'}`)}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView 
        contentContainerStyle={tw('p-6 pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={twInstance.color('text-slate-900 dark:text-white')} />}
      >
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : filteredFacilities.length > 0 ? (
          filteredFacilities.map((facility) => (
            <View key={facility.id} style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 dark:border-slate-800')}>
              <View style={tw('flex-row justify-between items-start mb-3')}>
                <View style={tw('flex-row items-center flex-1 pr-4')}>
                  <View style={tw('w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl items-center justify-center mr-3')}>
                    <Building2 color={twInstance.color('text-indigo-500')} size={24} />
                  </View>
                  <View>
                    <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>{facility.name}</Text>
                    <View style={tw('flex-row items-center mt-1')}>
                      <HeartPulse color={twInstance.color('text-rose-500')} size={14} />
                      <Text style={tw('text-sm text-slate-600 dark:text-slate-300 ml-1 font-medium')}>{facility.specialty}</Text>
                    </View>
                  </View>
                </View>
                {facility.verified && (
                  <View style={tw('bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-full')}>
                    <ShieldCheck color="#3b82f6" size={18} />
                  </View>
                )}
              </View>

              <View style={tw('flex-row items-center mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl')}>
                <MapPin color={twInstance.color('text-slate-400')} size={16} />
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400 ml-2 flex-1')}>{facility.address}</Text>
                <Text style={tw('text-sm font-bold text-slate-700 dark:text-slate-200')}>{facility.distance}</Text>
              </View>

              <View style={tw('flex-row gap-3')}>
                <TouchableOpacity style={tw('flex-1 bg-brand/10 dark:bg-brand/20 py-3 rounded-xl flex-row items-center justify-center')}>
                  <Navigation color={twInstance.color('text-brand-dark dark:text-brand-light')} size={18} />
                  <Text style={tw('text-brand-dark dark:text-brand-light font-bold ml-2')}>{t('mobile.directions', 'Directions')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3 rounded-xl flex-row items-center justify-center')}>
                  <Phone color={twInstance.color('text-slate-700 dark:text-slate-300')} size={18} />
                  <Text style={tw('text-slate-700 dark:text-slate-300 font-bold ml-2')}>{t('mobile.call', 'Call')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
