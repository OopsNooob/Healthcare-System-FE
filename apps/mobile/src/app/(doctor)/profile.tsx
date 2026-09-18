import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Mail, Phone, MapPin, Stethoscope, LogOut, FileText, Pencil, Trash2, Plus, Radical, Building, ShieldCheck } from 'lucide-react-native';
import { tw } from '@/tw';

export default function DoctorProfileScreen() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: 'Dr. Sarah Connor',
    email: 'sarah.connor@hospital.com',
    phone: '+1 234 567 8900',
    gender: 'Female',
    street: '456 Medical Blvd',
    ward: 'Ward 2',
    district: 'District 3',
    city: 'Metropolis',
    experience: '15',
    specialty: 'Cardiologist',
    workplace: 'Central Heart Hospital'
  });

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
      >
        <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={tw('px-6 pt-6 pb-4 flex-row justify-between items-center')}>
            <Text style={tw('text-2xl font-bold text-slate-900')}>My Profile</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <LogOut color="#ef4444" size={24} />
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={tw('items-center mb-8 mt-2')}>
            <View style={tw('relative')}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?img=1' }} 
                style={tw('w-32 h-32 rounded-full bg-slate-200 border-4 border-white shadow-sm')} 
              />
              <TouchableOpacity style={tw('absolute bottom-0 right-2 w-10 h-10 bg-slate-900 rounded-full items-center justify-center border-4 border-white shadow-sm')}>
                <Camera color="#ffffff" size={16} />
              </TouchableOpacity>
            </View>
            <View style={tw('mt-4 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200 flex-row items-center')}>
              <Stethoscope color="#3b82f6" size={14} />
              <Text style={tw('text-blue-700 font-bold text-xs ml-1')}>Doctor</Text>
            </View>
          </View>

          {/* Basic Info Form */}
          <View style={tw('px-6')}>
            <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 mb-4')}>Basic Information</Text>
            
            <View style={tw('bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-6')}>
              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Full Name</Text>
                <TextInput
                  style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 font-medium')}
                  value={form.fullName}
                  onChangeText={(t) => setForm({...form, fullName: t})}
                />
              </View>

              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Email</Text>
                <View style={tw('bg-slate-100 border border-slate-200 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Mail color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-500 font-medium')}
                    value={form.email}
                    editable={false}
                  />
                </View>
              </View>

              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Phone Number</Text>
                <View style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Phone color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 font-medium')}
                    value={form.phone}
                    onChangeText={(t) => setForm({...form, phone: t})}
                  />
                </View>
              </View>

              <View>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Gender</Text>
                <TextInput
                  style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 font-medium')}
                  value={form.gender}
                  onChangeText={(t) => setForm({...form, gender: t})}
                />
              </View>
            </View>

            {/* Address Form */}
            <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 mb-4')}>Contact Address</Text>
            
            <View style={tw('bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-6')}>
              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Street</Text>
                <View style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 flex-row items-center')}>
                  <MapPin color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 font-medium')}
                    value={form.street}
                    onChangeText={(t) => setForm({...form, street: t})}
                  />
                </View>
              </View>

              <View style={tw('flex-row gap-4 mb-4')}>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Ward</Text>
                  <TextInput
                    style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 font-medium')}
                    value={form.ward}
                    onChangeText={(t) => setForm({...form, ward: t})}
                  />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>District</Text>
                  <TextInput
                    style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 font-medium')}
                    value={form.district}
                    onChangeText={(t) => setForm({...form, district: t})}
                  />
                </View>
              </View>

              <View>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>City</Text>
                <TextInput
                  style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 font-medium')}
                  value={form.city}
                  onChangeText={(t) => setForm({...form, city: t})}
                />
              </View>
            </View>

            {/* Professional Info */}
            <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 mb-4')}>Professional Information</Text>
            
            <View style={tw('bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-6')}>
              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Specialty</Text>
                <View style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Stethoscope color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 font-medium')}
                    value={form.specialty}
                    onChangeText={(t) => setForm({...form, specialty: t})}
                  />
                </View>
              </View>

              <View style={tw('mb-4')}>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Workplace</Text>
                <View style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Building color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 font-medium')}
                    value={form.workplace}
                    onChangeText={(t) => setForm({...form, workplace: t})}
                  />
                </View>
              </View>

              <View>
                <Text style={tw('text-xs font-bold text-slate-500 uppercase tracking-wider mb-2')}>Years of Experience</Text>
                <View style={tw('bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 flex-row items-center')}>
                  <Radical color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 font-medium')}
                    value={form.experience}
                    keyboardType="numeric"
                    onChangeText={(t) => setForm({...form, experience: t})}
                  />
                </View>
              </View>
            </View>

            {/* Verification Documents */}
            <View style={tw('bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-8')}>
              <View style={tw('flex-row justify-between items-center mb-4')}>
                <View>
                  <Text style={tw('text-base font-bold text-slate-900')}>Verification Documents</Text>
                  <Text style={tw('text-xs text-slate-500')}>Upload new files or replace existing docs.</Text>
                </View>
                <TouchableOpacity style={tw('bg-slate-900 px-3 py-2 rounded-xl flex-row items-center')}>
                  <Plus color="#ffffff" size={14} style={tw('mr-1')} />
                  <Text style={tw('text-white font-bold text-xs')}>Add Docs</Text>
                </TouchableOpacity>
              </View>
              
              <View style={tw('border border-slate-100 bg-slate-50 rounded-2xl p-4')}>
                <View style={tw('flex-row items-center justify-between')}>
                  <View style={tw('flex-row items-center flex-1 mr-2')}>
                    <View style={tw('bg-blue-50 w-10 h-10 rounded-xl items-center justify-center mr-3')}>
                      <FileText color="#3b82f6" size={20} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('font-bold text-slate-800 text-sm')} numberOfLines={1}>Medical_License_2023.pdf</Text>
                      <Text style={tw('text-xs text-slate-500')}>Uploaded Oct 12, 2023</Text>
                    </View>
                  </View>
                  <View style={tw('flex-row gap-2')}>
                    <TouchableOpacity style={tw('w-8 h-8 rounded-lg border border-slate-200 bg-white items-center justify-center')}>
                      <Pencil color="#64748b" size={14} />
                    </TouchableOpacity>
                    <TouchableOpacity style={tw('w-8 h-8 rounded-lg border border-red-200 bg-red-50 items-center justify-center')}>
                      <Trash2 color="#ef4444" size={14} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={tw('bg-slate-900 h-14 rounded-2xl items-center justify-center shadow-md')}>
              <Text style={tw('text-white font-bold text-lg')}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
