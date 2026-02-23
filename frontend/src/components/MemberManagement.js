import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { projectsAPI } from '../lib/api';
import { toast } from 'sonner';
import { UserPlus, X, Loader2, Crown } from 'lucide-react';
import { useAuth } from '../lib/auth';

export const MemberManagement = ({ open, onOpenChange, project, onUpdated }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await projectsAPI.addMember(project.id, email.trim());
      toast.success('Member added!');
      setEmail('');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsAPI.removeMember(project.id, memberId);
      toast.success('Member removed');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const isOwner = project?.owner_id === user?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="member-management-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Team Members
          </DialogTitle>
          <DialogDescription>Manage who has access to this project</DialogDescription>
        </DialogHeader>

        {/* Add member form */}
        <form onSubmit={handleAddMember} className="flex gap-2">
          <Input
            data-testid="add-member-email-input"
            type="email"
            placeholder="Enter email to invite..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-background"
          />
          <Button
            type="submit"
            data-testid="add-member-btn"
            disabled={loading || !email.trim()}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 transition-transform duration-75"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus size={14} />}
          </Button>
        </form>

        <Separator />

        {/* Members list */}
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {project?.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors duration-150"
                data-testid={`member-${member.id}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                  style={{ backgroundColor: member.avatar_color }}
                >
                  {member.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {member.name}
                    {member.role === 'owner' && (
                      <Crown size={12} className="text-amber-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{member.email}</div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {member.role}
                </Badge>
                {isOwner && member.id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    data-testid={`remove-member-${member.id}-btn`}
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <X size={12} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
