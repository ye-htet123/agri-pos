import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CategoryItem } from '../types';
import api from '../services/api';

interface CategoryContextType {
    categories: CategoryItem[];
    isLoading: boolean;
    error: string | null;
    fetchCategories: () => Promise<void>;
    addCategory: (data: { name: string; description?: string }) => Promise<CategoryItem>;
    updateCategory: (id: string, data: { name?: string; description?: string; isActive?: boolean }) => Promise<CategoryItem>;
    deleteCategory: (id: string) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

const DEFAULT_FALLBACK_CATEGORIES: CategoryItem[] = [
    { id: '1', name: 'ဓာတ်မြေဩဇာ', description: 'ဓာတ်မြေဩဇာ အမျိုးအစားများ', isActive: true },
    { id: '2', name: 'မြေသြဇာ', description: 'သဘာဝနှင့် အခြား မြေသြဇာများ', isActive: true },
    { id: '3', name: 'ပိုးသတ်ဆေး', description: 'ပိုးသတ်ဆေးနှင့် ပေါင်းသတ်ဆေးများ', isActive: true },
    { id: '4', name: 'မျိုးစေ့', description: 'စိုက်ပျိုးရေး မျိုးစေ့များ', isActive: true },
    { id: '5', name: 'စိုက်ပျိုးရေးသုံးကိရိယာ', description: 'စိုက်ပျိုးရေးသုံး ကိရိယာများ', isActive: true },
    { id: '6', name: 'အထွေထွေ', description: 'အထွေထွေ ပစ္စည်းများ', isActive: true },
    { id: '7', name: 'အခြား', description: 'အခြား ပစ္စည်းများ', isActive: true },
];

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_FALLBACK_CATEGORIES);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get('/categories');
            if (response.data?.success && Array.isArray(response.data?.data)) {
                setCategories(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching categories:', err);
            setError(err.response?.data?.message || 'အမျိုးအစားများ ရယူ၍ မရပါ');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const addCategory = async (data: { name: string; description?: string }) => {
        setIsLoading(true);
        try {
            const response = await api.post('/categories', data);
            if (response.data?.success && response.data?.data) {
                const newCategory = response.data.data;
                setCategories((prev) => [...prev, newCategory]);
                return newCategory;
            }
            throw new Error(response.data?.message || 'အမျိုးအစား ထည့်သွင်း၍ မရပါ');
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'အမျိုးအစား ထည့်သွင်း၍ မရပါ';
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const updateCategory = async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
        setIsLoading(true);
        try {
            const response = await api.put(`/categories/${id}`, data);
            if (response.data?.success && response.data?.data) {
                const updated = response.data.data;
                setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
                return updated;
            }
            throw new Error(response.data?.message || 'အမျိုးအစား ပြင်ဆင်၍ မရပါ');
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'အမျိုးအစား ပြင်ဆင်၍ မရပါ';
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteCategory = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await api.delete(`/categories/${id}`);
            if (response.data?.success) {
                setCategories((prev) => prev.filter((c) => c.id !== id));
                return;
            }
            throw new Error(response.data?.message || 'အမျိုးအစား ဖျက်၍ မရပါ');
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'အမျိုးအစား ဖျက်၍ မရပါ';
            throw new Error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <CategoryContext.Provider
            value={{
                categories,
                isLoading,
                error,
                fetchCategories,
                addCategory,
                updateCategory,
                deleteCategory,
            }}
        >
            {children}
        </CategoryContext.Provider>
    );
};

export const useCategory = () => {
    const context = useContext(CategoryContext);
    if (!context) {
        throw new Error('useCategory must be used within a CategoryProvider');
    }
    return context;
};
