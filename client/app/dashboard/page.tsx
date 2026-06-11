'use client';

import { useState, useEffect } from 'react';

export default function PublicDashboard() {
  const [issues, setIssues] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [issuesRes, wardsRes] = await Promise.all([
          fetch('http://localhost:5000/api/issues'),
          fetch('http://localhost:5000/api/wards')
        ]);
        const issuesData = await issuesRes.json();
        const wardsData = await wardsRes.json();
        setIssues(issuesData);
        setWards(wardsData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getWardStats = (wardId: number) => {
    const wardIssues = issues.filter((i: any) => i.ward_id === wardId);
    const resolved = wardIssues.filter((i: any) => i.status === 'resolved').length;
    return {
      total: wardIssues.length,
      resolved: resolved,
      percentage: wardIssues.length > 0 ? Math.round((resolved / wardIssues.length) * 100) : 0
    };
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-2">Public Transparency Dashboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-12">Real-time resolution tracking across all wards.</p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {wards.map((ward: any) => {
          const stats = getWardStats(ward.id);
          return (
            <div key={ward.id} className="bg-white dark:bg-zinc-900 overflow-hidden shadow rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-zinc-500 truncate">{ward.name}</dt>
                <dd className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-white">{stats.percentage}% Resolved</dd>
                <div className="mt-4 flex items-center text-sm text-zinc-500">
                  <span className="font-bold mr-2 text-zinc-900 dark:text-white">{stats.resolved} / {stats.total}</span> Issues Closed
                </div>
                <div className="mt-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${stats.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Recent Reports</h2>
      <div className="bg-white dark:bg-zinc-900 shadow overflow-hidden sm:rounded-md border border-zinc-200 dark:border-zinc-800">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {issues.slice(0, 10).map((issue: any) => (
            <li key={issue.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-600 truncate">{issue.title}</p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${issue.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {issue.status}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                      Ward: {issue.ward_name}
                    </p>
                    <p className="mt-2 flex items-center text-sm text-zinc-500 dark:text-zinc-400 sm:mt-0 sm:ml-6 capitalize">
                      {issue.category}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-zinc-500 dark:text-zinc-400 sm:mt-0">
                    Reported on {new Date(issue.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </li>
          ))}
          {issues.length === 0 && !loading && (
            <li className="px-4 py-10 text-center text-zinc-500">No recent reports found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
