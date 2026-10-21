import { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { Plus, Trash2, Download, ExternalLink, Table as TableIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/context/RestaurantContext';
import { EmptyState, ConfirmDialog } from '@/components/ui';
import type { RestaurantTable } from '@/types/database';

export default function QRCodesPage() {
  const { activeRestaurant } = useRestaurant();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RestaurantTable | null>(null);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!activeRestaurant) return;
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.from('restaurant_tables').select('*').eq('restaurant_id', activeRestaurant.id).order('table_number');
      if (error) throw error;
      const tableList = (data ?? []) as RestaurantTable[];
      setTables(tableList);

      const baseUrl = `${window.location.origin}/menu/${activeRestaurant.slug}`;
      const map: Record<string, string> = {};
      map['restaurant'] = await QRCode.toDataURL(baseUrl, { width: 300, margin: 2, color: { dark: '#102a43', light: '#ffffff' } });
      for (const table of tableList) {
        map[table.id] = await QRCode.toDataURL(`${baseUrl}/table/${encodeURIComponent(table.table_number)}`, { width: 300, margin: 2, color: { dark: '#102a43', light: '#ffffff' } });
      }
      setQrUrls(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [activeRestaurant]);

  useEffect(() => { load(); }, [load]);

  const addTable = async (tableNumber: string) => {
    if (!activeRestaurant) return;
    const { error } = await supabase.from('restaurant_tables').insert({ restaurant_id: activeRestaurant.id, table_number: tableNumber });
    if (error) { setError(error.message); return; }
    setShowAddModal(false); load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('restaurant_tables').update({ is_active: false }).eq('id', deleteTarget.id);
    setDeleteTarget(null); load();
  };

  const download = (url: string, name: string) => {
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  };

  if (!activeRestaurant) return null;
  const menuUrl = `${window.location.origin}/menu/${activeRestaurant.slug}`;

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-primary-600" /></div>;
  if (error) return <div className="rounded-lg bg-error-50 p-4 text-sm text-error-700">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">QR Codes & Tables</h1>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" /> Add Table</button>
      </div>

      <div className="card p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="shrink-0">
            {qrUrls['restaurant'] ? <img src={qrUrls['restaurant']} alt="Restaurant QR" className="h-40 w-40 rounded-lg border border-navy-100" /> : <div className="h-40 w-40 animate-pulse rounded-lg bg-navy-100" />}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-navy-900">Restaurant QR Code</h3>
            <p className="mt-1 text-sm text-navy-500">Opens your general menu. Print it for your entrance, flyers, or social media.</p>
            <div className="mt-3 break-all rounded-lg bg-navy-50 p-2 font-mono text-sm text-navy-700">{menuUrl}</div>
            <div className="mt-4 flex justify-center gap-2 sm:justify-start">
              <button className="btn-primary btn-sm" onClick={() => download(qrUrls['restaurant'], `orderpilot-${activeRestaurant.slug}.png`)}><Download className="h-4 w-4" /> Download</button>
              <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm"><ExternalLink className="h-4 w-4" /> Preview</a>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-navy-900">Table QR Codes</h2>
        {tables.length === 0 ? (
          <EmptyState icon={<TableIcon className="h-10 w-10" />} title="No tables yet" description="Add tables to generate QR codes specific to each table. When customers scan a table QR, their order automatically includes the table number." action={<button className="btn-primary btn-sm" onClick={() => setShowAddModal(true)}>Add Your First Table</button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <div key={table.id} className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><TableIcon className="h-4 w-4 text-navy-400" /><span className="font-semibold text-navy-900">Table {table.table_number}</span></div>
                  <button onClick={() => setDeleteTarget(table)} className="rounded-lg p-1.5 text-navy-400 hover:bg-error-50 hover:text-error-600"><Trash2 className="h-4 w-4" /></button>
                </div>
                {qrUrls[table.id] ? <img src={qrUrls[table.id]} alt={`QR for table ${table.table_number}`} className="aspect-square w-full rounded-lg border border-navy-100 object-contain" /> : <div className="aspect-square w-full animate-pulse rounded-lg bg-navy-100" />}
                <button className="btn-outline btn-sm mt-3 w-full" onClick={() => download(qrUrls[table.id], `orderpilot-table-${table.table_number}.png`)}><Download className="h-4 w-4" /> Download</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddTableModal onClose={() => setShowAddModal(false)} onAdd={addTable} existing={tables.map((t) => t.table_number)} />}
      <ConfirmDialog open={deleteTarget !== null} title="Remove table" message={`Remove Table ${deleteTarget?.table_number}? Its QR code will stop working. This won't affect past orders.`} confirmLabel="Remove" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

function AddTableModal({ onClose, onAdd, existing }: { onClose: () => void; onAdd: (n: string) => void; existing: string[] }) {
  const [tableNumber, setTableNumber] = useState('');
  const [error, setError] = useState('');
  const handleAdd = () => {
    if (!tableNumber.trim()) { setError('Table number is required'); return; }
    if (existing.includes(tableNumber.trim())) { setError('This table already exists'); return; }
    onAdd(tableNumber.trim());
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-navy-950/40 animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-slide-up">
        <h3 className="text-lg font-semibold text-navy-900">Add Table</h3>
        {error && <div className="mt-3 rounded-lg bg-error-50 p-3 text-sm text-error-700">{error}</div>}
        <div className="mt-4">
          <label className="label">Table number or name</label>
          <input className="input" placeholder="e.g. 5, Patio 1, Bar 3" value={tableNumber} onChange={(e) => { setTableNumber(e.target.value); setError(''); }} autoFocus />
          <p className="mt-1 text-xs text-navy-400">Customers at this table will see this label on their order</p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleAdd}>Add Table</button>
        </div>
      </div>
    </div>
  );
}
