import React from 'react';
import type { UserRole } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface SidebarProps {
    currentPath: string;
    onNavigate: (path: string) => void;
    userRole?: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
    currentPath,
    onNavigate,
    userRole = 'ADMIN',
}) => {
    const { t } = useLanguage();

    // Menu items ဖွဲ့စည်းပုံ
    const menuItems = [
        {
            id: 'pos',
            labelKey: 'sidebar.pos',
            icon: '🛒',
            roles: ['ADMIN', 'CASHIER'],
        },
        {
            id: 'sales-records',
            labelKey: 'sidebar.salesRecords',
            icon: '📋',
            roles: ['ADMIN'],
        },
        {
            id: 'inventory',
            labelKey: 'sidebar.inventory',
            icon: '📦',
            roles: ['ADMIN'],
        },
        {
            id: 'categories',
            labelKey: 'sidebar.categories',
            icon: '🏷️',
            roles: ['ADMIN'],
        },
        {
            id: 'dashboard',
            labelKey: 'sidebar.dashboard',
            icon: '📊',
            roles: ['ADMIN'],
        },
        {
            id: 'staff',
            labelKey: 'sidebar.staff',
            icon: '👥',
            roles: ['ADMIN'],
        },
        {
            id: 'settings',
            labelKey: 'sidebar.settings',
            icon: '⚙️',
            roles: ['ADMIN'],
        },
    ];

    // User Role ပေါ်မူတည်၍ Menu စစ်ထုတ်ခြင်း
    const filteredMenuItems = menuItems.filter((item) =>
        item.roles.includes(userRole)
    );

    return (
        <aside className="w-64 bg-base-100 min-h-screen border-r border-base-200 p-4 flex flex-col justify-between">
            <div>
                <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-4 px-2">
                    {t('sidebar.mainMenu')}
                </div>
                <ul className="menu menu-md p-0 gap-1">
                    {filteredMenuItems.map((item) => {
                        const isActive = currentPath === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => onNavigate(item.id)}
                                    className={`flex items-center gap-3 font-medium rounded-lg px-4 py-3 transition-colors ${isActive
                                        ? 'active bg-success text-white font-semibold shadow-xs'
                                        : 'hover:bg-base-200 text-base-content'
                                        }`}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    <span>{t(item.labelKey)}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Footer Info inside Sidebar */}
            <div className="p-3 bg-base-200/60 rounded-xl text-center text-xs text-base-content/50">
                <p className="font-semibold text-success">Agri POS v1.0</p>
                <p>{t('sidebar.copyright')}</p>
            </div>
        </aside>
    );
};
