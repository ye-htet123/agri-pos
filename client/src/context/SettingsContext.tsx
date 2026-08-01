import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface StoreSettings {
  storeName: string;
  phone: string;
  address: string;
  receiptHeader: string;
  receiptFooter: string;
  taxRate: number;
}

interface SettingsContextType {
  settings: StoreSettings;
  isLoading: boolean;
  updateSettings: (newSettings: StoreSettings) => Promise<boolean>;
}

const defaultSettings: StoreSettings = {
  storeName: 'အောင်စိုက်ပျိုးရေး ပစ္စည်းဆိုင်',
  phone: '09123456789, 09987654321',
  address: 'အမှတ် (၄၅)၊ ဗိုလ်ချုပ်လမ်း၊ ပြည်မြို့။',
  receiptHeader: 'စိုက်ပျိုးရေးသုံး ပစ္စည်းမျိုးစုံ လက်လီ/လက်ကား ရောင်းဝယ်ရေး',
  receiptFooter: 'ဝယ်ယူအားပေးမှုကို အထူးကျေးဇူးတင်ရှိပါသည်။',
  taxRate: 0,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data?.success && response.data?.data) {
          const data = response.data.data;
          setSettings({
            storeName: data.shopName || data.storeName || defaultSettings.storeName,
            phone: data.phone || defaultSettings.phone,
            address: data.address || defaultSettings.address,
            receiptHeader: data.receiptHeader || defaultSettings.receiptHeader,
            receiptFooter: data.receiptFooter || defaultSettings.receiptFooter,
            taxRate: data.taxRate !== undefined ? data.taxRate : 0,
          });
        }
      } catch (error) {
        console.error('[Settings Error]: Failed to fetch settings', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: StoreSettings): Promise<boolean> => {
    try {
      const response = await api.put('/settings', {
        shopName: newSettings.storeName,
        phone: newSettings.phone,
        address: newSettings.address,
        receiptHeader: newSettings.receiptHeader,
        receiptFooter: newSettings.receiptFooter,
        taxRate: newSettings.taxRate,
      });

      if (response.data?.success) {
        setSettings(newSettings);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Settings Error]: Failed to update settings', error);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};