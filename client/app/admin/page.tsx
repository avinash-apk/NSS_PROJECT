'use client';

import { useState, useEffect } from 'react';

export default function AdminPortal() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/issues');
      const data = await res.json();
      setIssues(data);
    } catch (err) {
      console.error('Error fetching issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution_proof_url: 'https://via.placeholder.com/300?text=Resolved' }),
      });
      if (res.ok) fetchIssues();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-zinc-100 text-zinc-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">Admin Management Portal</h1>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            A list of all reported community issues requiring attention.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-300 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white">Issue</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white">Ward</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white">Category</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white">Status</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-white">SLA Deadline</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-black">
                  {issues.map((issue: any) => (
                    <tr key={issue.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="font-medium text-zinc-900 dark:text-white">{issue.title}</div>
                        <div className="text-zinc-500 truncate max-w-xs">{issue.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {issue.ward_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                        {issue.category}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(issue.status)}`}>
                          {issue.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(issue.sla_deadline).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <select 
                          className="bg-transparent border border-zinc-300 rounded text-xs p-1"
                          value={issue.status}
                          onChange={(e) => updateStatus(issue.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In-Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="escalated">Escalated</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {issues.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-zinc-500">No issues reported yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
