import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { LayoutDashboard, Settings, LogOut, ChevronDown } from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-60 border-r border-border bg-card/50 flex flex-col h-full" data-testid="sidebar">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm font-mono">TF</span>
        </div>
        <span className="text-base font-semibold tracking-tight" style={{ fontFamily: 'Manrope' }}>
          TaskFlow Pro
        </span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={`nav-${item.label.toLowerCase()}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.5} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* User */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors duration-150"
              data-testid="user-menu-trigger"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                style={{ backgroundColor: user?.avatar_color || '#4F46E5' }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate flex-1 text-left">{user?.name}</span>
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings size={14} className="mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="logout-btn" onClick={handleLogout} className="text-red-500 focus:text-red-500">
              <LogOut size={14} className="mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
