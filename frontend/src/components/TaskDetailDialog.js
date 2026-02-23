import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { tasksAPI } from '../lib/api';
import { toast } from 'sonner';
import { Trash2, Calendar, User, Flag, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const PRIORITY_COLORS = {
  low: 'bg-zinc-500/15 text-zinc-400',
  medium: 'bg-amber-500/15 text-amber-400',
  high: 'bg-red-500/15 text-red-400',
  urgent: 'bg-red-600/20 text-red-500',
};

export const TaskDetailDialog = ({ open, onOpenChange, task, members, onUpdated, onDeleted }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await tasksAPI.update(task.id, {
        title,
        description,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
      });
      toast.success('Task updated');
      onUpdated();
    } catch (err) {
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      await tasksAPI.delete(task.id);
      toast.success('Task deleted');
      onDeleted();
    } catch (err) {
      toast.error('Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const assignee = members.find(m => m.id === assigneeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="task-detail-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Edit Task
          </DialogTitle>
          <DialogDescription>Update task details below</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Title</Label>
            <Input
              data-testid="task-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <textarea
              data-testid="task-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Add a description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Flag size={12} strokeWidth={1.5} /> Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="task-status-select" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Flag size={12} strokeWidth={1.5} /> Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="task-priority-select" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <User size={12} strokeWidth={1.5} /> Assignee
              </Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger data-testid="task-assignee-select" className="bg-background">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] text-white"
                          style={{ backgroundColor: m.avatar_color }}
                        >
                          {m.name?.charAt(0)}
                        </span>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar size={12} strokeWidth={1.5} /> Due Date
              </Label>
              <Input
                data-testid="task-due-date-input"
                type="date"
                value={dueDate ? dueDate.split('T')[0] : ''}
                onChange={(e) => setDueDate(e.target.value || null)}
                className="bg-background"
              />
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            data-testid="delete-task-btn"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={14} />}
            <span className="ml-1">Delete</span>
          </Button>
          <Button
            data-testid="save-task-btn"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 transition-transform duration-75"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
