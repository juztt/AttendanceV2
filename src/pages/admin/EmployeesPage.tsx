import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Avatar } from '@/components/shared/Avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Modal, ConfirmModal } from '@/components/shared/Modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { getEmployees, createEmployee, updateEmployee, setEmployeeStatus, resetEmployeePassword } from '@/lib/repos/employees';
import { getShifts, getPayRules } from '@/lib/repos/settings';
import { loadStore } from '@/lib/store';
import { thaiDateShort } from '@/lib/utils';
import { Plus, Edit, Power, KeyRound, Search, Users } from 'lucide-react';
import type { Employee, EmploymentType } from '@/types';

export default function AdminEmployeesPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<Employee | null>(null);
  const [resetPwdFor, setResetPwdFor] = useState<Employee | null>(null);

  const employees = useMemo(() => {
    if (!session) return [];
    const list = getEmployees(session.companyId);
    return list
      .filter((e) => filter === 'all' ? true : e.status === filter)
      .filter((e) => !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || (e.employee_code ?? '').toLowerCase().includes(search.toLowerCase()));
  }, [session, refresh, search, filter]);

  const store = useMemo(() => loadStore(), [refresh]);

  return (
    <div>
      <PageHeader
        title="พนักงาน"
        subtitle={`ทั้งหมด ${employees.length} คน`}
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
            className="btn-primary px-3.5 py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" /> เพิ่มพนักงาน
          </button>
        }
      />

      <div className="space-y-3 pb-8">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
            <input
              className="input-base pl-9"
              placeholder="ค้นหาชื่อหรือรหัส..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-base w-full sm:w-auto sm:min-w-[160px]"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">ทั้งหมด</option>
            <option value="active">ใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>
        </div>

        {employees.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="ยังไม่มีพนักงาน" description="กดปุ่ม 'เพิ่ม' เพื่อเพิ่มพนักงานใหม่" />
        ) : (
          employees.map((e) => (
            <article key={e.id} className="pastel-card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={e.full_name} color={e.avatar_color} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-ink truncate">{e.full_name}</div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="text-xs text-ink-muted">{e.employee_code} • {e.position ?? '—'}</div>
                  <div className="text-xs text-ink-muted mt-0.5">เริ่มงาน {thaiDateShort(e.start_date)}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="badge-mint text-[10px]">{labelType(e.employment_type)}</span>
                    {e.pay_rule_id && <span className="badge-blue text-[10px]">{store.payRules.find((p) => p.id === e.pay_rule_id)?.name}</span>}
                    {e.default_shift_id && <span className="badge-lavender text-[10px]">{store.shifts.find((s) => s.id === e.default_shift_id)?.name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                <button onClick={() => { setEditing(e); setOpenForm(true); }} className="btn-secondary text-xs px-3 py-1.5"><Edit className="h-3 w-3" /> แก้ไข</button>
                <button onClick={() => setResetPwdFor(e)} className="btn-secondary text-xs px-3 py-1.5"><KeyRound className="h-3 w-3" /> รีเซ็ตรหัส</button>
                <button onClick={() => setConfirmStatus(e)} className={`text-xs px-3 py-1.5 rounded-2xl font-medium ${e.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}>
                  <Power className="h-3 w-3 inline" /> {e.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <EmployeeFormModal
        open={openForm}
        onClose={() => { setOpenForm(false); setEditing(null); }}
        editing={editing}
        onSaved={() => { setOpenForm(false); setEditing(null); setRefresh((n) => n + 1); toast.success('บันทึกพนักงานเรียบร้อย'); }}
        companyId={session?.companyId ?? ''}
        actorId={session?.userId ?? ''}
      />

      <ConfirmModal
        open={!!confirmStatus}
        title={confirmStatus?.status === 'active' ? 'ปิดใช้งานพนักงาน' : 'เปิดใช้งานพนักงาน'}
        description={confirmStatus ? `ต้องการ${confirmStatus.status === 'active' ? 'ปิด' : 'เปิด'}ใช้งาน "${confirmStatus.full_name}" หรือไม่?` : ''}
        confirmText={confirmStatus?.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
        danger={confirmStatus?.status === 'active'}
        onCancel={() => setConfirmStatus(null)}
        onConfirm={() => {
          if (!confirmStatus) return;
          const next = confirmStatus.status === 'active' ? 'inactive' : 'active';
          setEmployeeStatus(confirmStatus.id, session!.userId, next);
          setConfirmStatus(null);
          setRefresh((n) => n + 1);
          toast.success('อัปเดตสถานะเรียบร้อย');
        }}
      />

      <ResetPasswordModal
        employee={resetPwdFor}
        onClose={() => setResetPwdFor(null)}
        onDone={() => { setResetPwdFor(null); toast.success('รีเซ็ตรหัสผ่านแล้ว'); }}
      />
    </div>
  );
}

function labelType(t: EmploymentType) {
  return t === 'fulltime_passed' ? 'ประจำผ่านโปร' : t === 'fulltime_not_passed' ? 'ประจำยังไม่ผ่านโปร' : 'พาร์ทไทม์';
}

function EmployeeFormModal({ open, onClose, editing, onSaved, companyId, actorId }: { open: boolean; onClose: () => void; editing: Employee | null; onSaved: () => void; companyId: string; actorId: string }) {
  const toast = useToast();
  const shifts = companyId ? getShifts(companyId) : [];
  const payRules = companyId ? getPayRules(companyId) : [];
  const [form, setForm] = useState({
    full_name: editing?.full_name ?? '',
    nickname: editing?.nickname ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    position: editing?.position ?? '',
    employment_type: (editing?.employment_type ?? 'fulltime_passed') as EmploymentType,
    pay_rule_id: editing?.pay_rule_id ?? '',
    default_shift_id: editing?.default_shift_id ?? '',
    start_date: editing?.start_date ?? new Date().toISOString().slice(0, 10),
    createLogin: !editing,
    password: 'demo1234',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('กรุณากรอกชื่อ-นามสกุล'); return; }
    setSaving(true);
    try {
      if (editing) {
        updateEmployee(editing.id, actorId, {
          full_name: form.full_name,
          nickname: form.nickname || null,
          phone: form.phone || null,
          email: form.email || null,
          position: form.position || null,
          employment_type: form.employment_type,
          pay_rule_id: form.pay_rule_id || null,
          default_shift_id: form.default_shift_id || null,
          start_date: form.start_date,
        });
        onSaved();
      } else {
        createEmployee({
          company_id: companyId,
          full_name: form.full_name,
          nickname: form.nickname,
          phone: form.phone,
          email: form.email,
          position: form.position,
          employment_type: form.employment_type,
          pay_rule_id: form.pay_rule_id || undefined,
          default_shift_id: form.default_shift_id || undefined,
          start_date: form.start_date,
          createLogin: form.createLogin,
          password: form.password,
          role: 'employee',
          actorId,
        });
        onSaved();
      }
    } catch (e: any) {
      toast.error('บันทึกไม่สำเร็จ', e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `แก้ไขพนักงาน: ${editing.full_name}` : 'เพิ่มพนักงานใหม่'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">ชื่อ-นามสกุล *</label>
            <input className="input-base" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label-base">ชื่อเล่น</label>
            <input className="input-base" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>
          <div>
            <label className="label-base">เบอร์โทร</label>
            <input className="input-base" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label-base">อีเมล</label>
            <input className="input-base" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label-base">ตำแหน่ง</label>
            <input className="input-base" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </div>
          <div>
            <label className="label-base">วันเริ่มงาน</label>
            <input className="input-base" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <label className="label-base">ประเภทงาน *</label>
            <select className="input-base" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value as EmploymentType })}>
              <option value="fulltime_passed">ประจำผ่านโปร</option>
              <option value="fulltime_not_passed">ประจำยังไม่ผ่านโปร</option>
              <option value="parttime">พาร์ทไทม์</option>
            </select>
          </div>
          <div>
            <label className="label-base">สูตรเงินเดือน</label>
            <select className="input-base" value={form.pay_rule_id} onChange={(e) => setForm({ ...form, pay_rule_id: e.target.value })}>
              <option value="">— ไม่ระบุ —</option>
              {payRules.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">กะเริ่มต้น</label>
            <select className="input-base" value={form.default_shift_id} onChange={(e) => setForm({ ...form, default_shift_id: e.target.value })}>
              <option value="">— ไม่ระบุ —</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>)}
            </select>
          </div>
        </div>
        {!editing && (
          <div className="pastel-card p-3 space-y-2 bg-mint-50/40">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.createLogin} onChange={(e) => setForm({ ...form, createLogin: e.target.checked })} />
              <span>สร้างบัญชีเข้าใช้งานให้พนักงาน</span>
            </label>
            {form.createLogin && (
              <div>
                <label className="label-base">รหัสผ่านเริ่มต้น</label>
                <input className="input-base" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ employee, onClose, onDone }: { employee: Employee | null; onClose: () => void; onDone: () => void }) {
  const [pwd, setPwd] = useState('demo1234');
  if (!employee) return null;
  return (
    <Modal
      open={!!employee}
      onClose={onClose}
      title={`รีเซ็ตรหัสผ่าน: ${employee.full_name}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button className="btn-primary" onClick={() => { try { resetEmployeePassword(employee.id, pwd); onDone(); } catch (e: any) { alert(e?.message); } }}>บันทึก</button>
        </>
      }
    >
      <label className="label-base">รหัสผ่านใหม่</label>
      <input className="input-base" value={pwd} onChange={(e) => setPwd(e.target.value)} />
    </Modal>
  );
}
