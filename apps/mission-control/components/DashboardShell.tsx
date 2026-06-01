'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Zap,
  AlertTriangle,
  Settings,
  Users,
  LogOut,
  ChevronRight,
  Rocket,
  Shield,
  BarChart3,
  Phone,
  DollarSign,
  Monitor,
  FileText,
  Puzzle,
  Sun,
  Moon,
  BookOpen,
  Search,
  Webhook,
  LayoutTemplate,
} from 'lucide-react';
import { createBrowserClient } from '@agentcy/supabase';
import Copilot from './Copilot';
import SystemStatus from './SystemStatus';
import { useTheme } from './ThemeProvider';
import { NotificationProvider } from './NotificationProvider';

interface DashboardShellProps {
  user: { email?: string | null };
  children: React.ReactNode;
}

const navigation = [
  { name: 'Search', href: '/dashboard/search', icon: Search },
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Deployments', href: '/dashboard/deployments', icon: Zap },
  { name: 'Incidents', href: '/dashboard/incidents', icon: AlertTriangle },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Costs', href: '/dashboard/costs', icon: DollarSign },
  { name: 'Monitoring', href: '/dashboard/monitoring', icon: Monitor },
  { name: 'Logs', href: '/dashboard/logs', icon: FileText },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { name: 'Audit', href: '/dashboard/audit', icon: FileText },
  { name: 'Integrations', href: '/integrations', icon: Settings },
  { name: 'Plugins', href: '/dashboard/plugins', icon: Puzzle },
  { name: 'Automation', href: '/dashboard/automation', icon: Zap },
  { name: 'Runbooks', href: '/dashboard/runbooks', icon: BookOpen },
  { name: 'Dashboards', href: '/dashboard/dashboards', icon: LayoutTemplate },
  { name: 'On-Call', href: '/dashboard/on-call', icon: Phone },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'SSO', href: '/dashboard/sso', icon: Shield },
];

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const supabase = createBrowserClient();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
        {/* Sidebar */}
        <aside
          className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200`}
        >
          <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
            <Rocket className="h-6 w-6 text-slate-900 dark:text-slate-100 flex-shrink-0" />
            {isSidebarOpen && (
              <span className="ml-3 font-bold text-slate-900 dark:text-slate-100 truncate">Agentcy Control</span>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (pathname !== '/dashboard' &&
                  item.href !== '/dashboard' &&
                  pathname?.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                  {isSidebarOpen && <span className="ml-3 truncate">{item.name}</span>}
                  {isActive && isSidebarOpen && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-full flex items-center justify-center px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isSidebarOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <div className={`flex items-center px-3 py-2 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {user?.email?.split('@')[0]}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {navigation.find((n) => pathname?.startsWith(n.href))?.name || 'Dashboard'}
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Toggle theme"
                aria-label="Toggle theme"
              >
                {mounted && resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <SystemStatus />
            </div>
          </div>
          <div className="p-8">{children}</div>
        </main>

        <Copilot />
      </div>
    </NotificationProvider>
  );
}
