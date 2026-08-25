import { useState, Suspense, lazy } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { ProductProvider } from './context/ProductContext';
import { SettingsProvider } from './context/SettingsContext';
import { CategoryProvider } from './context/CategoryContext';

// Secondary pages are code-split so heavy deps (e.g. Recharts on Analytics)
// never block the first paint. Each chunk is fetched on first navigation.
const InventoryPage = lazy(() => import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const StaffPage = lazy(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const CategoryManagementPage = lazy(() => import('./pages/CategoryManagementPage').then((m) => ({ default: m.CategoryManagementPage })));
const SalesRecordsPage = lazy(() => import('./pages/SalesRecordsPage').then((m) => ({ default: m.SalesRecordsPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));

export default function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  const [currentPath, setCurrentPath] = useState('pos');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-sm font-medium text-base-content/70">{t('app.checkingAuth')}</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  const VALID_PATHS = ['pos', 'sales-records', 'customers', 'inventory', 'categories', 'dashboard', 'analytics', 'staff', 'settings'];

  return (
    <SettingsProvider>
      <CategoryProvider>
        <ProductProvider>
          <div className="drawer lg:drawer-open min-h-screen bg-base-200">
            <input id="app-drawer" type="checkbox" className="drawer-toggle" />

            <div className="drawer-content flex flex-col">
              <Navbar userName={user.name} userRole={user.role} onLogout={logout} />

              <main className="flex-1 p-6">
                {/* Dynamic Page Rendering — lazy chunks + spinner fallback */}
                <Suspense
                  fallback={
                    <div className="flex flex-col items-center justify-center py-24">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                      <p className="mt-4 text-sm font-medium text-base-content/70">{t('common.loading')}</p>
                    </div>
                  }
                >
                  {currentPath === 'pos' && <PosPage />}
                  {currentPath === 'sales-records' && <SalesRecordsPage />}
                  {currentPath === 'customers' && <CustomersPage />}
                  {currentPath === 'inventory' && <InventoryPage />}
                  {currentPath === 'categories' && <CategoryManagementPage />}
                  {currentPath === 'dashboard' && <DashboardPage />}
                  {currentPath === 'analytics' && <AnalyticsPage />}
                  {currentPath === 'staff' && <StaffPage />}
                  {currentPath === 'settings' && <SettingsPage />}

                  {/* Fallback for unknown pages */}
                  {!VALID_PATHS.includes(currentPath) && (
                    <div className="bg-base-100 p-8 rounded-box shadow-xs border border-base-200">
                      <h2 className="text-xl font-bold uppercase">{currentPath} Page</h2>
                      <p className="text-base-content/50 mt-2">
                        {t('app.fallbackText')}
                      </p>
                    </div>
                  )}
                </Suspense>
              </main>
            </div>

            <div className="drawer-side z-40">
              <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
              <Sidebar
                currentPath={currentPath}
                onNavigate={(path) => {
                  setCurrentPath(path);
                  const drawerCheckbox = document.getElementById('app-drawer') as HTMLInputElement;
                  if (drawerCheckbox) drawerCheckbox.checked = false;
                }}
                userRole={user.role}
              />
            </div>
          </div>
        </ProductProvider>
      </CategoryProvider>
    </SettingsProvider>
  );
}