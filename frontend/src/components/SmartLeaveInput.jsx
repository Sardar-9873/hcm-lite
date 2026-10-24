'use client';
import { useState } from 'react';
import API from '../lib/api';

export default function SmartLeaveInput({ onApplied }) {
  const [prompt, setPrompt] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/ai/smart-leave', { sentence: prompt });
      setExtracted(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'AI parsing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      await API.post('/leave/apply', extracted);
      alert('Leave applied successfully');
      setExtracted(null);
      setPrompt('');
      if (onApplied) onApplied();
    } catch (err) {
      alert(err.response?.data?.error || 'Leave submission failed');
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <h3 className="font-semibold text-gray-800 text-sm mb-2">Apply Leave in Plain Words (Smart Leave)</h3>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:border-indigo-600"
          placeholder="e.g. Need next Monday and Tuesday off for family wedding"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          onClick={handleParse}
          disabled={loading || !prompt}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Parse'}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

      {extracted && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <p><strong>Type:</strong> {extracted.leaveType}</p>
          <p><strong>Start Date:</strong> {extracted.startDate}</p>
          <p><strong>End Date:</strong> {extracted.endDate}</p>
          <p><strong>Reason:</strong> {extracted.reason}</p>
          <button
            onClick={handleConfirmSubmit}
            className="mt-2 bg-emerald-600 text-white px-3 py-1.5 rounded font-medium hover:bg-emerald-700"
          >
            Confirm & Apply
          </button>
        </div>
      )}
    </div>
  );
}