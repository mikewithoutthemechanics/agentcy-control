import { redirect } from 'next/navigation';
import { createServerClient } from '@agentcy/supabase';
import DashboardShell from '@/components/DashboardShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import PWARegister from '@/components/PWARegister';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  return (
    <ThemeProvider>
      <DashboardShell user={user}>{children}</DashboardShell>
      <PWARegister />
    </ThemeProvider>
  );
}
