import React from 'react';
import type { UserRole } from '../../types';
interface NavbarProps {
    userName?: string;
    userRole?: UserRole;
    onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
    userName = 'မောင်မောင်',
    userRole = 'CASHIER',
    onLogout,
}) => {
    return (
        <div className="navbar bg-base-100 border-b border-base-200 px-4 sticky top-0 z-30 shadow-xs">
            {/* Mobile Drawer Toggle Button */}
            <div className="flex-none lg:hidden">
                <label htmlFor="app-drawer" className="btn btn-square btn-ghost">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="inline-block w-6 h-6 stroke-current"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 6h16M4 12h16M4 18h16"
                        ></path>
                    </svg>
                </label>
            </div>

            {/* Brand Logo & Title */}
            <div className="flex-1">
                <div className="flex items-center gap-2 cursor-pointer">
                    <span className="text-2xl">🌾</span>
                    <span className="text-xl font-bold text-success tracking-wide">
                        Agri POS
                    </span>
                </div>
            </div>

            {/* Right Side: User Profile & Actions */}
            <div className="flex-none gap-3">
                {/* Role Badge */}
                <span
                    className={`badge font-semibold ${userRole === 'ADMIN' ? 'badge-secondary' : 'badge-success'
                        } text-white`}
                >
                    {userRole}
                </span>

                {/* User Info & Dropdown */}
                <div className="dropdown dropdown-end">
                    <div
                        tabIndex={0}
                        role="button"
                        className="btn btn-ghost btn-circle avatar border border-base-300"
                    >
                        <div className="w-10 rounded-full flex items-center justify-center bg-success/10 text-success font-bold">
                            {userName.charAt(0)}
                        </div>
                    </div>
                    <ul
                        tabIndex={0}
                        className="mt-3 z-1 p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200"
                    >
                        <li className="menu-title px-4 py-2 border-b border-base-200">
                            <p className="font-bold text-base text-base-content">{userName}</p>
                            <p className="text-xs text-gray-500 font-normal">Role: {userRole}</p>
                        </li>
                        <li>
                            <button onClick={onLogout} className="text-error font-medium mt-1">
                                🚪 ထွက်မည် (Logout)
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};