import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { CoffeeTable } from '../types';

export function useTables() {
  const { t } = useLanguage();
  const toast = useToast();
  
  const [tables, setTables] = useState<CoffeeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tbls, shift] = await Promise.all([
        window.api.coffee.tables.getAll(),
        window.api.coffee.shifts.getActive()
      ]);
      setTables(tbls ?? []);
      setActiveShift(shift);
    } catch {
      toast.error(t('cfFailedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      await window.api.coffee.tables.update({ id, status });
      load(); 
    } catch {
      toast.error(t('cfStatusUpdateFailed'));
    }
  };

  const deleteTable = async (id: string) => {
    try {
      await window.api.coffee.tables.delete(id);
      load();
      toast.success(t('cfTableRemoved'));
    } catch (err: any) {
      toast.error(err?.message ?? t('cfFailed'));
    }
  };
// Inside TablesTab.tsx
const toggleTableActive = async (table: CoffeeTable) => {
  try {
    await window.api.coffee.tables.update({ 
      id: table.id, 
      isActive: !table.isActive // Toggle the boolean
    });
    load(); // Refresh data
  } catch {
    // handle error
  }
};
  const saveTable = async (data: any, editTarget?: CoffeeTable) => {
    try {
      if (editTarget) {
        await window.api.coffee.tables.update({ id: editTarget.id, ...data });
        toast.success(t('cfTableUpdated'));
      } else {
        await window.api.coffee.tables.create(data);
        toast.success(t('cfTableCreated'));
      }
      load();
      return true;
    } catch (err: any) {
      toast.error(err?.message ?? t('cfSaveFailed'));
      return false;
    }
  };

  return { tables, loading, activeShift, load, setStatus, deleteTable, saveTable, toggleTableActive };
}
