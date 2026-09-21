import { useState, useEffect } from 'react';
import { CreditCard, Eye, TrendingUp, Users, Search, Database } from 'lucide-react';
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";

interface Transaction {
  id: string;
  user: string;
  amount: string;
  date: string;
  status: string;
}

export function PremiumManagement() {
  const [activeTab, setActiveTab] = useState<"transactions" | "config">("transactions");
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
          <h1 className="text-2xl font-bold text-gray-900">Premium & Payments</h1>
          <p className="text-gray-500 mt-1">Manage VNPAY transactions and Premium subscription packages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-brand/10 flex flex-col items-center justify-center mr-4">
            <TrendingUp className="w-6 h-6 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900">24,500,000 VND</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex flex-col items-center justify-center mr-4">
            <CreditCard className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Successful Transactions</p>
            <h3 className="text-2xl font-bold text-gray-900">125</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex flex-col items-center justify-center mr-4">
            <Users className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Premium Users</p>
            <h3 className="text-2xl font-bold text-gray-900">89</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex space-x-6 mb-4 sm:mb-0">
            <button
              className={`font-medium pb-4 border-b-2 -mb-4 ${activeTab === 'transactions' ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('transactions')}
            >
              VNPAY Transactions
            </button>
            <button
              className={`font-medium pb-4 border-b-2 -mb-4 ${activeTab === 'config' ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('config')}
            >
              Package Configuration
            </button>
          </div>

          {activeTab === 'transactions' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transaction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-64"
              />
            </div>
          )}
        </div>

        <div className="p-0 overflow-x-auto max-h-[500px] overflow-y-auto">
          {activeTab === 'transactions' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <th className="px-6 py-3 font-medium">Transaction ID</th>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
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
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{tx.id}</td>
                    <td className="px-6 py-4 text-gray-600">{tx.user}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{tx.amount}</td>
                    <td className="px-6 py-4 text-gray-500">{tx.date}</td>
                    <td className="px-6 py-4">
                      <Badge variant={tx.status === 'Success' ? 'default' : tx.status === 'Pending' ? 'secondary' : 'destructive'} className={tx.status === 'Success' ? 'bg-green-500 hover:bg-green-600' : tx.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}>
                        {tx.status}
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
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <Database className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1">No transactions found</h3>
                        <p className="text-gray-500 text-sm">Try adjusting your search criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="p-6">
              <div className="max-w-2xl border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 p-6 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Premium Subscription
                    </h3>
                    <p className="text-amber-700 mt-1">Current active package plan</p>
                  </div>
                  <button className="px-4 py-2 bg-white text-brand border border-brand/20 rounded-lg hover:bg-brand/5 font-medium transition-colors">
                    Edit Plan
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
                    <div className="text-gray-500 font-medium">Plan Name</div>
                    <div className="col-span-2 text-gray-900 font-semibold">Premium Care</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
                    <div className="text-gray-500 font-medium">Price (VND)</div>
                    <div className="col-span-2 text-gray-900 font-semibold">199,000 / month</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
                    <div className="text-gray-500 font-medium">Features</div>
                    <div className="col-span-2 text-gray-600 space-y-1">
                      <p>• Unlimited AI health consultations</p>
                      <p>• Priority in doctor waiting queue</p>
                      <p>• Advanced health metrics insights</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-gray-500 font-medium">Status</div>
                    <div className="col-span-2">
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
