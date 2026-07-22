import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CoffeeTable } from '../types';
import { INPUT_CLASS } from '../constants';
import { useLanguage } from '@renderer/contexts/LanguageContext';

interface Props {
  editTarget: CoffeeTable | null;
  nextNumber: number;
  onClose: () => void;
  onSave: (data: any, editTarget?: CoffeeTable) => Promise<boolean>;
}

export default function TableFormModal({ editTarget, nextNumber, onClose, onSave }: Props) {
  const [form, setForm] = useState({ number: '', name: '', capacity: '4', section: '' });
  const [saving, setSaving] = useState(false);
  const {t} = useLanguage();
  useEffect(() => {
    if (editTarget) {
      setForm({ number: String(editTarget.number), name: editTarget.name ?? '', capacity: String(editTarget.capacity), section: editTarget.section ?? '' });
    } else {
      setForm({ number: String(nextNumber), name: '', capacity: '4', section: '' });
    }
  }, [editTarget, nextNumber]);

  // OS Level: Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  async function handleSubmit() {
    setSaving(true);
    const data = { number: +form.number, name: form.name || undefined, capacity: +form.capacity, section: form.section || undefined };
    const success = await onSave(data, editTarget ?? undefined);
    if (success) onClose();
    else setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
      <div className="m-auto w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-bold text-slate-800 dark:text-white">{editTarget ? t('cfEditTable')||'Edit Table' : t('cfAddTable')||'Add Table'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('cfTableNumber')||'Number *'}</label>
            <input type="number" value={form.number} onChange={(e) => setForm(p => ({ ...p, number: e.target.value }))} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('cfTableCapacity')||'Capacity'}</label>
            <input type="number" value={form.capacity} onChange={(e) => setForm(p => ({ ...p, capacity: e.target.value }))} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('cfTableDisplayName')||'Display Name'}</label>
            <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Patio 1" className={INPUT_CLASS} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('cfTableSection')||'Section'} </label>
            <input type="text" value={form.section} onChange={(e) => setForm(p => ({ ...p, section: e.target.value }))} placeholder="e.g. Outdoor" className={INPUT_CLASS} />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">{t('cfTableCancel')||'Cancel'}</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : t('cfTableSave')||'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
