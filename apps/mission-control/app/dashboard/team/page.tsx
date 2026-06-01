import { createServerClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { Users, Mail, Shield, UserPlus } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: { email: string | null; full_name: string | null; avatar_url: string | null } | null;
}

export default async function TeamPage() {
  const supabase = await createServerClient();

  const { data: members, error } = await supabase
    .from('agency_memberships')
    .select('*, profiles:user_profiles!inner(email, full_name, avatar_url)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching team:', error);
  }

  const teamMembers: TeamMember[] = (members || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    user_id: m.user_id as string,
    role: m.role as string,
    created_at: m.created_at as string,
    profiles: m.profiles as TeamMember['profiles'],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500 mt-1">Manage agency members and permissions</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <Card>
        {teamMembers.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No team members yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border border-slate-100 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {member.profiles?.full_name || 'Team Member'}
                      </span>
                      <RoleBadge role={member.role} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <Mail className="h-3 w-3" />
                      {member.profiles?.email || 'No email'}
                    </div>
                  </div>
                </div>

                <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  <Shield className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case 'owner':
      return <Badge variant="success">Owner</Badge>;
    case 'admin':
      return <Badge variant="info">Admin</Badge>;
    default:
      return <Badge variant="default">Member</Badge>;
  }
}
