import React from 'react';
import type { UserRole } from '../../types';
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
    // Menu items ဖွဲ့စည်းပုံ
    const menuItems = [
        {
            id: 'pos',
            label: 'အရောင်းမျက်နှာပြင် (POS)',
            icon: '🛒',
            roles: ['ADMIN', 'CASHIER'],
        },
        {
            id: 'inventory',
            label: 'ပစ္စည်းစာရင်း (Inventory)',
            icon: '📦',
            roles: ['ADMIN'],
        },
        {
            id: 'categories',
            label: 'အမျိုးအစားများ (Categories)',
            icon: '🏷️',
            roles: ['ADMIN'],
        },
        {
            id: 'dashboard',
            label: 'စာရင်းအင်း (Dashboard)',
            icon: '📊',
            roles: ['ADMIN'],
        },
        {
            id: 'staff',
            label: 'ဝန်ထမ်းများ (Staff)',
            icon: '👥',
            roles: ['ADMIN'],
        },
        {
            id: 'settings',
            label: 'စနစ်ပြင်ဆင်မှု (Settings)',
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
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
                    ပင်မ မီနူးများ
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
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Footer Info inside Sidebar */}
            <div className="p-3 bg-base-200/60 rounded-xl text-center text-xs text-gray-500">
                <p className="font-semibold text-success">Agri POS v1.0</p>
                <p>© 2026 All Rights Reserved</p>
            </div>
        </aside>
    );
};