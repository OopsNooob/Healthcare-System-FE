import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Building2, MapPin, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";

export function MedicalFacilities() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const facilities = [
    {
      id: 1,
      name: "Central Heart Hospital",
      address: "123 Health Ave, District 1, HCMC",
      specialty: "Cardiology",
      status: "verified",
      submittedBy: "API_Maps",
      submittedDate: "2024-05-12"
    },
    {
      id: 2,
      name: "City Care Clinic",
      address: "45 Wellness Blvd, District 3, HCMC",
      specialty: "General",
      status: "pending",
      submittedBy: "User_Suggest",
      submittedDate: "2024-05-14"
    },
    {
      id: 3,
      name: "Endocrinology Center",
      address: "78 Sugar Free St, District 5, HCMC",
      specialty: "Endocrinology",
      status: "rejected",
      submittedBy: "User_Suggest",
      submittedDate: "2024-05-10"
    }
  ];

  return (
    <div className="w-full p-6">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t("sidebar.medicalFacilities", "Medical Facilities")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review and manage medical facilities on the map.</p>
          </div>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={t("docVerification.searchPlaceholder", "Search facility name...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand dark:focus:border-brand"
            />
          </div>
          <select className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm outline-none text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">FACILITY</th>
                <th className="px-6 py-4">LOCATION</th>
                <th className="px-6 py-4">SUBMITTED</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {facilities.map((fac) => (
                <tr key={fac.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Building2 className="text-indigo-600 dark:text-indigo-400" size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{fac.name}</div>
                        <div className="text-xs text-slate-500">{fac.specialty}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="truncate max-w-[200px]">{fac.address}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{fac.submittedDate}</div>
                    <div className="text-xs text-slate-400">By {fac.submittedBy}</div>
                  </td>
                  <td className="px-6 py-4">
                    {fac.status === "verified" && (
                      <Badge variant="default" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none hover:bg-emerald-50">
                        <CheckCircle2 size={12} className="mr-1" /> Verified
                      </Badge>
                    )}
                    {fac.status === "pending" && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none hover:bg-amber-50">
                        <Clock size={12} className="mr-1" /> Pending
                      </Badge>
                    )}
                    {fac.status === "rejected" && (
                      <Badge variant="destructive" className="bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-none hover:bg-rose-50">
                        <XCircle size={12} className="mr-1" /> Rejected
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {fac.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-lg transition-colors">
                          Approve
                        </button>
                        <button className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 rounded-lg transition-colors">
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
