import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileUp } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

const SAMPLE = [
  'code,name,active_ingredient,category,unit,purchase_price,sale_price,min_stock,requires_rx',
  'T9001,Paracetamol 500mg DHG,Paracetamol 500mg,Giảm đau - Hạ sốt,Hộp,18000,25000,40,0',
  'T9002,Loratadin 10mg Stada,Loratadin 10mg,Dị ứng,Hộp,22000,32000,20,0',
].join('\r\n');

/** Nhập / cập nhật danh mục thuốc từ file CSV (khớp theo mã thuốc). */
export function ImportMedicinesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  const close = () => {
    setFile(null);
    setResult(null);
    setError('');
    onClose();
  };

  const sample = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + SAMPLE], { type: 'text/csv;charset=utf-8' }));
    a.download = 'mau-danh-muc-thuoc.csv';
    a.click();
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.post<{ inserted: number; updated: number; errors: string[] }>('/medicines/import', { csv: await file.text() });
      setResult(r);
      qc.invalidateQueries();
      toast(`Đã nhập ${r.inserted} thuốc mới, cập nhật ${r.updated} thuốc`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không đọc được file');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nhập danh mục thuốc"
      description="File CSV (UTF-8). Thuốc trùng mã sẽ được cập nhật."
      footer={
        <>
          <Button onClick={close}>Đóng</Button>
          <Button variant="primary" onClick={submit} disabled={!file || !!result} loading={busy}>Nhập dữ liệu</Button>
        </>
      }
    >
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-line px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary-soft/40">
        <FileUp className="h-6 w-6 text-ink-3" />
        <span className="text-[13px] font-medium text-ink">{file ? file.name : 'Chọn file .csv'}</span>
        <span className="text-2xs text-ink-3">Cột bắt buộc: code, name, category, unit, purchase_price, sale_price</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
      </label>
      <button onClick={sample} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
        <Download className="h-3.5 w-3.5" /> Tải file mẫu
      </button>
      {error && <div className="mt-3 rounded-ctl bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>}
      {result && (
        <div className="mt-3 rounded-ctl bg-success-soft px-3 py-2 text-xs text-success">
          Thêm mới {result.inserted} · Cập nhật {result.updated}
          {result.errors.length > 0 && (
            <ul className="mt-1.5 list-disc pl-4 text-danger">
              {result.errors.slice(0, 5).map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
