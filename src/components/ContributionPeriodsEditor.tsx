import { Plus, Trash2, FileUp, Sparkles } from 'lucide-react';
import type { ContributionPeriod } from '../types';
import {
  MONTH_OPTIONS,
  YEAR_OPTIONS,
  formatNumberWithCommas,
  emptyMandatoryPeriod,
  emptyMaternityPeriod,
} from '../lib/periodUtils';

type ContributionPeriodsEditorProps = {
  periods: ContributionPeriod[];
  onChange: (periods: ContributionPeriod[]) => void;
  maxHeight?: string;
};

export function ContributionPeriodsEditor({
  periods,
  onChange,
  maxHeight = 'max-h-[420px]',
}: ContributionPeriodsEditorProps) {
  const updatePeriod = (index: number, patch: Partial<ContributionPeriod>) => {
    const next = periods.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange(next);
  };

  const removePeriod = (index: number) => {
    onChange(periods.filter((_, i) => i !== index));
  };

  const appendPeriod = (period: ContributionPeriod) => {
    onChange([...periods, period]);
  };

  return (
    <div
      className={`overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-inner relative ${maxHeight}`}
      id="contribution_periods_list"
    >
      {periods.length === 0 ? (
        <div className="p-10 text-center text-slate-400 font-semibold text-xs space-y-3 bg-slate-50/20">
          <FileUp className="w-8 h-8 text-slate-300 mx-auto" />
          <p>Chưa có dòng dữ liệu đóng bảo hiểm nào!</p>
          <p className="text-[10px] text-slate-400 font-medium mb-3">
            Nhấn một trong hai nút dưới đây để tạo giai đoạn đóng nhanh nhất
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => appendPeriod(emptyMandatoryPeriod())}
              className="px-4 py-2 border border-blue-200 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-500" /> Thêm giai đoạn đóng
            </button>
            <button
              type="button"
              onClick={() => appendPeriod(emptyMaternityPeriod())}
              className="px-4 py-2 border border-pink-200 text-xs font-bold text-pink-700 bg-white hover:bg-pink-50 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-pink-500" /> Thêm giai đoạn thai sản
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between">
          <div className="divide-y divide-slate-100">
            {periods.map((period, index) => (
              <div key={index} className="p-4 bg-white hover:bg-slate-50/40 transition-all">
                <div className="flex items-center justify-between mb-3 md:hidden">
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    Giai đoạn {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePeriod(index)}
                    className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className={`flex flex-col md:flex-row ${index === 0 ? 'md:items-end' : 'md:items-center'} gap-4`}
                >
                  <div
                    className={`hidden md:flex items-center justify-center w-8 shrink-0 ${index === 0 ? 'mb-1' : ''}`}
                  >
                    <span className="text-[11px] font-extrabold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50 shadow-sm">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="flex-1 grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4 items-end">
                    <div className="col-span-1 md:col-span-3">
                      <label
                        className={`text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 ${index > 0 ? 'md:hidden' : ''}`}
                      >
                        Tháng bắt đầu
                      </label>
                      <div className="grid grid-cols-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm">
                        <select
                          className="p-2 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-r border-slate-200/50"
                          value={period.startMonth}
                          onChange={(e) =>
                            updatePeriod(index, { startMonth: parseInt(e.target.value, 10) })
                          }
                        >
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m < 10 ? `0${m}` : m}
                            </option>
                          ))}
                        </select>
                        <select
                          className="p-2 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer text-center"
                          value={period.startYear}
                          onChange={(e) =>
                            updatePeriod(index, { startYear: parseInt(e.target.value, 10) })
                          }
                        >
                          {YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-3">
                      <label
                        className={`text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 ${index > 0 ? 'md:hidden' : ''}`}
                      >
                        Tháng dừng
                      </label>
                      <div className="grid grid-cols-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm">
                        <select
                          className="p-2 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer border-r border-slate-200/50"
                          value={period.endMonth}
                          onChange={(e) =>
                            updatePeriod(index, { endMonth: parseInt(e.target.value, 10) })
                          }
                        >
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m < 10 ? `0${m}` : m}
                            </option>
                          ))}
                        </select>
                        <select
                          className="p-2 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer text-center"
                          value={period.endYear}
                          onChange={(e) =>
                            updatePeriod(index, { endYear: parseInt(e.target.value, 10) })
                          }
                        >
                          {YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-span-2 md:col-span-3.5">
                      <label
                        className={`text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 ${index > 0 ? 'md:hidden' : ''}`}
                      >
                        Mức lương đóng (VNĐ)
                      </label>
                      {period.contributionType === 'maternity' ? (
                        <div className="flex items-center justify-center bg-pink-50 border border-pink-100 rounded-xl px-3 py-2 text-xs font-bold text-pink-700 h-[38px] cursor-not-allowed">
                          🤰 Thai sản (Miễn đóng)
                        </div>
                      ) : (
                        <div className="relative flex items-center bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm overflow-hidden">
                          <input
                            type="text"
                            placeholder="8,500,000"
                            className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-transparent outline-none border-0"
                            value={formatNumberWithCommas(period.salary)}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '');
                              const num = digits ? parseInt(digits, 10) : 0;
                              updatePeriod(index, { salary: num });
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 md:col-span-2.5">
                      <label
                        className={`text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 ${index > 0 ? 'md:hidden' : ''}`}
                      >
                        Hình thức đóng
                      </label>
                      <div className="flex bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm overflow-hidden">
                        <select
                          className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                          value={period.contributionType}
                          onChange={(e) =>
                            updatePeriod(index, {
                              contributionType: e.target.value as ContributionPeriod['contributionType'],
                              salary:
                                e.target.value === 'maternity' ? 0 : period.salary || 6_000_000,
                            })
                          }
                        >
                          <option value="mandatory">Bắt buộc</option>
                          <option value="voluntary">Tự nguyện</option>
                          <option value="maternity">Thai sản</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removePeriod(index)}
                    className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 shrink-0 transition-all shadow-sm cursor-pointer"
                    title="Xóa dòng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-100/90 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10 backdrop-blur-md">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => appendPeriod(emptyMandatoryPeriod())}
                className="px-4 py-2.5 border border-blue-200 text-xs sm:text-sm font-bold text-blue-700 bg-white hover:bg-blue-50 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-600" /> Thêm giai đoạn đóng
              </button>
              <button
                type="button"
                onClick={() => appendPeriod(emptyMaternityPeriod())}
                className="px-4 py-2.5 border border-pink-200 text-xs sm:text-sm font-bold text-pink-700 bg-white hover:bg-pink-50 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-pink-500" /> Thêm giai đoạn thai sản
              </button>
            </div>
            <button
              type="button"
              onClick={() => onChange([])}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-red-500 bg-white border border-red-200 hover:bg-red-50 hover:text-red-700 active:scale-95 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Xóa tất cả
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
