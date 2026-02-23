import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { projectsAPI, tasksAPI } from '../lib/api';
import { useWebSocket } from '../lib/websocket';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Users, Settings, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { KanbanBoard } from '../components/KanbanBoard';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { MemberManagement } from '../components/MemberManagement';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-zinc-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
  { id: 'review', label: 'Review', color: 'bg-purple-500' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500' },
];

export default function ProjectBoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState('todo');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        projectsAPI.get(projectId),
        tasksAPI.list(projectId),
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      toast.error('Failed to load project');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket for real-time updates
  const handleWsMessage = useCallback((message) => {
    if (message.type === 'task_created') {
      setTasks(prev => [...prev, message.data]);
    } else if (message.type === 'task_updated') {
      setTasks(prev => prev.map(t => t.id === message.data.id ? message.data : t));
      if (selectedTask?.id === message.data.id) {
        setSelectedTask(message.data);
      }
    } else if (message.type === 'task_deleted') {
      setTasks(prev => prev.filter(t => t.id !== message.data.id));
      if (selectedTask?.id === message.data.id) {
        setSelectedTask(null);
      }
    } else if (message.type === 'tasks_reordered') {
      setTasks(message.data);
    } else if (message.type === 'activity') {
      // Could update activity feed if shown
    }
  }, [selectedTask]);

  useWebSocket(projectId, token, handleWsMessage);

  const handleTaskMove = async (taskId, newStatus, newOrder) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus, order: newOrder } : t
    ));
    try {
      await tasksAPI.move(taskId, { status: newStatus, order: newOrder });
    } catch (err) {
      toast.error('Failed to move task');
      loadData(); // Revert on error
    }
  };

  const handleTaskCreated = () => {
    setShowCreateTask(false);
    loadData();
  };

  const handleTaskUpdated = () => {
    setSelectedTask(null);
    loadData();
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await projectsAPI.delete(projectId);
      toast.success('Project deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const openCreateTask = (status) => {
    setCreateTaskStatus(status);
    setShowCreateTask(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col h-full" data-testid="project-board-page">
      {/* Project Header */}
      <div className="px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              data-testid="back-to-dashboard-btn"
              onClick={() => navigate('/dashboard')}
              className="h-8 w-8"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }} data-testid="project-name">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Member avatars */}
            <div className="flex items-center gap-1 mr-2">
              {project.members?.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white -ml-1 first:ml-0 ring-2 ring-card"
                  style={{ backgroundColor: member.avatar_color }}
                  title={member.name}
                >
                  {member.name?.charAt(0).toUpperCase()}
                </div>
              ))}
              {project.members?.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">+{project.members.length - 3}</span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              data-testid="manage-members-btn"
              onClick={() => setShowMembers(true)}
              className="h-8"
            >
              <Users size={14} strokeWidth={1.5} />
              <span className="hidden sm:inline ml-1">Members</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" data-testid="project-menu-btn">
                  <MoreHorizontal size={14} strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowMembers(true)}>
                  <Users size={14} className="mr-2" />
                  Manage Members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="delete-project-btn"
                  onClick={handleDeleteProject}
                  className="text-red-500 focus:text-red-500"
                >
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          columns={COLUMNS}
          tasks={tasks}
          members={project.members || []}
          onTaskMove={handleTaskMove}
          onTaskClick={setSelectedTask}
          onAddTask={openCreateTask}
        />
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        projectId={projectId}
        members={project.members || []}
        defaultStatus={createTaskStatus}
        onCreated={handleTaskCreated}
      />

      {selectedTask && (
        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          task={selectedTask}
          members={project.members || []}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskUpdated}
        />
      )}

      <MemberManagement
        open={showMembers}
        onOpenChange={setShowMembers}
        project={project}
        onUpdated={loadData}
      />
    </div>
  );
}
