'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Ward {
  id: number;
  name: string;
  pincode: string;
}

interface ZodValidationError {
  message: string;
}

export default function ReportIssue() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'sanitation',
    ward_id: '',
    is_anonymous: false,
    latitude: 19.0760,
    longitude: 72.8777,
    image_url: '',
    has_citizen_consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    fetch(`${API_URL}/api/wards`)
      .then(res => res.json())
      .then(data => {
        setWards(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, ward_id: data[0].id.toString() }));
      })
      .catch(err => console.error('Error fetching wards:', err));
  }, []);
  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(pos.coords.latitude.toFixed(8)),
          longitude: parseFloat(pos.coords.longitude.toFixed(8))
        }));
        setLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Could not detect location. Using default coordinates.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.is_anonymous && !formData.has_citizen_consent) {
      setMessage('Error: You must provide data consent if submitting non-anonymously.');
      return;
    }
    setLoading(true);
    setMessage('');
    const payload = {
      ...formData,
      ward_id: parseInt(formData.ward_id, 10),
      consent_timestamp: formData.has_citizen_consent ? new Date().toISOString() : null,
      privacy_policy_version: 'v1.0'
    };
    try{
      const res = await fetch(`${API_URL}/api/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if(res.ok){
        setMessage('Issue reported successfully! Tracking ID: ' + data.issue.id);
        setFormData({
          title: '',
          description: '',
          category: 'sanitation',
          ward_id: wards[0]?.id.toString() || '',
          is_anonymous: false,
          latitude: 19.0760,
          longitude: 72.8777,
          image_url: '',
          has_citizen_consent: false
        });
      }
      else{
        const errorMsg = data.details 
          ? data.details.map((err: ZodValidationError) => err.message).join(', ') 
          : data.error;
        setMessage('Error: ' + (errorMsg || 'Something went wrong'));
      }
    } catch {
      setMessage('Failed to submit. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-8">Report a Community Issue</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Issue Title</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={255}
            className="mt-1 block w-full border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm p-2 bg-transparent dark:text-white"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Pothole on Main St"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            className="mt-1 block w-full border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm p-2 bg-transparent dark:text-white"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Provide details about the issue..."
          />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
            <select
              className="mt-1 block w-full border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm p-2 bg-transparent dark:text-white"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="sanitation">Sanitation (24h SLA)</option>
              <option value="infrastructure">Infrastructure (72h SLA)</option>
              <option value="encroachment">Encroachment (48h SLA)</option>
              <option value="public-safety">Public Safety (12h SLA)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ward / Area</label>
            <select
              className="mt-1 block w-full border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm p-2 bg-transparent dark:text-white"
              value={formData.ward_id}
              onChange={e => setFormData({ ...formData, ward_id: e.target.value })}
            >
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>{ward.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Location</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300"
            >
              {locating ? 'Detecting...' : 'Detect My Location'}
            </button>
            <span className="text-xs text-zinc-500">
              {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
            </span>
          </div>
        </div>
        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="anonymous"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300 rounded"
                checked={formData.is_anonymous}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setFormData(prev => ({ 
                    ...prev, 
                    is_anonymous: isChecked,
                    has_citizen_consent: isChecked ? false : prev.has_citizen_consent
                  }));
                }}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="anonymous" className="font-medium text-zinc-700 dark:text-zinc-300">
                Submit Anonymously
              </label>
              <p className="text-zinc-500">Your personal details will be masked from the public and administrators.</p>
            </div>
          </div>
          {!formData.is_anonymous && (
            <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <div className="flex items-center h-5">
                <input
                  id="consent"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300 rounded"
                  checked={formData.has_citizen_consent}
                  onChange={e => setFormData({ ...formData, has_citizen_consent: e.target.checked })}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="consent" className="font-medium text-zinc-700 dark:text-zinc-300">
                  Data Processing Consent <span className="text-red-500">*</span>
                </label>
                <p className="text-zinc-500 mt-1 text-xs">
                  In compliance with the DPDP Act 2023, I consent to the processing of my reported data for municipal resolution. 
                  I understand this data may be publicly tracked for transparency.
                </p>
              </div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Submitting Report...' : 'Submit Report'}
        </button>
        {message && (
          <div className={`p-4 rounded-md text-sm ${message.startsWith('Error') || message.startsWith('Failed') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
