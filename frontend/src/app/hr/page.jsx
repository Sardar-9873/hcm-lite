'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../lib/api';
import AIAssistantModal from '../../components/AIAssistantModal';

export default function HRDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('attendance');
  const [attendanceBoard, setAttendanceBoard] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Employee Form State
  const [empForm, setEmpForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    department: 'Engineering',
    designation: 'Junior',
    basicSalary: '',
    joiningDate: new Date().toISOString().split('T')[0]
  });

  // Payroll Form State
  const [payrollMonth, setPayrollMonth] = useState('2026-10');
  const [payrollResult, setPayrollResult] = useState(null);

  const fetchHRData = async () => {
    setLoading(true);
    try {
      const attRes = await API.get('/attendance/board');
      setAttendanceBoard(attRes.data || []);
    } catch (err) {
      console.error('Error fetching HR data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRData();
  }, []);

  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    try {
      alert(`Employee ${empForm.firstName} ${empForm.lastName} registered! Temporary password generated.`);
      setEmpForm({
        employeeCode: '',
        firstName: '',
        lastName: '',
        email: '',
        department: 'Engineering',
        designation: 'Junior',
        basicSalary: '',
        joiningDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleRunPayrollDraft = async () => {
    try {
      const res = await API.post('/payroll/draft', { month: payrollMonth });
      setPayrollResult(res.data.run);
      alert(`Payroll draft calculated for ${payrollMonth}!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Error calculating payroll draft');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top HR Header */}
        <header className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200">
                People Operations
              </span>
              <h1 className="text-xl font-bold text-gray-900">HCM Lite HR Portal</h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Welcome, {user?.email || 'hr@company.com'}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded-lg text-gray-700 transition"
          >
            Sign Out
          </button>
        </header>

        {/* Operations Tabs */}
        <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setTab('attendance')}
            className={`pb-2.5 transition ${tab === 'attendance' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Daily Attendance Board
          </button>
          <button
            onClick={() => setTab('register')}
            className={`pb-2.5 transition ${tab === 'register' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Register Employee
          </button>
          <button
            onClick={() => setTab('payroll')}
            className={`pb-2.5 transition ${tab === 'payroll' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Monthly Payroll Run
          </button>
        </div>

        {/* Tab 1: Attendance Board */}
        {tab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-sm text-gray-900">Today's Attendance Status</h2>
                <p className="text-xs text-gray-500">Live checks, late-arrivals & half-days</p>
              </div>
              <button onClick={fetchHRData} className="text-xs text-indigo-600 hover:underline">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Check In</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceBoard.length > 0 ? (
                    attendanceBoard.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">
                          {row.employeeId?.firstName || 'Employee'} {row.employeeId?.lastName || ''}
                        </td>
                        <td className="p-3 text-gray-600">{row.date}</td>
                        <td className="p-3 text-gray-600">{new Date(row.checkIn).toLocaleTimeString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            row.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                            row.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="p-3 uppercase text-[10px] text-gray-400 font-semibold">{row.source}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400">
                        No attendance records marked for today yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Register Employee */}
        {tab === 'register' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm max-w-2xl">
            <h2 className="text-base font-bold text-gray-900 mb-1">Onboard New Employee</h2>
            <p className="text-xs text-gray-500 mb-4">
              Registering an employee automatically provisions login credentials with a temporary password.
            </p>

            <form onSubmit={handleRegisterEmployee} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Code</label>
                <input
                  type="text"
                  required
                  placeholder="EMP-001"
                  value={empForm.employeeCode}
                  onChange={(e) => setEmpForm({ ...empForm, employeeCode: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={empForm.firstName}
                  onChange={(e) => setEmpForm({ ...empForm, firstName: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={empForm.lastName}
                  onChange={(e) => setEmpForm({ ...empForm, lastName: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                <select
                  value={empForm.department}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Basic Monthly Salary (PKR)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 80000"
                  value={empForm.basicSalary}
                  onChange={(e) => setEmpForm({ ...empForm, basicSalary: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow transition"
                >
                  Create Employee & Login
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Monthly Payroll Run */}
        {tab === 'payroll' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 max-w-xl">
            <div>
              <h2 className="text-base font-bold text-gray-900">Run Monthly Payroll Draft</h2>
              <p className="text-xs text-gray-500">
                Rule: Gross = 1.5x Basic (HRA 40%, Medical 10%). Deductions calculate absent, unpaid leaves and half-days.
              </p>
            </div>

            <div className="flex gap-3">
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-600"
              />
              <button
                onClick={handleRunPayrollDraft}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition"
              >
                Compute Draft Payroll
              </button>
            </div>

            {payrollResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 mt-4">
                <p className="font-bold text-emerald-800">Payroll Draft Created for {payrollResult.month}</p>
                <p className="text-emerald-700">Total Gross: PKR {payrollResult.totalGross?.toLocaleString()}</p>
                <p className="text-emerald-700">Total Net Disbursed: PKR {payrollResult.totalNet?.toLocaleString()}</p>
                <p className="text-[11px] text-gray-500 italic mt-2">Status: Draft. Notify Admin to review and finalize.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* AI Assistant for HR */}
      <AIAssistantModal />
    </div>
  );
}