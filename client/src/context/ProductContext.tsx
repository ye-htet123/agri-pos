import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product } from '../types';
import api from '../services/api';

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/products');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        setProducts(response.data.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'ပစ္စည်းစာရင်း ရယူ၍မရပါ';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (newProductData: Omit<Product, 'id'>): Promise<boolean> => {
    try {
      const response = await api.post('/products', newProductData);
      if (response.data?.success && response.data?.data) {
        setProducts((prev) => [response.data.data, ...prev]);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Product Error]: Add product failed', err);
      return false;
    }
  };

  const updateProduct = async (id: string, updatedData: Partial<Product>): Promise<boolean> => {
    try {
      const response = await api.put(`/products/${id}`, updatedData);
      if (response.data?.success && response.data?.data) {
        const updatedItem = response.data.data;
        setProducts((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updatedItem } : item))
        );
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Product Error]: Update product failed', err);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/products/${id}`);
      if (response.data?.success) {
        setProducts((prev) => prev.filter((item) => item.id !== id));
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Product Error]: Delete product failed', err);
      return false;
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        isLoading,
        error,
        refreshProducts: fetchProducts,
        addProduct,
        updateProduct,
        deleteProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};