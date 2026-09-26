import { useState, useEffect } from 'react';
import { CreditCard, Eye, TrendingUp, Users, Search, Database } from 'lucide-react';
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface Transaction {
  id: string;
  user: string;
  amount: string;
  date: string;
  status: string;
}

export function PremiumManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"transactions" | "config" | "refunds">("transactions");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setTransactions([
        { id: "VN109283", user: "Vu Quoc Huy", amount: "199,000 VND", date: "Oct 15, 2026", status: "Success" },
        { id: "VN109284", user: "Do Dinh Khang", amount: "199,000 VND", date: "Oct 15, 2026", status: "Success" },
        { id: "VN109285", user: "Nguyen Van A", amount: "199,000 VND", date: "Oct 14, 2026", status: "Pending" },
        { id: "VN109286", user: "Tran Thi B", amount: "199,000 VND", date: "Oct 12, 2026", status: "Failed" },
      ]);
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const filteredTransactions = transactions.filter(t =>
    t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("premiumManagement.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t("premiumManagement.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-brand/10 dark:bg-brand/20 flex flex-col items-center justify-center mr-4">
            <TrendingUp className="w-6 h-6 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("premiumManagement.stats.totalRevenue")}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">24,500,000 VND</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex flex-col items-center justify-center mr-4">
            <CreditCard className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("premiumManagement.stats.successfulTransactions")}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">125</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 dark:bg-green-500/20 flex flex-col items-center justify-center mr-4">
            <Users className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("premiumManagement.stats.activeUsers")}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">89</h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-6">
        <div className="border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex space-x-6 mb-4 sm:mb-0">
            <button
              className={`font-medium pb-4 border-b-2 -mb-4 ${activeTab === 'transactions' ? 'border-brand text-brand' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => setActiveTab('transactions')}
            >
              {t("premiumManagement.tabs.transactions")}
            </button>
            <button
              className={`font-medium pb-4 border-b-2 -mb-4 ${activeTab === 'config' ? 'border-brand text-brand' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => setActiveTab('config')}
            >
              {t("premiumManagement.tabs.config", "Plans Config")}
            </button>
            <button
              className={`font-medium pb-4 border-b-2 -mb-4 ${activeTab === 'refunds' ? 'border-brand text-brand' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => setActiveTab('refunds')}
            >
              Refund Requests
            </button>
          </div>

          {activeTab === 'transactions' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("premiumManagement.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-64"
              />
            </div>
          )}
        </div>

        <div className="p-0 overflow-x-auto max-h-[500px] overflow-y-auto">
          {activeTab === 'transactions' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.transactionId")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.user")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.amount")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.date")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.status")}</th>
                  <th className="px-6 py-3 font-medium text-right">{t("premiumManagement.table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-6 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredTransactions.length > 0 ? filteredTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{tx.id}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{tx.user}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{tx.amount}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{tx.date}</td>
                    <td className="px-6 py-4">
                      <Badge variant={tx.status === 'Success' ? 'default' : tx.status === 'Pending' ? 'secondary' : 'destructive'} className={tx.status === 'Success' ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700' : tx.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white' : ''}>
                        {tx.status === "Success" ? t("premiumManagement.status.success") : tx.status === "Pending" ? t("premiumManagement.status.pending") : t("premiumManagement.status.failed")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 text-gray-400 hover:text-brand transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <Database className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">{t("premiumManagement.table.noTransactions")}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{t("premiumManagement.table.tryAdjusting")}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'config' ? (
            <div className="p-6">
              <div className="max-w-2xl border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 dark:text-amber-500 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      {t("premiumManagement.config.title")}
                    </h3>
                    <p className="text-amber-700 dark:text-amber-600 mt-1">{t("premiumManagement.config.subtitle")}</p>
                  </div>
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 text-brand border border-brand/20 rounded-lg hover:bg-brand/5 dark:hover:bg-brand/10 font-medium transition-colors">
                    {t("premiumManagement.config.editPlan")}
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t("premiumManagement.config.planName")}</div>
                    <div className="col-span-2 text-gray-900 dark:text-gray-100 font-semibold">{t("premiumManagement.config.planNameValue")}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t("premiumManagement.config.price")}</div>
                    <div className="col-span-2 text-gray-900 dark:text-gray-100 font-semibold">{t("premiumManagement.config.priceValue")}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">Limits & Quotas</div>
                    <div className="col-span-2 text-gray-600 dark:text-gray-300 space-y-1">
                      <p>• AI Token Limit: 50,000 / cycle</p>
                      <p>• Consultations: 2 / cycle</p>
                      <p>• Family Links: 3 members</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">Refund Policy</div>
                    <div className="col-span-2 text-gray-600 dark:text-gray-300 space-y-1">
                      <p>• Eligible if AI Tokens used &lt; 5,000</p>
                      <p>• Eligible if 0 Consultations used</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t("premiumManagement.config.status")}</div>
                    <div className="col-span-2">
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700">{t("premiumManagement.config.active")}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'refunds' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <th className="px-6 py-3 font-medium">Request ID</th>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Final Usage Snapshot</th>
                  <th className="px-6 py-3 font-medium">Eligibility</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                <tr className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">REF-001</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">Vu Quoc Huy</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">Tokens: 1,200 | Consults: 0</td>
                  <td className="px-6 py-4">
                    <Badge className="bg-green-500 text-white">Eligible</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand text-xs font-semibold hover:underline">Review</button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">REF-002</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">Nguyen Van A</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">Tokens: 15,000 | Consults: 1</td>
                  <td className="px-6 py-4">
                    <Badge variant="destructive">Ineligible</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand text-xs font-semibold hover:underline">Review</button>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </div>
  );
}
