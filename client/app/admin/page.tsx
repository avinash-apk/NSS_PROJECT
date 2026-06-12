'use client';

import {useState, useEffect, useCallback} from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Issue {
  id: number;
  title: string;
  description: string;
  ward_id: number;
  ward_name?: string;
  category: string;
  status: string;
  sla_deadline: string;
  created_at: string;
}

export default function AdminPortal(){
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshIssues = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    // Auto-fetch a dev token on mount
    const getToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/mock-login`, { method: 'POST' });
        const data = await res.json();
        setToken(data.token);
      } catch {
        setAuthError('Could not connect to server for authentication.');
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const fetchIssues = async () => {
      try {
        const res = await fetch(`${API_URL}/api/issues`);
        if (!res.ok) throw new Error('Failed to fetch issues');
        const data = await res.json();
        if (isMounted) {
          setIssues(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching issues:', err);
          setLoading(false);
        }
      }
    };

    fetchIssues();
    return () => { isMounted = false; };
  }, [token, refreshKey]);

  const updateStatus = async (id: number, status: string, parentIssueId?: number) => {
    try {
      const res = await fetch(`${API_URL}/api/issues/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, parent_issue_id: parentIssueId }),
      });
      if (res.ok) {
        refreshIssues();
      } else {
        const errorData = await res.json();
        console.error('Failed to update:', errorData.error);
        alert(`Update failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    if (newStatus === 'duplicate') {
      const parentId = prompt('Enter the ID of the original issue:');
      if (parentId) {
        updateStatus(id, newStatus, parseInt(parentId, 10));
      }
    } else {
      updateStatus(id, newStatus);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      case 'duplicate': return 'bg-gray-100 text-gray-800';
      default: return 'bg-zinc-100 text-zinc-800';
    }
  };

  const getSlaStatus = (deadline: string) => {
    const now = new Date();
    const sla = new Date(deadline);
    const diff = sla.getTime() - now.getTime();
    if (diff < 0) return { label: 'BREACHED', color: 'text-red-600 font-bold' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 6) return { label: `${hours}h left`, color: 'text-orange-500 font-semibold' };
    return { label: `${hours}h left`, color: 'text-zinc-500' };
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

      {authError && (
        <div className="mb-6 p-4 rounded-md bg-red-50 text-red-800 text-sm">{authError}</div>
      )}

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
                  {issues.map((issue) => {
                    const sla = getSlaStatus(issue.sla_deadline);
                    return (
                    <tr key={issue.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="font-medium text-zinc-900 dark:text-white">{issue.title}</div>
                        <div className="text-zinc-500 truncate max-w-xs">{issue.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {issue.ward_name || `Ward ${issue.ward_id}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                        {issue.category.replace('-', ' ')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(issue.status)}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={sla.color}>{sla.label}</span>
                        <div className="text-xs text-zinc-400">{new Date(issue.sla_deadline).toLocaleString()}</div>
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <select 
                          className="bg-transparent border border-zinc-300 rounded text-xs p-1"
                          value={issue.status}
                          onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In-Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="escalated">Escalated</option>
                          <option value="duplicate">Duplicate</option>
                        </select>
                      </td>
                    </tr>
                    );
                  })}
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
