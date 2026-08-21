import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { StoreSettings } from '../context/SettingsContext';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export const SettingsPage: React.FC = () => {
    const { settings, isLoading, updateSettings } = useSettings();
    const [formData, setFormData] = useState<StoreSettings>(settings);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    // Sync form when settings load from server
    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveStatus('saving');
        setErrorMsg('');
        try {
            const ok = await updateSettings(formData);
            if (ok) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3500);
            } else {
                setErrorMsg('သိမ်းဆည်းမှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။');
                setSaveStatus('error');
            }
        } catch {
            setErrorMsg('ဆာဗာနှင့် ချိတ်ဆက်မှု မအောင်မြင်ပါ။');
            setSaveStatus('error');
        }
    };

    const field = (key: keyof StoreSettings, value: string | number) =>
        setFormData((prev) => ({ ...prev, [key]: value }));

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-24">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <span className="ml-3 text-sm text-base-content/50">ဆိုင်ချိန်ညှိချက်များ ရယူနေပါသည်...</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-base-content">⚙️ ဆိုင်ချိန်ညှိချက်များ</h1>
                <p className="text-sm text-base-content/60 mt-1">
                    ပြေစာ (Receipt) ပေါ်တွင် ဖော်ပြမည့် ဆိုင်အချက်အလက်များကို ပြင်ဆင်နိုင်ပါသည်။
                </p>
            </div>

            {/* Save Status Banners */}
            {saveStatus === 'success' && (
                <div className="alert alert-success text-white shadow-xs py-2 px-4 rounded-xl text-sm">
                    <span>✅ ဆိုင်အချက်အလက်များ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။</span>
                </div>
            )}
            {saveStatus === 'error' && (
                <div className="alert alert-error text-white shadow-xs py-2 px-4 rounded-xl text-sm">
                    <span>⚠️ {errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Store Info */}
                <div className="bg-base-100 p-6 rounded-2xl shadow-xs border border-base-200 space-y-4">
                    <h3 className="font-bold text-lg text-primary border-b border-base-200 pb-2">
                        🏪 ဆိုင် အချက်အလက်များ
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label py-1"><span className="label-text text-xs font-semibold">ဆိုင်အမည် *</span></label>
                            <input
                                type="text"
                                required
                                className="input input-bordered input-sm w-full"
                                value={formData.storeName}
                                onChange={(e) => field('storeName', e.target.value)}
                            />
                        </div>

                        <div className="form-control">
                            <label className="label py-1"><span className="label-text text-xs font-semibold">ဖုန်းနံပါတ် *</span></label>
                            <input
                                type="text"
                                required
                                placeholder="09123456789"
                                className="input input-bordered input-sm w-full"
                                value={formData.phone}
                                onChange={(e) => field('phone', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-control">
                        <label className="label py-1"><span className="label-text text-xs font-semibold">ဆိုင်လိပ်စာ</span></label>
                        <textarea
                            rows={2}
                            className="textarea textarea-bordered text-sm w-full"
                            value={formData.address}
                            onChange={(e) => field('address', e.target.value)}
                        />
                    </div>

                    <div className="form-control md:w-40">
                        <label className="label py-1"><span className="label-text text-xs font-semibold">အခွန် နှုန်းထား (%)</span></label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            className="input input-bordered input-sm w-full"
                            value={formData.taxRate}
                            onChange={(e) => field('taxRate', Number(e.target.value))}
                        />
                    </div>
                </div>

                {/* Duration Settings */}
                <div className="bg-base-100 p-6 rounded-2xl shadow-xs border border-base-200 space-y-4">
                    <h3 className="font-bold text-lg text-primary border-b border-base-200 pb-2">
                        ⏳ ကာလအပိုင်းအခြား ဆက်တင်များ (Duration Settings)
                    </h3>
                    <p className="text-xs text-base-content/60">
                        အော်ဒါများ၏ အကြွေးကျန် အခြေအနေကို အလိုအလျောက် တွက်ချက်ရန် ရက်ပေါင်း ကာလများကို သတ်မှတ်ပါ။
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text text-xs font-semibold">
                                    စိုက်ပျိုးရေး ကာလ (ရက်) — Cultivation Duration (Days)
                                </span>
                            </label>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                className="input input-bordered input-sm w-full"
                                value={formData.cultivationDurationDays}
                                onChange={(e) => field('cultivationDurationDays', Number(e.target.value))}
                            />

                        </div>

                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text text-xs font-semibold">
                                    အကြွေးဆပ်ရမည့် ကာလ (ရက်) — Unpaid Duration (Days)
                                </span>
                            </label>
                            <input
                                type="number"
                                min={0}
                                step={1}
                                className="input input-bordered input-sm w-full"
                                value={formData.unpaidDurationDays}
                                onChange={(e) => field('unpaidDurationDays', Number(e.target.value))}
                            />

                        </div>
                    </div>
                </div>

                {/* Receipt Settings */}
                <div className="bg-base-100 p-6 rounded-2xl shadow-xs border border-base-200 space-y-4">
                    <h3 className="font-bold text-lg text-primary border-b border-base-200 pb-2">
                        🧾 ပြေစာ (Receipt) ချိန်ညှိချက်များ
                    </h3>

                    <div className="form-control">
                        <label className="label py-1"><span className="label-text text-xs font-semibold">ပြေစာ ခေါင်းစီး (Header)</span></label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full"
                            value={formData.receiptHeader}
                            onChange={(e) => field('receiptHeader', e.target.value)}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label py-1"><span className="label-text text-xs font-semibold">ပြေစာ အောက်ခြေ (Footer)</span></label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full"
                            value={formData.receiptFooter}
                            onChange={(e) => field('receiptFooter', e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saveStatus === 'saving'}
                        className="btn btn-success text-white px-8 gap-2"
                    >
                        {saveStatus === 'saving' ? (
                            <><span className="loading loading-spinner loading-sm"></span> သိမ်းနေသည်...</>
                        ) : (
                            '💾 ပြောင်းလဲမှုများ သိမ်းဆည်းမည်'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};