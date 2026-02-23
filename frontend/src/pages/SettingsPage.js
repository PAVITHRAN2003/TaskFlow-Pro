import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { Moon, Sun, Bell, User, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [emailNotifs, setEmailNotifs] = useState(true);

  const toggleTheme = (checked) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('taskflow_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('taskflow_theme', 'light');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto" data-testid="settings-page">
      <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Manrope' }}>
        Settings
      </h1>
      <p className="text-muted-foreground mb-8">Manage your account and preferences</p>

      {/* Profile Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User size={16} strokeWidth={1.5} />
          PROFILE
        </div>
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ backgroundColor: user?.avatar_color || '#4F46E5' }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-lg" style={{ fontFamily: 'Manrope' }}>{user?.name}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Display Name</Label>
              <Input defaultValue={user?.name} className="bg-background" disabled />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Address</Label>
              <Input defaultValue={user?.email} className="bg-background" disabled />
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-6 mt-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {darkMode ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
          APPEARANCE
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium" style={{ fontFamily: 'Manrope' }}>Dark Mode</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Toggle between light and dark theme
              </div>
            </div>
            <Switch
              data-testid="dark-mode-toggle"
              checked={darkMode}
              onCheckedChange={toggleTheme}
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-6 mt-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Bell size={16} strokeWidth={1.5} />
          NOTIFICATIONS
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium" style={{ fontFamily: 'Manrope' }}>Email Notifications</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Receive email updates about task assignments and project changes
              </div>
            </div>
            <Switch
              data-testid="email-notifs-toggle"
              checked={emailNotifs}
              onCheckedChange={setEmailNotifs}
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="space-y-6 mt-10 mb-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Shield size={16} strokeWidth={1.5} />
          SECURITY
        </div>
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Change Password</Label>
            <Input type="password" placeholder="New password" className="bg-background" />
          </div>
          <Button
            variant="outline"
            className="active:scale-95 transition-transform duration-75"
            onClick={() => toast.info('Password change coming soon')}
          >
            Update Password
          </Button>
        </div>
      </div>
    </div>
  );
}
