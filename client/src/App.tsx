import { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { InventoryPage } from './pages/InventoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { StaffPage } from './pages/StaffPage';
import { SettingsPage } from './pages/SettingsPage';
import { CategoryManagementPage } from './pages/CategoryManagementPage';
import { useAuth } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import { SettingsProvider } from './context/SettingsContext';
import { CategoryProvider } from './context/CategoryContext';

export default function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState('pos');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-sm font-medium text-base-content/70">အချက်အလက် စစ်ဆေးနေပါသည်...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  const VALID_PATHS = ['pos', 'inventory', 'categories', 'dashboard', 'staff', 'settings'];

  return (
    <SettingsProvider>
      <CategoryProvider>
        <ProductProvider>
          <div className="drawer lg:drawer-open min-h-screen bg-base-200">
            <input id="app-drawer" type="checkbox" className="drawer-toggle" />

            <div className="drawer-content flex flex-col">
              <Navbar userName={user.name} userRole={user.role} onLogout={logout} />

              <main className="flex-1 p-6">
                {/* Dynamic Page Rendering */}
                {currentPath === 'pos' && <PosPage />}
                {currentPath === 'inventory' && <InventoryPage />}
                {currentPath === 'categories' && <CategoryManagementPage />}
                {currentPath === 'dashboard' && <DashboardPage />}
                {currentPath === 'staff' && <StaffPage />}
                {currentPath === 'settings' && <SettingsPage />}

              {/* Fallback for unknown pages */}
              {!VALID_PATHS.includes(currentPath) && (
                <div className="bg-base-100 p-8 rounded-box shadow-xs border border-base-200">
                  <h2 className="text-xl font-bold uppercase">{currentPath} Page</h2>
                  <p className="text-gray-500 mt-2">
                    ဒီ စာမျက်နှာကို နောက်အဆင့်တွင် ဆက်လက် ရေးသားပါမည်။
                  </p>
                </div>
              )}
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