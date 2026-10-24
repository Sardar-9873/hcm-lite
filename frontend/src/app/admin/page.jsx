'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../lib/api';
import AIAssistantModal from '../../components/AIAssistantModal';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [auditLogs, setAuditLogs] = useState([]);
  const [payrollDrafts, setPayrollDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    headcount: 0,
    payrollCost: 0,
    attritionRate: '0%',
    avgSalary: 0
  });

  // Data fetching
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Audit logs fetch karein
      const auditRes = await API.get('/audit/logs');
      setAuditLogs(auditRes.data || []);

      // Mock/Initial overview metrics (Database se bind ho jayenge)
      setStats({
        headcount: 18,
        payrollCost: 1450000,
        attritionRate: '2.4%',
        avgSalary: 80500
      });
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleFinalizePayroll = async (payrollId) => {
    if (!confirm('Are you sure you want to finalize this payroll? It will be locked permanently.')) return;
    try {
      await API.patch(`/payroll/${payrollId}/finalize`);
      alert('Payroll finalized and locked successfully!');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to finalize payroll');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation & Header */}
        <header className="flex flex-wrap justify-between items-center bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500/20 text-red-400 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-red-500/30">
                Admin Control
              </span>
              <h1 className="text-xl font-bold text-white">HCM Lite Enterprise Admin</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Logged in as {user?.email || 'admin@company.com'}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-semibold rounded-lg text-slate-200 transition"
          >
            Sign Out
          </button>
        </header>

        {/* 4 Core Admin KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Total Headcount</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.headcount}</p>
            <span className="text-[10px] text-emerald-400">+2 joined this month</span>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Total Payroll Cost</p>
            <p className="text-2xl font-bold text-white mt-1">PKR {stats.payrollCost.toLocaleString()}</p>
            <span className="text-[10px] text-slate-400">Current Month Forecast</span>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Average Salary</p>
            <p className="text-2xl font-bold text-white mt-1">PKR {stats.avgSalary.toLocaleString()}</p>
            <span className="text-[10px] text-indigo-400">Across 4 Departments</span>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Attrition Rate (YTD)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.attritionRate}</p>
            <span className="text-[10px] text-emerald-400">Low turnover health</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-700 gap-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 transition ${activeTab === 'overview' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-2 transition ${activeTab === 'payroll' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            Payroll Finalization
          </button>
        </div>

        {/* Tab 1: Audit Log Table */}
        {activeTab === 'overview' && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-semibold text-sm text-white">System Security & Audit Log</h2>
              <button onClick={fetchAdminData} className="text-xs text-indigo-400 hover:underline">Refresh Logs</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-700/50">
                        <td className="p-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-3 font-semibold text-white">{log.actor}</td>
                        <td className="p-3">
                          <span className="bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{log.entity}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                          {JSON.stringify(log.afterState || {})}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500">
                        No audit events recorded yet. Perform actions to see logs here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Payroll Finalization */}
        {activeTab === 'payroll' && (
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Pending Payroll Runs to Finalize</h2>
              <p className="text-xs text-slate-400">
                As per rules, only Admin can permanently lock and finalize monthly payroll disbursements.
              </p>
            </div>

            <div className="border border-slate-700 rounded-xl p-4 flex items-center justify-between bg-slate-900/50">
              <div>
                <p className="font-semibold text-sm text-white">Month: 2026-10 (Current Cycle)</p>
                <p className="text-xs text-slate-400">Total Net Disbursed: PKR 1,280,000 • Prepared by HR</p>
              </div>
              <button
                onClick={() => handleFinalizePayroll('active_month')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow transition"
              >
                Finalize & Lock Month
              </button>
            </div>
          </div>
        )}

      </div>

      {/* AI Assistant Modal for Admin */}
      <AIAssistantModal />
    </div>
  );
}