import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Loader2,
  Ban,
  Crown,
  UserCheck,
  UserMinus,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import type { MemberProfile } from '../../lib/admin';
import { getMemberDisplayName } from '../../lib/adminMember';
import { toast } from 'sonner';
import { ConfirmModal } from '../../components/ConfirmModal';
import { MemberDetailPanel } from '../../components/admin/MemberDetailPanel';
import { cn } from '../../lib/utils';

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

  const [banModal, setBanModal] = useState<{ member: MemberProfile } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const loadMembers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await (supabase.from('profiles') as any)
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMembers((data as MemberProfile[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách thành viên.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const display = getMemberDisplayName(m).toLowerCase();
      return (
        display.includes(q) ||
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.includes(q)
      );
    });
  }, [members, search]);

  const updateMember = async (id: string, patch: Record<string, unknown>) => {
    const { error: updateError } = await (supabase.from('profiles') as any)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;
    await loadMembers();
    if (selectedMember?.id === id) {
      const { data } = await (supabase.from('profiles') as any).select('*').eq('id', id).single();
      if (data) setSelectedMember(data as MemberProfile);
    }
  };

  const handleBan = async () => {
    if (!banModal) return;
    try {
      await updateMember(banModal.member.id, {
        status: 'banned',
        banned_at: new Date().toISOString(),
        ban_reason: banReason.trim() || 'Vi phạm quy định sử dụng',
      });
      toast.success(`Đã ban ${getMemberDisplayName(banModal.member)}.`);
      setBanModal(null);
      setBanReason('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi ban thành viên.');
    }
  };

  const handleUnban = (member: MemberProfile) => {
    setConfirmAction({
      title: 'Gỡ ban thành viên',
      message: `Cho phép "${getMemberDisplayName(member)}" đăng nhập lại?`,
      onConfirm: async () => {
        try {
          await updateMember(member.id, {
            status: 'active',
            banned_at: null,
            ban_reason: null,
          });
          toast.success(`Đã gỡ ban ${getMemberDisplayName(member)}.`);
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Lỗi khi gỡ ban.');
        }
        setConfirmAction(null);
      },
    });
  };

  const handleToggleVip = (member: MemberProfile) => {
    const revoke = member.is_vip;
    setConfirmAction({
      title: revoke ? 'Gỡ quyền VIP' : 'Cấp quyền VIP',
      message: revoke
        ? `Thu hồi VIP của "${getMemberDisplayName(member)}"?`
        : `Cấp VIP cho "${getMemberDisplayName(member)}"?`,
      onConfirm: async () => {
        try {
          await updateMember(member.id, { is_vip: !revoke });
          toast.success(revoke ? `Đã gỡ VIP.` : `Đã cấp VIP.`);
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật VIP.');
        }
        setConfirmAction(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Quản lý thành viên</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {members.length} thành viên · {members.filter((m) => m.is_vip).length} VIP ·{' '}
            {members.filter((m) => m.status === 'banned').length} bị ban
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className={cn(selectedMember ? 'xl:col-span-5' : 'xl:col-span-12')}>
          {isLoading ? (
            <div className="flex justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left">
                      <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase">
                        Thành viên
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase hidden sm:table-cell">
                        VIP
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-400 font-medium">
                          Không có thành viên nào
                        </td>
                      </tr>
                    ) : (
                      filtered.map((member) => (
                        <tr
                          key={member.id}
                          className={cn(
                            'hover:bg-slate-50/50 cursor-pointer',
                            selectedMember?.id === member.id && 'bg-blue-50/60'
                          )}
                          onClick={() => setSelectedMember(member)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800">
                              {getMemberDisplayName(member)}
                            </p>
                            <p className="text-xs text-slate-500">{member.email || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex px-2 py-0.5 rounded-lg text-xs font-bold border',
                                member.status === 'banned'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              )}
                            >
                              {member.status === 'banned' ? 'Đã ban' : 'Hoạt động'}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {member.is_vip ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Crown className="w-3 h-3" /> VIP
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Thường</span>
                            )}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedMember(member)}
                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {member.status === 'banned' ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnban(member)}
                                  className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                  title="Gỡ ban"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBanModal({ member });
                                    setBanReason('');
                                  }}
                                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                                  title="Ban"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleVip(member)}
                                className={cn(
                                  'p-2 rounded-lg cursor-pointer',
                                  member.is_vip
                                    ? 'text-slate-500 hover:bg-slate-100'
                                    : 'text-amber-600 hover:bg-amber-50'
                                )}
                                title={member.is_vip ? 'Gỡ VIP' : 'Cấp VIP'}
                              >
                                {member.is_vip ? (
                                  <UserMinus className="w-4 h-4" />
                                ) : (
                                  <Crown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
                Bấm dòng hoặc biểu tượng mắt để xem chi tiết và quá trình đóng BHXH.
              </p>
            </div>
          )}
        </div>

        {selectedMember && (
        <div className="xl:col-span-7">
            <MemberDetailPanel
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
            />
        </div>
        )}
        {!selectedMember && (
            <div className="hidden xl:block xl:col-span-7 bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Chọn thành viên để xem chi tiết</p>
            </div>
        )}
      </div>

      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800">Ban thành viên</h3>
                <p className="text-xs text-slate-500">{getMemberDisplayName(banModal.member)}</p>
              </div>
            </div>
            <textarea
              placeholder="Lý do ban (tùy chọn)..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBanModal(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleBan}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Xác nhận ban
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
