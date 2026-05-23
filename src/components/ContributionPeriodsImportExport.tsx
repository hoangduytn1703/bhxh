import { useState } from 'react';
import { FileUp, FileDown, Sparkles, AlertOctagon } from 'lucide-react';
import type { ContributionPeriod } from '../types';
import {
  parseContributionPeriodsFromText,
  downloadContributionPeriodsTxt,
} from '../lib/periodUtils';

type ContributionPeriodsImportExportProps = {
  periods: ContributionPeriod[];
  onImport: (periods: ContributionPeriod[]) => void;
  exportFilename?: string;
  className?: string;
};

export function ContributionPeriodsImportExport({
  periods,
  onImport,
  exportFilename = 'qua-trinh-dong-bhxh.txt',
  className = '',
}: ContributionPeriodsImportExportProps) {
  const [showImport, setShowImport] = useState(false);
  const [rawText, setRawText] = useState('');
  const [importError, setImportError] = useState('');

  const applyParsed = (parsed: ContributionPeriod[]) => {
    onImport(parsed);
    setImportError('');
    setRawText('');
    setShowImport(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseContributionPeriodsFromText(text);
        if (parsed.length > 0) {
          applyParsed(parsed);
        } else {
          setImportError(
            'Không tìm thấy dữ liệu hợp lệ. Mỗi dòng: YYYY-MM, YYYY-MM, lương (hoặc thai_san).'
          );
        }
      } catch {
        setImportError('Có lỗi xảy ra khi đọc file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTextImportConfirm = () => {
    if (!rawText.trim()) {
      setImportError('Vui lòng dán văn bản trước khi nạp.');
      return;
    }
    const parsed = parseContributionPeriodsFromText(rawText);
    if (parsed.length > 0) {
      applyParsed(parsed);
    } else {
      setImportError('Dữ liệu không đúng mẫu. Ví dụ: 2020-01, 2022-12, 12,500,000');
    }
  };

  const handleExport = () => {
    if (periods.length === 0) {
      setImportError('Chưa có dữ liệu để xuất file.');
      return;
    }
    setImportError('');
    downloadContributionPeriodsTxt(periods, exportFilename);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setShowImport((v) => !v);
            setImportError('');
          }}
          className="px-4 py-2.5 border border-emerald-200 text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <FileUp className="w-4 h-4" />
          {showImport ? 'Đóng nhập liệu' : 'Nhập nhanh từ file'}
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={periods.length === 0}
          className="px-4 py-2.5 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <FileDown className="w-4 h-4 text-blue-600" />
          Xuất file .txt
        </button>
      </div>

      {showImport && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Nhập liệu nhanh
            </span>
          </div>

          <p className="text-xs text-emerald-800 leading-relaxed font-medium">
            Mỗi dòng: <code className="bg-white/80 px-1 rounded font-mono">YYYY-MM, YYYY-MM, lương</code>
            {' '}
            hoặc <code className="bg-pink-100 text-pink-700 px-1 rounded font-mono">thai_san</code> cho kỳ thai sản.
            Ví dụ: <code className="bg-white/80 px-1 rounded font-mono">2019-01, 2022-12, 8,500,000</code>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-emerald-200 p-4 rounded-xl">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                Chọn file (.txt, .csv)
              </label>
              <label className="border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/40 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                <FileUp className="w-6 h-6 text-emerald-500 mb-1" />
                <span className="text-[11px] font-bold text-slate-600 text-center">
                  Click để chọn file
                </span>
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                Hoặc dán văn bản
              </label>
              <textarea
                placeholder={'2018-01, 2022-12, 8,500,000\n2023-01, 2023-12, 12,000,000'}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full h-24 p-3 bg-white border border-emerald-200 rounded-xl text-xs font-mono outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {importError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 shrink-0" /> {importError}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowImport(false);
                setImportError('');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleTextImportConfirm}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer"
            >
              Nạp dữ liệu
            </button>
          </div>
        </div>
      )}

      {importError && !showImport && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-1.5">
          <AlertOctagon className="w-4 h-4 shrink-0" /> {importError}
        </div>
      )}
    </div>
  );
}
