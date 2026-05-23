import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Loader2,
  Star,
  Trash2,
  Pencil,
  AlertTriangle,
  Filter,
  X,
  Save,
} from 'lucide-react';
import type { FeedbackRow, FeedbackStatus } from '../../lib/admin';
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_STYLES,
  FEEDBACK_CATEGORY_LABELS,
} from '../../lib/admin';
import { ConfirmModal } from '../../components/ConfirmModal';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const STATUS_FILTERS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'new', label: 'Mới' },
  { value: 'viewed', label: 'Đã xem' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'resolved', label: 'Đã xử lý' },
];

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [showHighlightedOnly, setShowHighlightedOnly] = useState(false);

  const [selected, setSelected] = useState<FeedbackRow | null>(null);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('new');
  const [editNotes, setEditNotes] = useState('');
  const [editHighlighted, setEditHighlighted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FeedbackRow | null>(null);

  const loadFeedback = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await (supabase.from('feedback') as any)
        .select('*')
        .order('is_highlighted', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      const rows = ((data as FeedbackRow[]) || []).map((row) => ({
        ...row,
        status: row.status || 'new',
        is_highlighted: Boolean(row.is_highlighted),
      }));
      setItems(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không tải được góp ý.';
      if (msg.includes('is_highlighted') || msg.includes('does not exist')) {
        setError(
          'Thiếu cột admin trên bảng feedback. Vào Supabase SQL Editor → chạy file sql/feedback_admin_columns.sql rồi tải lại trang.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (showHighlightedOnly && !item.is_highlighted) return false;
      return true;
    });
  }, [items, statusFilter, showHighlightedOnly]);

  const openEdit = (row: FeedbackRow) => {
    setSelected(row);
    setEditStatus(row.status || 'new');
    setEditNotes(row.admin_notes || '');
    setEditHighlighted(row.is_highlighted);
  };

  const handleSave = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      const { error: updateError } = await (supabase.from('feedback') as any)
        .update({
          status: editStatus,
          admin_notes: editNotes.trim() || null,
          is_highlighted: editHighlighted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      if (updateError) throw updateError;
      toast.success('Đã lưu góp ý.');
      setSelected(null);
      await loadFeedback();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatus = async (row: FeedbackRow, status: FeedbackStatus) => {
    try {
      await (supabase.from('feedback') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      await loadFeedback();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật.');
    }
  };

  const handleToggleHighlight = async (row: FeedbackRow) => {
    try {
      await (supabase.from('feedback') as any)
        .update({
          is_highlighted: !row.is_highlighted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      await loadFeedback();
      if (selected?.id === row.id) {
        setEditHighlighted(!row.is_highlighted);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error: deleteError } = await (supabase.from('feedback') as any)
        .delete()
        .eq('id', deleteTarget.id);
      if (deleteError) throw deleteError;
      toast.success('Đã xóa góp ý.');
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      await loadFeedback();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa.');
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_FILTERS.forEach((f) => {
      if (f.value !== 'all') c[f.value] = items.filter((i) => i.status === f.value).length;
    });
    return c;
  }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Quản lý góp ý</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {items.length} góp ý · {items.filter((i) => i.is_highlighted).length} đang highlight
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer',
              statusFilter === f.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {f.label} ({counts[f.value] ?? 0})
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowHighlightedOnly((v) => !v)}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer',
            showHighlightedOnly
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-white text-slate-600 border-slate-200'
          )}
        >
          <Star className="w-3 h-3" />
          Chỉ highlight
        </button>
      </div>

      <div className="grid xl:grid-cols-12 gap-6 lg:gap-8">
        {/* List */}
        <div className="xl:col-span-4 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm font-medium">Không có góp ý</p>
          ) : (
            filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openEdit(row)}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border transition-all cursor-pointer',
                  selected?.id === row.id
                    ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100'
                    : row.is_highlighted
                      ? 'border-amber-300 bg-amber-50/50 hover:border-amber-400'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-slate-800 text-sm truncate">{row.full_name}</p>
                  {row.is_highlighted && (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mb-2">
                  {FEEDBACK_CATEGORY_LABELS[row.category] || row.category}
                </p>
                <span
                  className={cn(
                    'inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold border',
                    FEEDBACK_STATUS_STYLES[row.status || 'new']
                  )}
                >
                  {FEEDBACK_STATUS_LABELS[row.status || 'new']}
                </span>
                <p className="text-[10px] text-slate-400 mt-2">
                  {new Date(row.created_at).toLocaleString('vi-VN')}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-8">
          {selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 sticky top-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">{selected.full_name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selected.email || 'Không có email'}
                    {selected.age ? ` · ${selected.age} tuổi` : ''}
                    {selected.occupation ? ` · ${selected.occupation}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-sm">
                <p>
                  <span className="font-bold text-slate-600">Loại: </span>
                  {FEEDBACK_CATEGORY_LABELS[selected.category] || selected.category}
                </p>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {selected.content || <em className="text-slate-400">Không có nội dung chi tiết</em>}
                </p>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickStatus(selected, 'viewed')}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Đánh dấu đã xem
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleHighlight(selected)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer',
                    selected.is_highlighted
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 hover:bg-amber-50 text-slate-700'
                  )}
                >
                  <Star className={cn('w-3 h-3', selected.is_highlighted && 'fill-amber-500')} />
                  {selected.is_highlighted ? 'Bỏ highlight' : 'Highlight'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selected)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Xóa
                </button>
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Trạng thái xử lý</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as FeedbackStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                  >
                    {(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {FEEDBACK_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Ghi chú nội bộ (admin)</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    placeholder="Ghi chú xử lý, hướng fix..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHighlighted}
                    onChange={(e) => setEditHighlighted(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500" /> Highlight góp ý quan trọng
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Lưu thay đổi
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              <Pencil className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Chọn một góp ý để xem và chỉnh sửa</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Xóa góp ý"
        message="Bạn có chắc muốn xóa góp ý này? Hành động không thể hoàn tác."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Xóa"
      />
    </div>
  );
}
