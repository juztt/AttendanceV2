import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal, ConfirmModal } from '@/components/shared/Modal';
import { getShifts, getPayRules, getHolidays, getLocations, getLeaveTypes, upsertShift, upsertPayRule, upsertHoliday, upsertLocation, deleteShift, deletePayRule, deleteHoliday } from '@/lib/repos/settings';
import { loadStore, setSetting } from '@/lib/store';
import { getSetting } from '@/lib/utils';
import { thaiDateShort, formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Save, Settings as SettingsIcon, Clock4, Wallet, CalendarOff, MapPin, FileText, Save as SaveIcon } from 'lucide-react';
import type { Shift, PayRule, Holiday, Location, LeaveType, EmploymentType } from '@/types';

type TabKey = 'general' | 'shifts' | 'payrules' | 'holidays' | 'locations' | 'leavetypes';

export default function AdminSettingsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [, setRefresh] = useState(0);
  const [tab, setTab] = useState<TabKey>('general');

  return (
    <div>
      <PageHeader title="ตั้งค่า" subtitle="จัดการกะ สูตรเงินเดือน วันหยุด สถานที่ และประเภทการลา" />

      <div className="space-y-3 pb-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-1 px-1">
          {[
            { k: 'general', l: 'ทั่วไป', icon: SettingsIcon },
            { k: 'shifts', l: 'กะงาน', icon: Clock4 },
            { k: 'payrules', l: 'สูตรเงินเดือน', icon: Wallet },
            { k: 'holidays', l: 'วันหยุด', icon: CalendarOff },
            { k: 'locations', l: 'สถานที่', icon: MapPin },
            { k: 'leavetypes', l: 'ประเภทการลา', icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.k} onClick={() => setTab(t.k as TabKey)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm border whitespace-nowrap ${tab === t.k ? 'bg-mint-100 border-mint-300 text-mint-600 font-semibold' : 'bg-white border-border text-ink-muted'}`}>
                <Icon className="h-4 w-4" /> {t.l}
              </button>
            );
          })}
        </div>

        {tab === 'general' && <GeneralTab companyId={session?.companyId ?? ''} onSaved={() => { toast.success('บันทึกการตั้งค่าแล้ว'); }} />}

        {tab === 'shifts' && <ShiftsTab companyId={session?.companyId ?? ''} onChange={() => setRefresh((n: number) => n + 1)} />}
        {tab === 'payrules' && <PayRulesTab companyId={session?.companyId ?? ''} onChange={() => setRefresh((n: number) => n + 1)} />}
        {tab === 'holidays' && <HolidaysTab companyId={session?.companyId ?? ''} onChange={() => setRefresh((n: number) => n + 1)} />}
        {tab === 'locations' && <LocationsTab companyId={session?.companyId ?? ''} onChange={() => setRefresh((n: number) => n + 1)} />}
        {tab === 'leavetypes' && <LeaveTypesTab companyId={session?.companyId ?? ''} onChange={() => setRefresh((n: number) => n + 1)} />}
      </div>
    </div>
  );
}

function GeneralTab({ companyId, onSaved }: { companyId: string; onSaved: () => void }) {
  const [mode, setMode] = useState<string>(() => getSetting(companyId, 'location_check_mode', 'warn_only'));
  const [radius, setRadius] = useState<number>(() => getSetting(companyId, 'default_radius_meters', 200));
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setSetting(companyId, 'location_check_mode', mode);
    setSetting(companyId, 'default_radius_meters', radius);
    onSaved();
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <section className="pastel-card p-4 space-y-3">
        <h2 className="font-semibold">การตรวจสอบสถานที่ (GPS)</h2>
        <p className="text-sm text-ink-muted">กำหนดวิธีจัดการ GPS ตอนพนักงานเช็คอิน</p>
        <div>
          <label className="label-base">โหมด</label>
          <select className="input-base" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="off">ปิด (ไม่ใช้ GPS)</option>
            <option value="record_only">บันทึกอย่างเดียว (ไม่บล็อก)</option>
            <option value="warn_only">เตือนเมื่ออยู่นอกพื้นที่ (ค่าเริ่มต้น)</option>
            <option value="enforce">บังคับอยู่ในพื้นที่</option>
          </select>
        </div>
        <div>
          <label className="label-base">รัศมี (เมตร)</label>
          <input type="number" className="input-base" min={50} step={10} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
      </section>
    </div>
  );
}

function ShiftsTab({ companyId, onChange }: { companyId: string; onChange: () => void }) {
  const [editing, setEditing] = useState<Shift | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Shift | null>(null);
  const items = getShifts(companyId);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-muted">{items.length} กะ</div>
        <button onClick={() => { setEditing(null); setOpenForm(true); }} className="btn-primary px-3 py-2 text-sm"><Plus className="h-4 w-4" /> เพิ่มกะ</button>
      </div>
      <div className="space-y-2">
        {items.map((s) => (
          <article key={s.id} className="pastel-card p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl" style={{ backgroundColor: s.color }} />
              <div className="flex-1">
                <div className="font-semibold text-ink">{s.name}</div>
                <div className="text-xs text-ink-muted">{s.start_time}–{s.end_time} • พัก {s.break_minutes} นาที • มาตรฐาน {s.standard_hours} ชม. • grace {s.grace_minutes} นาที</div>
              </div>
              <button onClick={() => { setEditing(s); setOpenForm(true); }} className="btn-ghost h-8 w-8 p-0"><Edit className="h-4 w-4" /></button>
              <button onClick={() => setConfirmDel(s)} className="btn-ghost h-8 w-8 p-0 text-softred-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </div>
      <ShiftForm open={openForm} onClose={() => setOpenForm(false)} editing={editing} companyId={companyId} onSaved={() => { setOpenForm(false); onChange(); }} />
      <ConfirmModal
        open={!!confirmDel}
        title="ลบกะ"
        description={confirmDel ? `ลบกะ "${confirmDel.name}" หรือไม่?` : ''}
        confirmText="ลบ" danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => { if (confirmDel) { deleteShift(confirmDel.id, ''); setConfirmDel(null); onChange(); } }}
      />
    </div>
  );
}

function ShiftForm({ open, onClose, editing, companyId, onSaved }: { open: boolean; onClose: () => void; editing: Shift | null; companyId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Shift>>(() => editing ?? { name: '', start_time: '08:00', end_time: '18:00', break_minutes: 60, standard_hours: 9, grace_minutes: 15, ot_enabled: true, color: '#A7F3D0', is_active: true, company_id: companyId });

  if (!open) return null;
  const save = () => {
    if (!form.name || !form.start_time || !form.end_time) { alert('กรอกข้อมูลให้ครบ'); return; }
    const s: Shift = {
      id: editing?.id ?? '',
      company_id: companyId,
      name: form.name!,
      start_time: form.start_time!,
      end_time: form.end_time!,
      break_minutes: Number(form.break_minutes ?? 60),
      standard_hours: Number(form.standard_hours ?? 8),
      grace_minutes: Number(form.grace_minutes ?? 15),
      ot_enabled: form.ot_enabled ?? true,
      color: form.color ?? '#A7F3D0',
      is_active: form.is_active ?? true,
      created_at: editing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertShift(s, '');
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'แก้ไขกะ' : 'เพิ่มกะ'} footer={
      <>
        <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
        <button className="btn-primary" onClick={save}><SaveIcon className="h-4 w-4" /> บันทึก</button>
      </>
    }>
      <div className="space-y-3">
        <div>
          <label className="label-base">ชื่อกะ</label>
          <input className="input-base" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label-base">เริ่ม</label><input type="time" className="input-base" value={form.start_time ?? '08:00'} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
          <div><label className="label-base">สิ้นสุด</label><input type="time" className="input-base" value={form.end_time ?? '18:00'} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
          <div><label className="label-base">พัก (นาที)</label><input type="number" className="input-base" min={0} value={form.break_minutes ?? 60} onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} /></div>
          <div><label className="label-base">ชั่วโมงมาตรฐาน</label><input type="number" step="0.5" className="input-base" value={form.standard_hours ?? 8} onChange={(e) => setForm({ ...form, standard_hours: Number(e.target.value) })} /></div>
          <div><label className="label-base">Grace (นาที)</label><input type="number" className="input-base" min={0} value={form.grace_minutes ?? 15} onChange={(e) => setForm({ ...form, grace_minutes: Number(e.target.value) })} /></div>
          <div><label className="label-base">สี</label><input type="color" className="input-base h-10" value={form.color ?? '#A7F3D0'} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.ot_enabled ?? true} onChange={(e) => setForm({ ...form, ot_enabled: e.target.checked })} />
          เปิดใช้ OT
        </label>
      </div>
    </Modal>
  );
}

function PayRulesTab({ companyId, onChange }: { companyId: string; onChange: () => void }) {
  const [editing, setEditing] = useState<PayRule | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const items = getPayRules(companyId);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-muted">{items.length} สูตร</div>
        <button onClick={() => { setEditing(null); setOpenForm(true); }} className="btn-primary px-3 py-2 text-sm"><Plus className="h-4 w-4" /> เพิ่มสูตร</button>
      </div>
      <div className="space-y-2">
        {items.map((r) => (
          <article key={r.id} className="pastel-card p-3.5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-mint-200 to-skyblue-200 flex items-center justify-center text-white font-bold">฿</div>
              <div className="flex-1">
                <div className="font-semibold text-ink">{r.name}</div>
                <div className="text-xs text-ink-muted">{labelType(r.employment_type)}</div>
                <div className="text-xs mt-1 grid grid-cols-2 gap-x-3">
                  <div>ค่าแรง/วัน: <strong>{formatCurrency(r.daily_rate)}</strong></div>
                  <div>ค่าแรง/ชม.: <strong>{formatCurrency(r.hourly_rate)}</strong></div>
                  <div>OT/ชม.: <strong>{formatCurrency(r.ot_rate)}</strong></div>
                  <div>วันหยุด: <strong>x{r.holiday_multiplier}</strong></div>
                </div>
              </div>
              <button onClick={() => { setEditing(r); setOpenForm(true); }} className="btn-ghost h-8 w-8 p-0"><Edit className="h-4 w-4" /></button>
              <button onClick={() => { deletePayRule(r.id, ''); onChange(); }} className="btn-ghost h-8 w-8 p-0 text-softred-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </div>
      <PayRuleForm open={openForm} onClose={() => setOpenForm(false)} editing={editing} companyId={companyId} onSaved={() => { setOpenForm(false); onChange(); }} />
    </div>
  );
}

function PayRuleForm({ open, onClose, editing, companyId, onSaved }: { open: boolean; onClose: () => void; editing: PayRule | null; companyId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<PayRule>>(() => editing ?? {
    name: '', employment_type: 'fulltime_passed', standard_hours_per_day: 8, daily_rate: 400, hourly_rate: 37, ot_rate: 40, holiday_multiplier: 2,
    personal_day_off_paid: false, personal_day_off_pay: 0, sick_paid: true, sick_pay_per_day: 350,
    personal_leave_paid: false, personal_leave_pay_per_day: 0, vacation_paid: false, vacation_pay_per_day: 0, is_active: true, company_id: companyId,
  });

  if (!open) return null;
  const save = () => {
    if (!form.name) { alert('กรอกชื่อสูตร'); return; }
    const r: PayRule = {
      id: editing?.id ?? '',
      company_id: companyId,
      name: form.name!,
      employment_type: (form.employment_type ?? 'fulltime_passed') as EmploymentType,
      standard_hours_per_day: Number(form.standard_hours_per_day ?? 8),
      daily_rate: Number(form.daily_rate ?? 0),
      hourly_rate: Number(form.hourly_rate ?? 0),
      ot_rate: Number(form.ot_rate ?? 0),
      holiday_multiplier: Number(form.holiday_multiplier ?? 2),
      personal_day_off_paid: !!form.personal_day_off_paid,
      personal_day_off_pay: Number(form.personal_day_off_pay ?? 0),
      sick_paid: !!form.sick_paid,
      sick_pay_per_day: Number(form.sick_pay_per_day ?? 0),
      personal_leave_paid: !!form.personal_leave_paid,
      personal_leave_pay_per_day: Number(form.personal_leave_pay_per_day ?? 0),
      vacation_paid: !!form.vacation_paid,
      vacation_pay_per_day: Number(form.vacation_pay_per_day ?? 0),
      is_active: form.is_active ?? true,
      created_at: editing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertPayRule(r, '');
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'แก้ไขสูตรเงินเดือน' : 'เพิ่มสูตรเงินเดือน'} size="lg" footer={
      <>
        <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
        <button className="btn-primary" onClick={save}><SaveIcon className="h-4 w-4" /> บันทึก</button>
      </>
    }>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label-base">ชื่อสูตร</label><input className="input-base" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className="label-base">ประเภท</label>
            <select className="input-base" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value as EmploymentType })}>
              <option value="fulltime_passed">ประจำผ่านโปร</option>
              <option value="fulltime_not_passed">ประจำยังไม่ผ่านโปร</option>
              <option value="parttime">พาร์ทไทม์</option>
            </select>
          </div>
          <div><label className="label-base">ชั่วโมงมาตรฐาน/วัน</label><input type="number" step="0.5" className="input-base" value={form.standard_hours_per_day ?? 8} onChange={(e) => setForm({ ...form, standard_hours_per_day: Number(e.target.value) })} /></div>
          <div><label className="label-base">ค่าแรง/วัน (ครบ ชม.)</label><input type="number" className="input-base" value={form.daily_rate ?? 0} onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })} /></div>
          <div><label className="label-base">ค่าแรง/ชั่วโมง (ไม่ครบ)</label><input type="number" className="input-base" value={form.hourly_rate ?? 0} onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })} /></div>
          <div><label className="label-base">OT/ชั่วโมง</label><input type="number" className="input-base" value={form.ot_rate ?? 0} onChange={(e) => setForm({ ...form, ot_rate: Number(e.target.value) })} /></div>
          <div><label className="label-base">วันหยุด (ตัวคูณ)</label><input type="number" step="0.5" className="input-base" value={form.holiday_multiplier ?? 2} onChange={(e) => setForm({ ...form, holiday_multiplier: Number(e.target.value) })} /></div>
        </div>
        <div className="pastel-card p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.personal_day_off_paid} onChange={(e) => setForm({ ...form, personal_day_off_paid: e.target.checked })} />
            จ่ายค่าแรงวันหยุดตัวเอง
          </label>
          {form.personal_day_off_paid && (
            <input type="number" className="input-base" placeholder="จำนวนเงิน/วัน" value={form.personal_day_off_pay ?? 0} onChange={(e) => setForm({ ...form, personal_day_off_pay: Number(e.target.value) })} />
          )}
        </div>
        <div className="pastel-card p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.sick_paid} onChange={(e) => setForm({ ...form, sick_paid: e.target.checked })} /> ลาป่วยได้เงิน</label>
              {form.sick_paid && <input type="number" className="input-base mt-1" value={form.sick_pay_per_day ?? 0} onChange={(e) => setForm({ ...form, sick_pay_per_day: Number(e.target.value) })} />}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.personal_leave_paid} onChange={(e) => setForm({ ...form, personal_leave_paid: e.target.checked })} /> ลากิจได้เงิน</label>
              {form.personal_leave_paid && <input type="number" className="input-base mt-1" value={form.personal_leave_pay_per_day ?? 0} onChange={(e) => setForm({ ...form, personal_leave_pay_per_day: Number(e.target.value) })} />}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.vacation_paid} onChange={(e) => setForm({ ...form, vacation_paid: e.target.checked })} /> ลาพักร้อนได้เงิน</label>
              {form.vacation_paid && <input type="number" className="input-base mt-1" value={form.vacation_pay_per_day ?? 0} onChange={(e) => setForm({ ...form, vacation_pay_per_day: Number(e.target.value) })} />}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function HolidaysTab({ companyId, onChange }: { companyId: string; onChange: () => void }) {
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const items = getHolidays(companyId);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-muted">{items.length} วัน</div>
        <button onClick={() => { setEditing(null); setOpenForm(true); }} className="btn-primary px-3 py-2 text-sm"><Plus className="h-4 w-4" /> เพิ่มวันหยุด</button>
      </div>
      <div className="space-y-2">
        {items.map((h) => (
          <article key={h.id} className="pastel-card p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-pink-100 text-pink-500 flex items-center justify-center">🎉</div>
              <div className="flex-1">
                <div className="font-semibold text-ink">{h.name}</div>
                <div className="text-xs text-ink-muted">{thaiDateShort(h.holiday_date)} • ตัวคูณ x{h.multiplier}</div>
              </div>
              <button onClick={() => { setEditing(h); setOpenForm(true); }} className="btn-ghost h-8 w-8 p-0"><Edit className="h-4 w-4" /></button>
              <button onClick={() => { deleteHoliday(h.id, ''); onChange(); }} className="btn-ghost h-8 w-8 p-0 text-softred-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </div>
      <HolidayForm open={openForm} onClose={() => setOpenForm(false)} editing={editing} companyId={companyId} onSaved={() => { setOpenForm(false); onChange(); }} />
    </div>
  );
}

function HolidayForm({ open, onClose, editing, companyId, onSaved }: { open: boolean; onClose: () => void; editing: Holiday | null; companyId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Holiday>>(() => editing ?? { name: '', holiday_date: new Date().toISOString().slice(0, 10), multiplier: 2, is_recurring: true, company_id: companyId });
  if (!open) return null;
  const save = () => {
    if (!form.name || !form.holiday_date) { alert('กรอกข้อมูลให้ครบ'); return; }
    const h: Holiday = {
      id: editing?.id ?? '',
      company_id: companyId,
      name: form.name!,
      holiday_date: form.holiday_date!,
      multiplier: Number(form.multiplier ?? 2),
      is_recurring: !!form.is_recurring,
      created_at: editing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertHoliday(h, '');
    onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุด'} footer={
      <>
        <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
        <button className="btn-primary" onClick={save}><SaveIcon className="h-4 w-4" /> บันทึก</button>
      </>
    }>
      <div className="space-y-3">
        <div><label className="label-base">ชื่อวันหยุด</label><input className="input-base" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label-base">วันที่</label><input type="date" className="input-base" value={form.holiday_date ?? ''} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} /></div>
        <div><label className="label-base">ตัวคูณ</label><input type="number" step="0.5" className="input-base" value={form.multiplier ?? 2} onChange={(e) => setForm({ ...form, multiplier: Number(e.target.value) })} /></div>
      </div>
    </Modal>
  );
}

function LocationsTab({ companyId, onChange }: { companyId: string; onChange: () => void }) {
  const [editing, setEditing] = useState<Location | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const items = getLocations(companyId);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-muted">{items.length} สถานที่</div>
        <button onClick={() => { setEditing(null); setOpenForm(true); }} className="btn-primary px-3 py-2 text-sm"><Plus className="h-4 w-4" /> เพิ่มสถานที่</button>
      </div>
      <div className="space-y-2">
        {items.map((l) => (
          <article key={l.id} className="pastel-card p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-skyblue-100 text-skyblue-500 flex items-center justify-center"><MapPin className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="font-semibold text-ink">{l.name}</div>
                <div className="text-xs text-ink-muted">{l.latitude.toFixed(4)}, {l.longitude.toFixed(4)} • รัศมี {l.radius_meters} ม.</div>
              </div>
              <button onClick={() => { setEditing(l); setOpenForm(true); }} className="btn-ghost h-8 w-8 p-0"><Edit className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </div>
      <LocationForm open={openForm} onClose={() => setOpenForm(false)} editing={editing} companyId={companyId} onSaved={() => { setOpenForm(false); onChange(); }} />
    </div>
  );
}

function LocationForm({ open, onClose, editing, companyId, onSaved }: { open: boolean; onClose: () => void; editing: Location | null; companyId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Location>>(() => editing ?? { name: '', latitude: 13.7563, longitude: 100.5018, radius_meters: 200, is_active: true, company_id: companyId });
  if (!open) return null;
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (_err) => alert('ไม่สามารถเข้าถึง GPS ได้'),
    );
  };
  const save = () => {
    if (!form.name) { alert('กรอกชื่อสถานที่'); return; }
    const l: Location = {
      id: editing?.id ?? '',
      company_id: companyId,
      name: form.name!,
      latitude: Number(form.latitude ?? 0),
      longitude: Number(form.longitude ?? 0),
      radius_meters: Number(form.radius_meters ?? 200),
      is_active: form.is_active ?? true,
      created_at: editing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertLocation(l, '');
    onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่'} footer={
      <>
        <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
        <button className="btn-primary" onClick={save}><SaveIcon className="h-4 w-4" /> บันทึก</button>
      </>
    }>
      <div className="space-y-3">
        <div><label className="label-base">ชื่อสถานที่</label><input className="input-base" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label-base">Latitude</label><input type="number" step="0.000001" className="input-base" value={form.latitude ?? 0} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} /></div>
          <div><label className="label-base">Longitude</label><input type="number" step="0.000001" className="input-base" value={form.longitude ?? 0} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} /></div>
        </div>
        <div><label className="label-base">รัศมี (เมตร)</label><input type="number" className="input-base" value={form.radius_meters ?? 200} onChange={(e) => setForm({ ...form, radius_meters: Number(e.target.value) })} /></div>
        <button type="button" onClick={useMyLocation} className="btn-secondary text-sm">ใช้ตำแหน่งปัจจุบัน</button>
      </div>
    </Modal>
  );
}

function LeaveTypesTab({ companyId, onChange }: { companyId: string; onChange: () => void }) {
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const items = getLeaveTypes(companyId);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-muted">{items.length} ประเภท</div>
        <button onClick={() => { setEditing(null); setOpenForm(true); }} className="btn-primary px-3 py-2 text-sm"><Plus className="h-4 w-4" /> เพิ่มประเภท</button>
      </div>
      <div className="space-y-2">
        {items.map((t) => (
          <article key={t.id} className="pastel-card p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-lavender-100 text-lavender-500 flex items-center justify-center">📋</div>
              <div className="flex-1">
                <div className="font-semibold text-ink">{t.name}</div>
                <div className="text-xs text-ink-muted">
                  {t.paid ? 'ได้เงิน' : 'ไม่ได้เงิน'} • {t.requires_certificate ? 'ต้องแนบใบรับรอง' : 'ไม่ต้องแนบ'} • สูงสุด {t.max_days_per_year ?? 'ไม่จำกัด'} วัน/ปี
                </div>
              </div>
              <button onClick={() => { setEditing(t); setOpenForm(true); }} className="btn-ghost h-8 w-8 p-0"><Edit className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </div>
      <LeaveTypeForm open={openForm} onClose={() => setOpenForm(false)} editing={editing} companyId={companyId} onSaved={() => { setOpenForm(false); onChange(); }} />
    </div>
  );
}

function LeaveTypeForm({ open, onClose, editing, companyId, onSaved }: { open: boolean; onClose: () => void; editing: LeaveType | null; companyId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<LeaveType>>(() => editing ?? { name: '', category: 'personal', paid: true, requires_certificate: false, max_days_per_year: 6, is_active: true, company_id: companyId });
  if (!open) return null;
  const save = () => {
    if (!form.name) { alert('กรอกชื่อประเภท'); return; }
    const t: LeaveType = {
      id: editing?.id ?? '',
      company_id: companyId,
      name: form.name!,
      category: (form.category ?? 'personal') as any,
      paid: !!form.paid,
      requires_certificate: !!form.requires_certificate,
      max_days_per_year: form.max_days_per_year == null ? null : Number(form.max_days_per_year),
      is_active: form.is_active ?? true,
      created_at: editing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const store = loadStore();
    const idx = store.leaveTypes.findIndex((x) => x.id === t.id);
    if (idx >= 0) store.leaveTypes[idx] = t;
    else store.leaveTypes.push({ ...t, id: t.id || `lt_${Date.now()}` });
    window.localStorage.setItem('mini-timepay-store-v1', JSON.stringify(store));
    onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลา'} footer={
      <>
        <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
        <button className="btn-primary" onClick={save}><SaveIcon className="h-4 w-4" /> บันทึก</button>
      </>
    }>
      <div className="space-y-3">
        <div><label className="label-base">ชื่อประเภท</label><input className="input-base" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div>
          <label className="label-base">หมวด</label>
          <select className="input-base" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })}>
            <option value="sick">ลาป่วย</option>
            <option value="personal">ลากิจ</option>
            <option value="vacation">ลาพักร้อน</option>
            <option value="unpaid">ลาไม่รับเงิน</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> ได้ค่าแรง</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.requires_certificate} onChange={(e) => setForm({ ...form, requires_certificate: e.target.checked })} /> ต้องแนบใบรับรองแพทย์/เอกสาร</label>
        <div><label className="label-base">สูงสุดต่อปี (วัน, เว้นว่าง = ไม่จำกัด)</label><input type="number" className="input-base" value={form.max_days_per_year ?? ''} onChange={(e) => setForm({ ...form, max_days_per_year: e.target.value === '' ? null : Number(e.target.value) })} /></div>
      </div>
    </Modal>
  );
}

function labelType(t: EmploymentType) {
  return t === 'fulltime_passed' ? 'ประจำผ่านโปร' : t === 'fulltime_not_passed' ? 'ประจำยังไม่ผ่านโปร' : 'พาร์ทไทม์';
}

