import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { projectsAPI } from '../lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const CreateProjectDialog = ({ open, onOpenChange, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await projectsAPI.create({ name: name.trim(), description: description.trim() });
      toast.success('Project created!');
      setName('');
      setDescription('');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="create-project-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
            New Project
          </DialogTitle>
          <DialogDescription>Create a new project to organize your tasks</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Project Name</Label>
            <Input
              data-testid="project-name-input"
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description (optional)</Label>
            <textarea
              data-testid="project-description-input"
              placeholder="Brief project description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="create-project-submit-btn"
              disabled={loading || !name.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 transition-transform duration-75"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
