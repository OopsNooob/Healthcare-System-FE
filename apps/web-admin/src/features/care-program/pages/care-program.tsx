import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, FileText, Settings, PlayCircle, Clock } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";

export function CareProgram() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("templates");
  
  const programs = [
    {
      id: 1,
      name: "Hypertension Management",
      version: "v1.2",
      status: "published",
      patients: 1245,
      lastUpdated: "2024-05-15"
    },
    {
      id: 2,
      name: "Diabetes Care",
      version: "v2.0",
      status: "draft",
      patients: 0,
      lastUpdated: "2024-05-18"
    }
  ];

  const rules = [
    {
      id: 1,
      program: "Hypertension Management",
      condition: "Systolic > 140 OR Diastolic > 90",
      severity: "Attention",
      action: "Send Doctor Alert"
    },
    {
      id: 2,
      program: "Hypertension Management",
      condition: "Systolic > 180 OR Diastolic > 120",
      severity: "Urgent",
      action: "Emergency Protocol"
    },
    {
      id: 3,
      program: "Diabetes Care",
      condition: "Glucose > 200 mg/dL",
      severity: "Attention",
      action: "Task: Retest in 2 hours"
    }
  ];

  return (
    <div className="w-full p-6">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm min-h-[80vh]">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t("sidebar.careProgram", "Care Program & Rules")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage health tracking programs and threshold rules.</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-brand/90 transition-colors">
            <Plus size={18} />
            {activeTab === "templates" ? "Create Program" : "Add Rule"}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "templates"
                ? "border-brand text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            Program Templates
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "rules"
                ? "border-brand text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            Rule Engine Builder
          </button>
        </div>

        {activeTab === "templates" && (
          <div>
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search programs..."
                className="w-full md:w-1/3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand dark:focus:border-brand"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map(prog => (
                <div key={prog.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-brand dark:hover:border-brand transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                      <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                    </div>
                    {prog.status === "published" ? (
                      <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-none dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-50">
                        <PlayCircle size={12} className="mr-1" /> Published
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-none dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100">
                        <Clock size={12} className="mr-1" /> Draft
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{prog.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <span>{prog.version}</span>
                    <span>•</span>
                    <span>{prog.patients.toLocaleString()} enrolled</span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    <span className="text-xs text-slate-400">Updated {prog.lastUpdated}</span>
                    <Settings className="text-slate-400 group-hover:text-brand-dark transition-colors" size={18} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">PROGRAM</th>
                  <th className="px-6 py-4">CONDITION</th>
                  <th className="px-6 py-4">SEVERITY</th>
                  <th className="px-6 py-4">ACTION</th>
                  <th className="px-6 py-4">EDIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{rule.program}</td>
                    <td className="px-6 py-4 font-mono text-xs bg-slate-50 dark:bg-slate-950 p-2 rounded m-2 inline-block text-indigo-600 dark:text-indigo-400">{rule.condition}</td>
                    <td className="px-6 py-4">
                      {rule.severity === "Urgent" ? (
                        <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded dark:bg-rose-900/30 dark:text-rose-400">{rule.severity}</span>
                      ) : (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded dark:bg-amber-900/30 dark:text-amber-400">{rule.severity}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{rule.action}</td>
                    <td className="px-6 py-4">
                      <button className="text-slate-400 hover:text-brand-dark transition-colors">
                        <Settings size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
