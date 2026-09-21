import { useState, useEffect } from "react";
import { Calendar, Clock, Video, XCircle, Search, Filter, Database } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";

interface Appointment {
  time: string;
  patient: string;
  doctor: string;
  type: string;
  status: string;
}

export function AppointmentManagement() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setAppointments([
        { time: "09:00 AM", patient: "Vu Quoc Huy", doctor: "Dr. Sarah Connor", type: "Video Call", status: "Completed" },
        { time: "In Session", patient: "Do Dinh Khang", doctor: "Dr. John Doe", type: "Video Call", status: "In Progress" },
        { time: "Queue #1", patient: "Nguyen Van A", doctor: "Dr. John Doe", type: "Chat", status: "Waiting" },
        { time: "11:30 AM", patient: "Tran Thi B", doctor: "Dr. Sarah Connor", type: "Video Call", status: "Scheduled" },
        { time: "10:00 AM", patient: "Le Van C", doctor: "Dr. Emily Chen", type: "Chat", status: "Canceled" },
      ]);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const filteredAppointments = appointments.filter(apt =>
    apt.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.doctor.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments & Queue</h1>
          <p className="text-gray-500 mt-1">Monitor all appointments, wait times, and system queue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-gray-500">Total Today</p>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">42</h3>
          <p className="text-xs text-green-500 font-medium mt-2">+12% from yesterday</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <Video className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">28</h3>
          <p className="text-xs text-gray-400 font-medium mt-2">66% Completion Rate</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-gray-500">Canceled / No-show</p>
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">3</h3>
          <p className="text-xs text-gray-400 font-medium mt-2">7% Cancelation Rate</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-gray-500">Avg Wait Time</p>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">8.5 min</h3>
          <p className="text-xs text-red-500 font-medium mt-2">+1.5m than average</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Today's Queue & Appointments</h2>

          <div className="flex space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient or doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-56"
              />
            </div>
            <button className="flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <th className="px-6 py-3 font-medium">Time / Pos</th>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Doctor</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                  </tr>
                ))
              ) : filteredAppointments.length > 0 ? filteredAppointments.map((apt, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{apt.time}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{apt.patient}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-600">{apt.doctor}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center text-gray-600">
                      {apt.type === 'Video Call' ? <Video className="w-3 h-3 mr-1 text-gray-400" /> : null}
                      {apt.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      apt.status === 'Completed' ? 'default' :
                        apt.status === 'In Progress' ? 'default' :
                          apt.status === 'Waiting' || apt.status === 'Scheduled' ? 'secondary' : 'destructive'
                    } className={
                      apt.status === 'Completed' ? 'bg-green-500 hover:bg-green-600' :
                        apt.status === 'Waiting' || apt.status === 'Scheduled' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''
                    }>
                      {apt.status}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Database className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-gray-900 font-medium mb-1">No appointments found</h3>
                      <p className="text-gray-500 text-sm">Try adjusting your search filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
