'use client';
import { useState } from 'react';
import API from '../../lib/api';
import SmartLeaveInput from '../../components/SmartLeaveInput';
import AIAssistantModal from '../../components/AIAssistantModal';

export default function EmployeeDashboard() {
  const [checkInState, setCheckInState] = useState(null);

  const handleCheckIn = async (source = 'web') => {
    try {
      if (source === 'camera' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const res = await API.post('/attendance/check-in', {
            source: 'camera',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setCheckInState(res.data);
          alert('Checked in via Camera & GPS Geofence');
        });
      } else {
        const res = await API.post('/attendance/check-in', { source: 'web' });
        setCheckInState(res.data);
        alert('Checked in successfully via Web');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Attendance check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await API.post('/attendance/check-out');
      alert(`Checked out! Logged: ${res.data.workHours} hours`);
    } catch (err) {
      alert(err.response?.data?.error || 'Attendance check-out failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Employee Self-Service Portal</h1>
            <p className="text-xs text-gray-500">Log attendance, request leaves, and query policies</p>
          </div>
        </header>

        {/* Check-In / Check-Out Widget */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex gap-4">
          <button
            onClick={() => handleCheckIn('web')}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg text-sm"
          >
            Web Check-In
          </button>
          <button
            onClick={() => handleCheckIn('camera')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg text-sm"
          >
            Camera Check-In (Geofenced)
          </button>
          <button
            onClick={handleCheckOut}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 rounded-lg text-sm"
          >
            Check Out
          </button>
        </div>

        {/* Smart Leave Integration */}
        <SmartLeaveInput onApplied={() => console.log('Leave requested')} />
      </div>

      <AIAssistantModal />
    </div>
  );
}