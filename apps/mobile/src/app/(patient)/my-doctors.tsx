import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, MessageCircle, Video, MapPin, Search, ArrowRight, X, Clock, ShieldCheck, Mail, Phone, Calendar } from 'lucide-react-native';
import { tw } from '@/tw';

type DoctorStatus = 'unrequested' | 'pending' | 'accepted';

export default function MyDoctorsScreen() {
  const router = useRouter();

  const [doctors, setDoctors] = useState([
    {
      id: 1,
      name: 'Dr. Sarah Connor',
      specialty: 'Cardiologist',
      hospital: 'Central Heart Hospital',
      rating: 4.9,
      reviews: 128,
      image: 'https://i.pravatar.cc/150?img=1',
      lastVisit: '12 Aug 2023',
      status: 'accepted' as DoctorStatus,
      experience: 15,
      email: 'sarah.connor@hospital.com',
      phone: '+1 234 567 8900'
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      specialty: 'Dermatologist',
      hospital: 'Skin Care Clinic',
      rating: 4.8,
      reviews: 94,
      image: 'https://i.pravatar.cc/150?img=3',
      lastVisit: '05 Jul 2023',
      status: 'pending' as DoctorStatus,
      experience: 8,
      email: 'm.chen@skinclinic.com',
      phone: '+1 987 654 3210'
    },
    {
      id: 3,
      name: 'Dr. Emily Watson',
      specialty: 'Pediatrician',
      hospital: 'City Children Hospital',
      rating: 5.0,
      reviews: 312,
      image: 'https://i.pravatar.cc/150?img=5',
      lastVisit: '10 Jun 2023',
      status: 'unrequested' as DoctorStatus,
      experience: 12,
      email: 'ewatson@citykids.org',
      phone: '+1 555 123 4567'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [patientNote, setPatientNote] = useState('');
  const [selectedDate, setSelectedDate] = useState('2023-10-25');
  const [selectedTime, setSelectedTime] = useState('09:00 AM');

  const availableTimes = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:30 PM'];

  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenProfile = (doc: any) => {
    setSelectedDoctor(doc);
    setProfileModalVisible(true);
  };

  const handleOpenRequest = (doc: any) => {
    setSelectedDoctor(doc);
    setPatientNote('');
    setRequestModalVisible(true);
  };

  const handleSendRequest = () => {
    if (!selectedDoctor) return;
    
    setDoctors(prev => prev.map(d => 
      d.id === selectedDoctor.id ? { ...d, status: 'pending' as DoctorStatus } : d
    ));
    
    setRequestModalVisible(false);
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw('px-6 pt-6 pb-4')}>
          <Text style={tw('text-2xl font-bold text-slate-900')}>My Doctors</Text>
          <Text style={tw('text-slate-500 text-sm mt-1')}>Find and connect with verified healthcare specialists</Text>
          
          <View style={tw('mt-4 flex-row items-center bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm')}>
            <Search color="#94a3b8" size={20} style={tw('mr-2')} />
            <TextInput
              style={tw('flex-1 text-base text-slate-900')}
              placeholder="Search by name or specialty..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Doctors List */}
        <View style={tw('px-6 gap-4 mt-2')}>
          {filteredDoctors.map((doc) => (
            <TouchableOpacity 
              key={doc.id} 
              style={tw('bg-white rounded-3xl p-5 shadow-sm border border-slate-100')}
              onPress={() => handleOpenProfile(doc)}
              activeOpacity={0.7}
            >
              <View style={tw('flex-row gap-4')}>
                <Image 
                  source={{ uri: doc.image }} 
                  style={tw('w-20 h-20 rounded-2xl bg-slate-200')} 
                />
                <View style={tw('flex-1 justify-center')}>
                  <View style={tw('flex-row justify-between items-start mb-1')}>
                    <Text style={tw('text-lg font-bold text-slate-900')} numberOfLines={1}>{doc.name}</Text>
                    <View style={tw('flex-row items-center gap-1')}>
                      <Star color="#f59e0b" fill="#f59e0b" size={14} />
                      <Text style={tw('text-sm font-bold text-slate-700')}>{doc.rating}</Text>
                    </View>
                  </View>
                  
                  <Text style={tw('text-brand font-medium mb-1')}>{doc.specialty}</Text>
                  
                  <View style={tw('flex-row items-center gap-1')}>
                    <MapPin color="#94a3b8" size={14} />
                    <Text style={tw('text-xs text-slate-500')} numberOfLines={1}>{doc.hospital}</Text>
                  </View>
                </View>
              </View>
              
              <View style={tw('w-full h-[1px] bg-slate-100 my-4')} />
              
              <View style={tw('flex-row justify-between items-center')}>
                <Text style={tw('text-xs text-slate-400 font-medium')}>Last visit: {doc.lastVisit}</Text>
                
                <View style={tw('flex-row gap-2')}>
                  {doc.status === 'accepted' && (
                    <>
                      <TouchableOpacity 
                        style={tw('w-10 h-10 rounded-full bg-brand/10 items-center justify-center')}
                        onPress={() => router.push('/(patient)/doctor-chat')}
                      >
                        <MessageCircle color="#a3e635" size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={tw('w-10 h-10 rounded-full bg-brand/10 items-center justify-center')}
                        onPress={() => router.push('/(patient)/video-call')}
                      >
                        <Video color="#a3e635" size={20} />
                      </TouchableOpacity>
                    </>
                  )}
                  {doc.status === 'pending' && (
                    <View style={tw('flex-row items-center px-4 py-2 bg-amber-50 rounded-full border border-amber-100')}>
                      <Clock color="#d97706" size={14} />
                      <Text style={tw('text-amber-600 font-semibold text-xs ml-1')}>Pending</Text>
                    </View>
                  )}
                  {doc.status === 'unrequested' && (
                    <TouchableOpacity 
                      style={tw('flex-row items-center px-4 py-2 bg-brand rounded-full')}
                      onPress={() => handleOpenRequest(doc)}
                    >
                      <Text style={tw('text-slate-900 font-bold text-sm')}>Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Doctor Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <SafeAreaView style={tw('flex-1 bg-slate-50')}>
          {/* Header */}
          <View style={tw('flex-row items-center justify-between p-4 bg-white border-b border-slate-100')}>
            <Text style={tw('text-xl font-bold text-slate-900')}>Doctor Profile</Text>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={tw('p-2')}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          {selectedDoctor && (
            <ScrollView contentContainerStyle={tw('p-6')} showsVerticalScrollIndicator={false}>
              {/* Doctor Header */}
              <View style={tw('items-center mb-8')}>
                <Image source={{ uri: selectedDoctor.image }} style={tw('w-32 h-32 rounded-full mb-4 border-4 border-white shadow-sm bg-slate-200')} />
                <Text style={tw('text-2xl font-bold text-slate-900')}>{selectedDoctor.name}</Text>
                <Text style={tw('text-base text-brand font-medium mb-2')}>{selectedDoctor.specialty}</Text>
                
                <View style={tw('flex-row gap-2 mt-2')}>
                  <View style={tw('bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex-row items-center')}>
                    <ShieldCheck color="#3b82f6" size={14} />
                    <Text style={tw('text-blue-600 font-bold text-xs ml-1')}>Verified</Text>
                  </View>
                </View>
              </View>

              {/* Stats & Rating */}
              <View style={tw('flex-row bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm')}>
                <View style={tw('flex-1 items-center border-r border-slate-100')}>
                  <Text style={tw('text-3xl font-bold text-slate-900')}>{selectedDoctor.rating}</Text>
                  <View style={tw('flex-row my-1')}>
                    {[1,2,3,4,5].map(i => <Star key={i} color="#f59e0b" fill={i <= Math.round(selectedDoctor.rating) ? "#f59e0b" : "transparent"} size={12} />)}
                  </View>
                  <Text style={tw('text-xs text-slate-500 font-medium')}>{selectedDoctor.reviews} reviews</Text>
                </View>
                <View style={tw('flex-1 items-center justify-center')}>
                  <Text style={tw('text-3xl font-bold text-slate-900')}>{selectedDoctor.experience}</Text>
                  <Text style={tw('text-xs text-slate-500 font-medium mt-2')}>Years Exp.</Text>
                </View>
              </View>

              {/* Basic Info */}
              <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 mb-3')}>Professional Info</Text>
              <View style={tw('bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6')}>
                <View style={tw('flex-row items-center p-4 border-b border-slate-50')}>
                  <View style={tw('w-10 h-10 bg-slate-50 rounded-xl items-center justify-center mr-3')}>
                    <MapPin color="#64748b" size={20} />
                  </View>
                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-400 uppercase')}>Workplace</Text>
                    <Text style={tw('text-base font-semibold text-slate-800')}>{selectedDoctor.hospital}</Text>
                  </View>
                </View>
                <View style={tw('flex-row items-center p-4 border-b border-slate-50')}>
                  <View style={tw('w-10 h-10 bg-slate-50 rounded-xl items-center justify-center mr-3')}>
                    <Mail color="#64748b" size={20} />
                  </View>
                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-400 uppercase')}>Email</Text>
                    <Text style={tw('text-base font-semibold text-slate-800')}>{selectedDoctor.email}</Text>
                  </View>
                </View>
                <View style={tw('flex-row items-center p-4')}>
                  <View style={tw('w-10 h-10 bg-slate-50 rounded-xl items-center justify-center mr-3')}>
                    <Phone color="#64748b" size={20} />
                  </View>
                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-400 uppercase')}>Phone</Text>
                    <Text style={tw('text-base font-semibold text-slate-800')}>{selectedDoctor.phone}</Text>
                  </View>
                </View>
              </View>

              {/* Reviews Mock */}
              <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 mb-3')}>Recent Reviews</Text>
              <View style={tw('bg-white rounded-2xl border border-slate-100 p-4 mb-6')}>
                <View style={tw('flex-row justify-between mb-2')}>
                  <Text style={tw('font-bold text-slate-900')}>John Doe</Text>
                  <View style={tw('flex-row')}><Star color="#f59e0b" fill="#f59e0b" size={12} /><Star color="#f59e0b" fill="#f59e0b" size={12} /><Star color="#f59e0b" fill="#f59e0b" size={12} /><Star color="#f59e0b" fill="#f59e0b" size={12} /><Star color="#f59e0b" fill="#f59e0b" size={12} /></View>
                </View>
                <Text style={tw('text-sm text-slate-600')}>Very professional and attentive. Answered all my questions clearly.</Text>
              </View>

            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Request Consultation Modal */}
      <Modal
        visible={requestModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-center items-center bg-black/50 p-4')}
        >
          {selectedDoctor && (
            <View style={tw('w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl')}>
              <View style={tw('p-6 border-b border-slate-100 flex-row justify-between items-center')}>
                <View>
                  <Text style={tw('text-xl font-bold text-slate-900')}>Request Consultation</Text>
                  <Text style={tw('text-sm text-slate-500 mt-1')}>Provide some initial details</Text>
                </View>
                <TouchableOpacity onPress={() => setRequestModalVisible(false)} style={tw('p-2 bg-slate-50 rounded-xl')}>
                  <X color="#64748b" size={20} />
                </TouchableOpacity>
              </View>

              <View style={tw('p-6')}>
                <View style={tw('flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl mb-6')}>
                  <Image source={{ uri: selectedDoctor.image }} style={tw('w-12 h-12 rounded-full')} />
                  <View>
                    <Text style={tw('font-bold text-lg text-slate-900')}>{selectedDoctor.name}</Text>
                    <Text style={tw('text-sm text-slate-600')}>{selectedDoctor.specialty}</Text>
                  </View>
                </View>

                {/* Booking Date & Time */}
                <Text style={tw('text-base font-bold text-slate-900 mb-2')}>Select Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw('mb-4 -mx-6 px-6')} contentContainerStyle={tw('gap-3 pr-12')}>
                  {['2023-10-25', '2023-10-26', '2023-10-27', '2023-10-28'].map(date => (
                    <TouchableOpacity 
                      key={date}
                      onPress={() => setSelectedDate(date)}
                      style={tw(`px-4 py-3 rounded-2xl border ${selectedDate === date ? 'bg-brand border-brand' : 'bg-slate-50 border-slate-200'}`)}
                    >
                      <Text style={tw(`text-sm font-bold ${selectedDate === date ? 'text-slate-900' : 'text-slate-500'}`)}>
                        {date.split('-')[2]} Oct
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={tw('text-base font-bold text-slate-900 mb-2')}>Select Time Slot</Text>
                <View style={tw('flex-row flex-wrap gap-2 mb-6')}>
                  {availableTimes.map(time => (
                    <TouchableOpacity 
                      key={time}
                      onPress={() => setSelectedTime(time)}
                      style={tw(`px-3 py-2 rounded-xl border ${selectedTime === time ? 'bg-brand border-brand' : 'bg-slate-50 border-slate-200'}`)}
                    >
                      <Text style={tw(`text-xs font-bold ${selectedTime === time ? 'text-slate-900' : 'text-slate-500'}`)}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={tw('text-base font-bold text-slate-900 mb-2')}>Reason for consultation</Text>
                <TextInput
                  style={tw('bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[100px] text-base text-slate-800')}
                  placeholder="Please describe what you are experiencing..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  value={patientNote}
                  onChangeText={setPatientNote}
                />
              </View>

              <View style={tw('p-4 border-t border-slate-100 bg-slate-50 flex-row justify-end gap-3')}>
                <TouchableOpacity 
                  style={tw('px-6 py-3 rounded-xl border border-slate-300 bg-white')}
                  onPress={() => setRequestModalVisible(false)}
                >
                  <Text style={tw('font-bold text-slate-700')}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={tw(`flex-row items-center px-6 py-3 rounded-xl ${patientNote.trim().length > 0 ? 'bg-brand' : 'bg-slate-200'}`)}
                  disabled={patientNote.trim().length === 0}
                  onPress={handleSendRequest}
                >
                  <Text style={tw(`font-bold mr-2 ${patientNote.trim().length > 0 ? 'text-slate-900' : 'text-slate-400'}`)}>Send Request</Text>
                  <ArrowRight color={patientNote.trim().length > 0 ? "#0f172a" : "#94a3b8"} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
