import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Avatar } from '@/components/shared/Avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { getAdjustmentRequests, getLeaveRequests, reviewAdjustmentRequest, reviewLeaveRequest } from '@/lib/repos/requests';
import { loadStore } from '@/lib/store';
import { thaiDateShort, thaiDayOfWeek } from '@/lib/utils';
import { Check, X, ScrollText } from 'lucide-react';
import type { RequestStatus } from '@/types';

type TabKey = 'time' | 'leave';

export default function AdminApprovalsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<TabKey>('time');
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');

  const adjRequests = useMemo(() => session ? getAdjustmentRequests(session.companyId) : [], [session, refresh]);
  const leaveRequests = useMemo(() => session ? getLeaveRequests(session.companyId) : [], [session, refresh]);
  const store = useMemo(() => loadStore(), [refresh]);

  const handleApproveAdj = (id: string) => {
    reviewAdjustmentRequest(id, session!.userId, 'approved');
    setRefresh((n) => n + 1);
    toast.success('อนุมัติคำขอแก้เวลาแล้ว');
  };
  const handleRejectAdj = (id: string) => {
    reviewAdjustmentRequest(id, session!.userId, 'rejected');
    setRefresh((n) => n + 1);
    toast.info('ปฏิเสธคำขอ');
  };
  const handleApproveLeave = (id: string) => {
    reviewLeaveRequest(id, session!.userId, 'approved');
    setRefresh((n) => n + 1);
    toast.success('อนุมัติการลา');
  };
  const handleRejectLeave = (id: string) => {
    reviewLeaveRequest(id, session!.userId, 'rejected');
    setRefresh((n) => n + 1);
    toast.info('ปฏิเสธการลา');
  };

  const adjItems = adjRequests.filter((r) => filter === 'all' || r.status === filter);
  const leaveItems = leaveRequests.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div>
      <PageHeader title="คำขออนุมัติ" subtitle={`ขอแก้เวลา ${adjRequests.filter(r => r.status === 'pending').length} • ขอลา ${leaveRequests.filter(r => r.status === 'pending').length}`} />

      <div className="space-y-3 pb-8">
        <div className="flex gap-2">
          {[
            { k: 'time', l: 'ขอแก้เวลา' },
            { k: 'leave', l: 'ขอลา' },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as TabKey)} className={`px-4 py-2 rounded-2xl text-sm font-medium border ${tab === t.k ? 'bg-mint-100 border-mint-300 text-mint-600' : 'bg-white border-border text-ink-muted'}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap ${filter === s ? 'bg-skyblue-100 border-skyblue-300 text-skyblue-500 font-semibold' : 'bg-white border-border text-ink-muted'}`}>
              {s === 'all' ? 'ทั้งหมด' : s === 'pending' ? 'รออนุมัติ' : s === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}
            </button>
          ))}
        </div>

        {tab === 'time' && (
          <div className="space-y-2">
            {adjItems.length === 0 ? <EmptyState icon={<ScrollText className="h-6 w-6" />} title="ไม่มีคำขอ" /> : adjItems.map((r) => {
              const emp = store.employees.find((e) => e.id === r.employee_id);
              return (
                <article key={r.id} className="pastel-card p-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar name={emp?.full_name ?? ''} color={emp?.avatar_color} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{emp?.full_name}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="text-xs text-ink-muted">{thaiDateShort(r.work_date)} • {thaiDayOfWeek(r.work_date)}</div>
                      <div className="text-sm mt-1">
                        {r.field === 'check_in' ? 'ขอแก้เวลาเข้า' : r.field === 'check_out' ? 'ขอแก้เวลาออก' : 'เพิ่มหมายเหตุ'}:
                        <span className="ml-1 text-ink-muted">{r.original_value ?? '—'}</span>
                        {' → '}
                        <span className="font-medium text-ink">{r.requested_value}</span>
                      </div>
                      {r.reason && <div className="text-xs text-ink-muted mt-1">เหตุผล: {r.reason}</div>}
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleApproveAdj(r.id)} className="btn-primary flex-1 text-sm py-2"><Check className="h-4 w-4" /> อนุมัติ</button>
                      <button onClick={() => handleRejectAdj(r.id)} className="btn-danger flex-1 text-sm py-2"><X className="h-4 w-4" /> ปฏิเสธ</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {tab === 'leave' && (
          <div className="space-y-2">
            {leaveItems.length === 0 ? <EmptyState icon={<ScrollText className="h-6 w-6" />} title="ไม่มีคำขอ" /> : leaveItems.map((r) => {
              const emp = store.employees.find((e) => e.id === r.employee_id);
              const lt = store.leaveTypes.find((t) => t.id === r.leave_type_id);
              return (
                <article key={r.id} className="pastel-card p-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar name={emp?.full_name ?? ''} color={emp?.avatar_color} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{emp?.full_name}</span>
                        <span className="badge-lavender text-[10px]">{lt?.name}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="text-xs text-ink-muted">{thaiDateShort(r.start_date)} – {thaiDateShort(r.end_date)} • {r.total_days} วัน</div>
                      {r.reason && <div className="text-sm text-ink-muted mt-1">{r.reason}</div>}
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleApproveLeave(r.id)} className="btn-primary flex-1 text-sm py-2"><Check className="h-4 w-4" /> อนุมัติ</button>
                      <button onClick={() => handleRejectLeave(r.id)} className="btn-danger flex-1 text-sm py-2"><X className="h-4 w-4" /> ปฏิเสธ</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

