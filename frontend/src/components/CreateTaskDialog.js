import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { tasksAPI } from '../lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const CreateTaskDialog = ({ open, onOpenChange, projectId, members, defaultStatus, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await tasksAPI.create(projectId, {
        title: title.trim(),
        description: description.trim(),
        status: defaultStatus,
        priority,
        assignee_id: assigneeId && assigneeId !== 'unassigned' ? assigneeId : null,
        due_date: dueDate || null,
      });
      toast.success('Task created!');
      setTitle('');
      setDescription('');
      setPriority('medium');
      setAssigneeId('');
      setDueDate('');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-visible" data-testid="create-task-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
            New Task
          </DialogTitle>
          <DialogDescription>Add a new task to the board</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Title</Label>
            <Input
              data-testid="task-create-title-input"
              placeholder="e.g. Design landing page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Description (optional)</Label>
            <textarea
              data-testid="task-create-description-input"
              placeholder="Task details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="task-create-priority-select" className="bg-background">
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger data-testid="task-create-assignee-select" className="bg-background">
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
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Due Date (optional)</Label>
            <Input
              data-testid="task-create-due-date-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-background"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="create-task-submit-btn"
              disabled={loading || !title.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 transition-transform duration-75"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
