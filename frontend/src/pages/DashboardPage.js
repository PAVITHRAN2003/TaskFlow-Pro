import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { dashboardAPI, projectsAPI, activityAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  FolderKanban, ListTodo, Clock, CheckCircle2,
  AlertCircle, TrendingUp, Plus, ArrowRight, User
} from 'lucide-react';
import { CreateProjectDialog } from '../components/CreateProjectDialog';
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <div
    className="bg-card border border-border rounded-lg p-5 hover:border-zinc-600 transition-colors duration-200 animate-fade-slide-up"
    style={{ animationDelay: `${delay}ms` }}
    data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 rounded-md flex items-center justify-center ${color}`}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
    </div>
    <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>{value}</div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

const ActivityItem = ({ activity }) => {
  const actionIcons = {
    project_created: FolderKanban,
    task_created: ListTodo,
    task_updated: TrendingUp,
    task_moved: ArrowRight,
    task_deleted: AlertCircle,
    member_added: User,
  };
  const ActionIcon = actionIcons[activity.action] || ListTodo;

  return (
    <div className="flex items-start gap-3 py-3" data-testid="activity-item">
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <ActionIcon size={14} strokeWidth={1.5} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium text-foreground">{activity.user_name}</span>{' '}
          <span className="text-muted-foreground">{activity.details}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, projectsRes, activityRes] = await Promise.all([
        dashboardAPI.stats(),
        projectsAPI.list(),
        activityAPI.list(15),
      ]);
      setStats(statsRes.data);
      setProjects(projectsRes.data);
      setActivities(activityRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProjectCreated = () => {
    setShowCreateProject(false);
    loadData();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.name?.split(' ')[0]}
          </p>
        </div>
        <Button
          data-testid="create-project-btn"
          onClick={() => setShowCreateProject(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 transition-transform duration-75"
        >
          <Plus size={16} strokeWidth={2} />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FolderKanban} label="Projects" value={stats?.total_projects ?? '-'} color="bg-indigo-600/15 text-indigo-400" delay={0} />
        <StatCard icon={ListTodo} label="Total Tasks" value={stats?.total_tasks ?? '-'} color="bg-cyan-600/15 text-cyan-400" delay={50} />
        <StatCard icon={Clock} label="In Progress" value={stats?.in_progress_tasks ?? '-'} color="bg-amber-600/15 text-amber-400" delay={100} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats?.done_tasks ?? '-'} color="bg-emerald-600/15 text-emerald-400" delay={150} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Projects */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Manrope' }}>Projects</h2>
            <Badge variant="secondary" className="text-xs font-mono">
              {projects.length} total
            </Badge>
          </div>
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <FolderKanban size={40} className="text-muted-foreground mx-auto mb-3" strokeWidth={1} />
                <p className="text-muted-foreground">No projects yet. Create your first project to get started.</p>
              </div>
            ) : (
              projects.map((project, i) => {
                const progress = project.task_count > 0
                  ? Math.round((project.done_count / project.task_count) * 100)
                  : 0;
                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-zinc-600 transition-colors duration-200 animate-fade-slide-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                    data-testid={`project-card-${project.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-base" style={{ fontFamily: 'Manrope' }}>
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {project.done_count}/{project.task_count} tasks
                        </span>
                        <ArrowRight size={14} className="text-muted-foreground" />
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{project.description}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="flex-1 h-1.5" />
                      <span className="text-xs font-mono text-muted-foreground w-10 text-right">{progress}%</span>
                    </div>
                    <div className="flex items-center gap-1 mt-3">
                      {project.members?.slice(0, 4).map((member) => (
                        <div
                          key={member.id}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white -ml-1 first:ml-0 ring-2 ring-card"
                          style={{ backgroundColor: member.avatar_color }}
                          title={member.name}
                        >
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.members?.length > 4 && (
                        <span className="text-xs text-muted-foreground ml-1">+{project.members.length - 4}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Manrope' }}>Activity</h2>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <ScrollArea className="h-[400px]">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
