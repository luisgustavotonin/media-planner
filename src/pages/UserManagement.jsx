import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Shield, UserCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';

const roleIcons = { admin: Shield, consultant: UserCheck, client: Eye };
const roleColors = { admin: 'bg-red-50 text-red-700', consultant: 'bg-blue-50 text-blue-700', client: 'bg-gray-50 text-gray-600' };

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('consultant');
  const [inviting, setInviting] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleInvite = async () => {
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole);
    toast.success('Invitation sent!');
    setInviting(false);
    setInviteOpen(false);
    setInviteEmail('');
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="User Management"
        description="Manage team members and their access levels."
        actions={
          <Button onClick={() => setInviteOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Invite User
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {users.map(u => {
          const Icon = roleIcons[u.role] || Eye;
          return (
            <div key={u.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-600">{u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.full_name || u.email}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${roleColors[u.role] || roleColors.client}`}>
                <Icon className="w-3 h-3" />
                {(u.role || 'consultant').charAt(0).toUpperCase() + (u.role || 'consultant').slice(1)}
              </span>
            </div>
          );
        })}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} className="w-full bg-blue-600 hover:bg-blue-700" disabled={!inviteEmail || inviting}>
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}