import React from 'react';
import type { UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface NavbarProps {
    userName?: string;
    userRole?: UserRole;
    onLogout?: () => void;
}

const SunIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        className="w-5 h-5 stroke-current"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
    </svg>
);

const MoonIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        className="w-5 h-5 stroke-current"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
    </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
    userName = 'Guest',
    userRole = 'CASHIER',
    onLogout,
}) => {
    const { theme, toggleTheme } = useTheme();
    const { lang, toggleLang, t } = useLanguage();
    const isDark = theme === 'dark';

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
                {/* Language Toggle (MM / EN) */}
                <button
                    onClick={toggleLang}
                    className="btn btn-ghost btn-sm font-black tracking-wider"
                    title={lang === 'mm' ? 'Switch to English' : 'မြန်မာဘာသာသို့ ပြောင်းရန်'}
                    aria-label="Toggle language"
                >
                    <span className={lang === 'mm' ? 'text-primary' : 'text-base-content/40'}>MM</span>
                    <span className="text-base-content/30 text-[10px]">/</span>
                    <span className={lang === 'en' ? 'text-primary' : 'text-base-content/40'}>EN</span>
                </button>

                {/* Theme Toggle (Day / Night) */}
                <button
                    onClick={toggleTheme}
                    className="btn btn-ghost btn-circle"
                    title={isDark ? t('nav.themeLight') : t('nav.themeDark')}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDark ? <SunIcon /> : <MoonIcon />}
                </button>

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
                            <p className="text-xs text-base-content/50 font-normal">Role: {userRole}</p>
                        </li>
                        <li>
                            <button onClick={onLogout} className="text-error font-medium mt-1">
                                {t('nav.logout')}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
