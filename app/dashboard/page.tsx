'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface PageRow {
  id: string;
  url: string;
  last_diff: string | null;
  updated_at: string;
}

export default function Dashboard() {
  const [rows, setRows] = useState<PageRow[]>([]);
  const [url, setUrl] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('pages')
        .select('*')
        .order('updated_at', { ascending: false });
      setRows(data || []);
    })();
  }, []);

  const addUrl = async () => {
    if (!url) return;
    const { data } = await supabase.from('pages').insert({ url });
    if (data) setRows([data[0], ...rows]);
    setUrl('');
  };

  return (
    <div>
      <h1 className="text-3xl mb-6">Your Pages</h1>
      <div className="flex gap-2 mb-4">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 border px-3 py-2 rounded"
        />
        <button onClick={addUrl} className="bg-blue-600 text-white px-4 rounded">
          Add
        </button>
      </div>
      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="text-left">
            <th className="p-3">URL</th>
            <th className="p-3">Last Diff</th>
            <th className="p-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3">{r.url}</td>
              <td className="p-3">{r.last_diff ? 'Yes' : '—'}</td>
              <td className="p-3">{new Date(r.updated_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
