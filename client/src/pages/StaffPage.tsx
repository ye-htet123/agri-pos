import React, { useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import api from '../services/api';

interface FormData {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  phone: string;
}

const EMPTY_FORM: FormData = { name: '', username: '', password: '', role: 'CASHIER', phone: '' };

export const StaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ─── Fetch staff list ───────────────────────────────────────────────────────
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data?.success) setStaffList(res.data.data);
    } catch (err: any) {
      console.error('[StaffPage] Fetch error', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  // ─── Modal helpers ──────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingStaff(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: User) => {
    setEditingStaff(staff);
    setFormData({ name: staff.name, username: staff.username, password: '', role: staff.role, phone: staff.phone || '' });
    setFormError(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setFormError(null); };

  // ─── Form validation ────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!formData.name.trim()) return 'ဝန်ထမ်းအမည် ထည့်သွင်းပါ။';
    if (!formData.username.trim()) return 'Username ထည့်သွင်းပါ။';
    if (!editingStaff && !formData.password) return 'စကားဝှက် ထည့်သွင်းရန် လိုအပ်ပါသည်။';
    if (formData.password && formData.password.length < 6) return 'စကားဝှက် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။';
    return null;
  };

  // ─── Save (Create / Update) ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setIsSaving(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        role: formData.role,
        phone: formData.phone.trim(),
      };
      // Only include password if filled in (edit mode allows blank = no change)
      if (formData.password) payload.password = formData.password;

      if (editingStaff) {
        const res = await api.put(`/users/${editingStaff.id}`, payload);
        if (res.data?.success) {
          setStaffList((prev) => prev.map((s) => (s.id === editingStaff.id ? { ...s, ...res.data.data } : s)));
          closeModal();
        } else {
          setFormError(res.data?.message || 'ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားပါသည်');
        }
      } else {
        const res = await api.post('/users', payload);
        if (res.data?.success) {
          setStaffList((prev) => [res.data.data, ...prev]);
          closeModal();
        } else {
          setFormError(res.data?.message || 'ဖန်တီးရာတွင် အမှားဖြစ်ပွားပါသည်');
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'ကွန်ရက် အမှားဖြစ်ပွားပါသည်');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'ဖျက်ရာတွင် အမှားဖြစ်ပွားပါသည်');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // ─── Field helper ───────────────────────────────────────────────────────────
  const field = (key: keyof FormData, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-content">👥 ဝန်ထမ်းများ စီမံခန့်ခွဲခြင်း</h1>
          <p className="text-sm text-gray-500 mt-1">
            ဆိုင်၏ ဝန်ထမ်းအကောင့်များနှင့် လုပ်ပိုင်ခွင့် (Role) များကို စီမံနိုင်ပါသည်။
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-success btn-sm text-white">
          ➕ ဝန်ထမ်းအသစ်ထည့်မည်
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-base-100 rounded-2xl shadow-xs border border-base-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-md text-primary"></span>
            <span className="ml-3 text-sm text-gray-400">ဝန်ထမ်းစာရင်း ရယူနေပါသည်...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="bg-base-200/50 text-gray-600 text-sm">
                  <th>အမည်</th>
                  <th>Username</th>
                  <th>ဖုန်းနံပါတ်</th>
                  <th>ရာထူး (Role)</th>
                  <th>စတင်သည့်ရက်</th>
                  <th className="text-right">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody>
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      ဝန်ထမ်းစာရင်း မရှိသေးပါ
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-base-200/30">
                      <td className="font-bold">{staff.name}</td>
                      <td className="font-mono text-xs text-gray-500">@{staff.username}</td>
                      <td className="text-sm">{staff.phone || '-'}</td>
                      <td>
                        <span className={`badge badge-sm font-semibold ${staff.role === 'ADMIN' ? 'badge-primary text-white' : 'badge-ghost border-gray-300'}`}>
                          {staff.role === 'ADMIN' ? '🛡️ ADMIN' : '💵 CASHIER'}
                        </span>
                      </td>
                      <td className="text-xs text-gray-400">
                        {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="text-right space-x-1">
                        <button onClick={() => openEditModal(staff)} className="btn btn-ghost btn-xs text-info">
                          ✏️ ပြင်မည်
                        </button>
                        {deleteConfirmId === staff.id ? (
                          <>
                            <button onClick={() => handleDelete(staff.id)} className="btn btn-error btn-xs text-white">
                              ✔ သေချာပါသည်
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)} className="btn btn-ghost btn-xs">
                              မဖျက်တော့ပါ
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(staff.id)} className="btn btn-ghost btn-xs text-error">
                            🗑️ ဖျက်မည်
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">
              {editingStaff ? '✏️ ဝန်ထမ်းအချက်အလက် ပြင်ဆင်ရန်' : '➕ ဝန်ထမ်းအကောင့်အသစ် ဖွင့်ရန်'}
            </h3>

            {/* API Error Banner */}
            {formError && (
              <div className="alert alert-error text-white text-sm py-2 mb-4">
                <span>⚠️ {formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3" noValidate>

              {/* Name */}
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-semibold">ဝန်ထမ်းအမည် *</span></label>
                <input
                  type="text"
                  required
                  placeholder="ဥပမာ - ဦးမောင်မောင်"
                  className="input input-bordered input-sm w-full"
                  value={formData.name}
                  onChange={(e) => field('name', e.target.value)}
                />
              </div>

              {/* Username – editable only on create */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">Username (အကောင့်ဝင်ရန်) *</span>
                  {editingStaff && (
                    <span className="label-text-alt text-warning text-[10px]">ပြင်၍မရပါ</span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingStaff}
                  placeholder="ဥပမာ - cashier01"
                  className="input input-bordered input-sm w-full font-mono disabled:opacity-50"
                  value={formData.username}
                  onChange={(e) => field('username', e.target.value)}
                />
              </div>

              {/* Password with show/hide toggle */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs font-semibold">
                    စကားဝှက် {editingStaff ? '(ပြောင်းလဲလိုမှသာ ဖြည့်ပါ)' : '*'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingStaff ? '••••••  (ဖြည့်မဖြည့် ကိုက်ဆုံးဖြတ်ပါ)' : 'အနည်းဆုံး ၆ လုံး'}
                    className="input input-bordered input-sm w-full pr-10"
                    value={formData.password}
                    onChange={(e) => field('password', e.target.value)}
                    minLength={formData.password ? 6 : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors text-base"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {!editingStaff && (
                  <span className="text-[10px] text-gray-400 mt-1 ml-1">မိနစ် ၆ လုံး ထက် မနည်းရ</span>
                )}
              </div>

              {/* Phone */}
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-semibold">ဖုန်းနံပါတ်</span></label>
                <input
                  type="text"
                  placeholder="09XXXXXXXXX"
                  className="input input-bordered input-sm w-full"
                  value={formData.phone}
                  onChange={(e) => field('phone', e.target.value)}
                />
              </div>

              {/* Role */}
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs font-semibold">ရာထူး / Role</span></label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={formData.role}
                  onChange={(e) => field('role', e.target.value as UserRole)}
                >
                  <option value="CASHIER">💵 CASHIER (ငွေကိုင် / အရောင်း)</option>
                  <option value="ADMIN">🛡️ ADMIN (မန်နေဂျာ / စနစ်ထိန်းချုပ်သူ)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="modal-action pt-2">
                <button type="button" onClick={closeModal} disabled={isSaving} className="btn btn-ghost btn-sm">
                  မလုပ်တော့ပါ
                </button>
                <button type="submit" disabled={isSaving} className="btn btn-success btn-sm text-white gap-2">
                  {isSaving ? (
                    <><span className="loading loading-spinner loading-xs"></span> သိမ်းနေသည်...</>
                  ) : (
                    editingStaff ? '💾 ပြင်ဆင်မှု သိမ်းမည်' : '✅ အကောင့်ဖွင့်မည်'
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeModal}></div>
        </div>
      )}
    </div>
  );
};