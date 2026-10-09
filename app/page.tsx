'use client';

import { useEffect, useMemo, useState } from 'react';
import { Role, Report, Severity, Status } from '@/lib/types';
import { locationOptions } from '@/lib/mockData';

const initialForm = {
  location: 'Main Street',
  description: '',
  photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
};

export default function HomePage() {
  const [role, setRole] = useState<Role>('citizen');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [statusMessage, setStatusMessage] = useState('');

  const filteredReports = useMemo(() => {
    return reports.filter((report) => report.status !== 'Resolved' || role === 'officer');
  }, [reports, role]);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        setReports(data);
      } catch (error) {
        console.error('Failed to load reports', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage('Checking the image with AI...');

    try {
      const aiResponse = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: form.location, description: form.description, photoUrl: form.photoUrl }),
      });
      const aiData = await aiResponse.json();

      const result = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: form.location,
          description: form.description,
          photoUrl: form.photoUrl,
          severity: aiData.severity,
          aiVerified: aiData.isPothole,
        }),
      });

      const createdReport = await result.json();
      setReports((current) => [createdReport, ...current]);
      setStatusMessage(`Report submitted. Severity: ${aiData.severity}.`);
      setForm(initialForm);
    } catch (error) {
      setStatusMessage('Something went wrong while submitting the report.');
      console.error(error);
    }
  };

  const updateStatus = async (id: string, status: Status) => {
    const response = await fetch('/api/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });

    const updated = await response.json();
    setReports((current) =>
      current.map((report) => (report.id === id ? updated : report))
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-100">Public Works</p>
          <h1 className="mt-3 text-4xl font-bold">FixMyRoad</h1>
          <p className="mt-2 max-w-2xl text-emerald-50">
            AI-assisted pothole reporting for citizens and municipal officers.
          </p>
        </header>

        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setRole('citizen')}
            className={`rounded-full px-5 py-2 font-semibold transition ${
              role === 'citizen' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
            }`}
          >
            Citizen
          </button>
          <button
            onClick={() => setRole('officer')}
            className={`rounded-full px-5 py-2 font-semibold transition ${
              role === 'officer' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
            }`}
          >
            Officer
          </button>
        </div>

        {role === 'citizen' ? (
          <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-5 text-2xl font-semibold">Report a pothole</h2>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Photo</label>
                  <input
                    type="url"
                    value={form.photoUrl}
                    onChange={(event) => setForm({ ...form, photoUrl: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                    placeholder="https://example.com/pothole.jpg"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                  <select
                    value={form.location}
                    onChange={(event) => setForm({ ...form, location: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                  >
                    {locationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                    placeholder="Road condition, how large is it, any safety concerns?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700"
                >
                  Submit report
                </button>
              </div>

              {statusMessage && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{statusMessage}</p>}
            </form>

            <aside className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
              <h3 className="text-xl font-semibold">Status tracker</h3>
              <div className="mt-5 space-y-3">
                {loading ? (
                  <p>Loading reports...</p>
                ) : filteredReports.length === 0 ? (
                  <p>No reports yet.</p>
                ) : (
                  filteredReports.slice(0, 4).map((report) => (
                    <div key={report.id} className="rounded-xl bg-slate-800 p-3">
                      <p className="font-medium">{report.location}</p>
                      <p className="mt-1 text-sm text-slate-300">{report.status}</p>
                      <p className="mt-1 text-xs text-slate-400">Severity: {report.severity}</p>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Officer dashboard</h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                {reports.length} tickets
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <p>Loading reports...</p>
              ) : reports.length === 0 ? (
                <p>No reports available.</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="rounded-2xl border border-slate-200 p-4">
                    <img src={report.photoUrl} alt={report.location} className="h-40 w-full rounded-xl object-cover" />
                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-semibold">{report.location}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        {report.severity}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{report.description || 'No description provided.'}</p>

                    <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </label>
                    <select
                      value={report.status}
                      onChange={(event) => updateStatus(report.id, event.target.value as Status)}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
