'use client';

import { useEffect, useMemo, useState } from 'react';
import { Report, Role, Status } from '@/lib/types';
import { locationOptions } from '@/lib/mockData';

type WeatherStatus = {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  rain: number;
  condition: string;
  isMonsoonAlert: boolean;
};

const initialForm = {
  location: 'Main Street',
  description: '',
  photoUrl: '',
};

const weatherCityMap: Record<string, string> = {
  'Main Street': 'Bengaluru',
  'Market Avenue': 'Mumbai',
  'Oak Road': 'Pune',
  'School Lane': 'Chennai',
  'Cedar Blvd': 'Hyderabad',
  'Maple Drive': 'Kochi',
  'River Street': 'Bhubaneswar',
  'Central Plaza': 'Delhi',
};

const weatherCodeMap: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Cloudy',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Heavy showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

async function fetchWeatherForLocation(location: string): Promise<WeatherStatus | null> {
  const city = weatherCityMap[location] || 'Bengaluru';

  try {
    const geocodeRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    const geocodeData = await geocodeRes.json();
    const result = geocodeData?.results?.[0];

    if (!result) return null;

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${result.latitude}&longitude=${result.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    const current = weatherData?.current;
    if (!current) return null;

    const month = new Date().getMonth();
    const monsoonMonths = new Set([5, 6, 7, 8, 9]);
    const rainValue = Number(current.precipitation ?? current.rain ?? 0);

    return {
      city: result.name,
      temperature: Number(current.temperature_2m),
      feelsLike: Number(current.apparent_temperature),
      humidity: Number(current.relative_humidity_2m),
      windSpeed: Number(current.wind_speed_10m),
      rain: rainValue,
      condition: weatherCodeMap[current.weather_code] || 'Weather update',
      isMonsoonAlert: monsoonMonths.has(month) && (rainValue > 0 || current.weather_code >= 61),
    };
  } catch (error) {
    console.error('Weather fetch failed:', error);
    return null;
  }
}

export default function HomePage() {
  const [role, setRole] = useState<Role>('citizen');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [statusMessage, setStatusMessage] = useState('');
  const [monsoonAlert, setMonsoonAlert] = useState(false);
  const [weather, setWeather] = useState<WeatherStatus | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

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

  useEffect(() => {
    const loadWeather = async () => {
      setWeatherLoading(true);
      const currentWeather = await fetchWeatherForLocation(form.location);
      setWeather(currentWeather);
      setWeatherLoading(false);
    };

    loadWeather();
  }, [form.location]);

  const detectLocationFromImage = async (file: File) => {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      return { photoUrl: dataUrl, location: form.location };
    } catch {
      return { photoUrl: '', location: form.location };
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageData = await detectLocationFromImage(file);
    setForm((current) => ({
      ...current,
      photoUrl: imageData.photoUrl || current.photoUrl,
      location: imageData.location || current.location,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage('Checking the image with AI and weather context...');

    try {
      const aiResponse = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: form.location,
          description: form.description,
          photoUrl: form.photoUrl,
        }),
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
          monsoonPriority: aiData.monsoonPriority,
        }),
      });

      const createdReport = await result.json();
      setReports((current) => [createdReport, ...current]);
      setMonsoonAlert(Boolean(aiData.monsoonPriority));
      setStatusMessage(
        aiData.monsoonPriority
          ? `Monsoon priority alert: report submitted with ${aiData.severity.toUpperCase()} severity.`
          : `Report submitted. Severity: ${aiData.severity}.`
      );
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
    setReports((current) => current.map((report) => (report.id === id ? updated : report)));
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-100">Public Works</p>
          <h1 className="mt-3 text-4xl font-bold">FixMyRoad</h1>
          <p className="mt-2 max-w-2xl text-emerald-50">
            AI-assisted pothole reporting with monsoon prioritization and live weather insight.
          </p>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Weather</p>
            {weatherLoading ? (
              <p className="mt-3 text-slate-400">Loading...</p>
            ) : weather ? (
              <>
                <p className="mt-1 text-2xl font-bold">{weather.city}</p>
                <p className="mt-2 text-3xl font-semibold">{Math.round(weather.temperature)}°C</p>
                <p className="text-sm text-slate-600">{weather.condition}</p>
              </>
            ) : (
              <p className="mt-3 text-red-500">Weather unavailable</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Feels like</p>
            <p className="mt-3 text-2xl font-bold">
              {weather ? `${Math.round(weather.feelsLike)}°C` : '--'}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Rain</p>
            <p className="mt-3 text-2xl font-bold">{weather ? `${weather.rain.toFixed(1)} mm` : '--'}</p>
          </div>

          <div className="rounded-2xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200">
            <p className="text-sm text-amber-700">Monsoon status</p>
            <p className="mt-3 text-2xl font-bold text-amber-800">
              {weather?.isMonsoonAlert ? 'Priority watch' : 'Stable'}
            </p>
          </div>
        </section>

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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Upload photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
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

              {statusMessage && (
                <p
                  className={`mt-4 rounded-xl p-3 text-sm ${
                    monsoonAlert ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {statusMessage}
                </p>
              )}
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
                      {report.monsoonPriority && (
                        <p className="mt-2 text-xs font-semibold text-amber-300">Monsoon Priority</p>
                      )}
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

            <div className="mb-6 rounded-2xl bg-slate-900 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Live weather</p>
                  <p className="text-2xl font-bold">{weather ? `${Math.round(weather.temperature)}°C` : '--'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-300">{weather?.city}</p>
                  <p className="text-sm text-emerald-300">{weather?.condition}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-800 p-3">
                  <p className="text-xs uppercase text-slate-400">Humidity</p>
                  <p className="mt-2 text-xl font-semibold">{weather ? `${weather.humidity}%` : '--'}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-3">
                  <p className="text-xs uppercase text-slate-400">Wind</p>
                  <p className="mt-2 text-xl font-semibold">{weather ? `${weather.windSpeed} km/h` : '--'}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-3">
                  <p className="text-xs uppercase text-slate-400">Rain</p>
                  <p className="mt-2 text-xl font-semibold">{weather ? `${weather.rain.toFixed(1)} mm` : '--'}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <p>Loading reports...</p>
              ) : reports.length === 0 ? (
                <p>No reports available.</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="rounded-2xl border border-slate-200 p-4">
                    {report.photoUrl && (
                      <img src={report.photoUrl} alt={report.location} className="h-40 w-full rounded-xl object-cover" />
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-semibold">{report.location}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        {report.severity}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{report.description || 'No description provided.'}</p>

                    {report.monsoonPriority && (
                      <p className="mt-2 rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        Monsoon priority
                      </p>
                    )}

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
