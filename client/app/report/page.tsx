'use client';

import { useState, useEffect } from 'react';

export default function ReportIssue() {
  const [wards, setWards] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'sanitation',
    ward_id: '',
    is_anonymous: false,
    latitude: 19.0760, // Default Mumbai
    longitude: 72.8777,
    image_url: 'https://via.placeholder.com/150'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/wards')
      .then(res => res.json())
      .then(data => {
        setWards(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, ward_id: data[0].id }));
      })
      .catch(err => console.error('Error fetching wards:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Issue reported successfully! Tracking ID: ' + data.issue.id);
        setFormData({
          title: '',
          description: '',
          category: 'sanitation',
          ward_id: wards[0]?.id || '',
          is_anonymous: false,
          latitude: 19.0760,
          longitude: 72.8777,
          image_url: 'https://via.placeholder.com/150'
        });
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (err) {
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
              <option value="sanitation">Sanitation</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="encroachment">Encroachment</option>
              <option value="public-safety">Public Safety</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ward / Area</label>
            <select
              className="mt-1 block w-full border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm p-2 bg-transparent dark:text-white"
              value={formData.ward_id}
              onChange={e => setFormData({ ...formData, ward_id: e.target.value })}
            >
              {wards.map((ward: any) => (
                <option key={ward.id} value={ward.id}>{ward.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300 rounded"
            checked={formData.is_anonymous}
            onChange={e => setFormData({ ...formData, is_anonymous: e.target.checked })}
          />
          <label className="ml-2 block text-sm text-zinc-700 dark:text-zinc-300">
            Submit Anonymously
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>

        {message && (
          <div className={`p-4 rounded-md ${message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
