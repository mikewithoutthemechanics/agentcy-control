import { createServerClient } from '@agentcy/supabase';
import { Card, Badge, Button } from '@agentcy/ui';
import { Phone, Calendar, Clock, UserPlus, AlertTriangle } from 'lucide-react';

interface OnCallSchedule {
  id: string;
  name: string;
  rotation_type: string;
  handoff_time: string;
  timezone: string;
  projects: { name: string } | null;
}

interface OnCallShift {
  id: string;
  schedule_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  profiles: { email: string | null; full_name: string | null; avatar_url: string | null } | null;
}

export default async function OnCallPage() {
  const supabase = await createServerClient();

  const [{ data: schedules }, { data: shifts }] = await Promise.all([
    supabase
      .from('on_call_schedules')
      .select('*, projects(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('on_call_shifts')
      .select('*, profiles:user_profiles!inner(email, full_name, avatar_url)')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),
  ]);

  const activeShifts: OnCallShift[] = (shifts || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    schedule_id: s.schedule_id as string,
    user_id: s.user_id as string,
    starts_at: s.starts_at as string,
    ends_at: s.ends_at as string,
    profiles: s.profiles as OnCallShift['profiles'],
  }));

  const scheduleList: OnCallSchedule[] = (schedules || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: s.name as string,
    rotation_type: s.rotation_type as string,
    handoff_time: s.handoff_time as string,
    timezone: s.timezone as string,
    projects: s.projects as OnCallSchedule['projects'],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">On-Call</h1>
          <p className="text-sm text-slate-500 mt-1">Schedules, rotations, and escalation policies</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          New Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current On-Call */}
        <div className="lg:col-span-2">
          <Card title="Current On-Call" subtitle="Active shifts">
            {activeShifts.length === 0 ? (
              <div className="py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No active on-call shifts</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create a schedule to start tracking on-call rotations
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-4 border border-slate-100 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {shift.profiles?.full_name || shift.profiles?.email || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(shift.starts_at).toLocaleDateString()} -{' '}
                          {new Date(shift.ends_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">On Duty</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Schedules */}
        <div>
          <Card title="Schedules" subtitle="Rotation configurations">
            {scheduleList.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No schedules configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduleList.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 border border-slate-100 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{schedule.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          <span className="capitalize">{schedule.rotation_type}</span>
                          <span>{schedule.timezone}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="default">{schedule.projects?.name}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
