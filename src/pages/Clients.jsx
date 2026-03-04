import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/hooks/useAuth';
import PageHeader from '../components/ui-custom/PageHeader';
import EmptyState from '../components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Plus, Search, MapPin, Phone, Mail, Pencil, Trash2 } from 'lucide-react';

const ESPECIALIDADES = [
  { value: 'implants', label: 'Implantes' },
  { value: 'aesthetics', label: 'Estética' },
  { value: 'orthodontics', label: 'Ortodontia' },
  { value: 'general', label: 'Clínica Geral' },
  { value: 'periodontics', label: 'Periodontia' },
  { value: 'endodontics', label: 'Endodontia' },
  { value: 'pediatric', label: 'Odontopediatria' },
  { value: 'other', label: 'Outro' },
];

const emptyClient = { clinic_name: '', responsible_person: '', phone: '', email: '', city: '', specialty: 'general', average_ticket: 5000, primary_brand_color: '#3b82f6', secondary_brand_color: '#1e40af', logo_url: '' };

export default function Clients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.Client.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Client.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setOpen(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const myClients = user?.role === 'admin' ? clients : clients.filter(c => c.created_by === user?.email);
  const filtered = myClients.filter(c => c.clinic_name?.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = () => {
    if (editing) { updateMut.mutate({ id: editing.id, d: form }); }
    else { createMut.mutate(form); }
  };

  const handleEdit = (client) => {
    setEditing(client);
    setForm({ clinic_name: client.clinic_name || '', responsible_person: client.responsible_person || '', phone: client.phone || '', email: client.email || '', city: client.city || '', specialty: client.specialty || 'general', average_ticket: client.average_ticket || 5000, primary_brand_color: client.primary_brand_color || '#3b82f6', secondary_brand_color: client.secondary_brand_color || '#1e40af', logo_url: client.logo_url || '' });
    setOpen(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploading(false);
  };

  const getEspecialidadeLabel = (val) => ESPECIALIDADES.find(e => e.value === val)?.label || val;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Clientes"
        description="Gerencie suas clínicas odontológicas."
        actions={
          <Button onClick={() => { setEditing(null); setForm(emptyClient); setOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Adicionar Cliente
          </Button>
        }
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-white" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Building2} title="Nenhum cliente ainda" description="Adicione sua primeira clínica para começar a criar planos de mídia." action={
          <Button onClick={() => { setEditing(null); setForm(emptyClient); setOpen(true); }} variant="outline" size="sm">
            <Plus className="w-3 h-3 mr-1" /> Adicionar Cliente
          </Button>
        } />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: client.primary_brand_color || '#3b82f6' }}>
                      <span className="text-white text-sm font-bold">{client.clinic_name?.[0]}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{client.clinic_name}</h3>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full font-medium">{getEspecialidadeLabel(client.specialty)}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(client)} className="p-1.5 rounded-md hover:bg-gray-100">
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button onClick={() => deleteMut.mutate(client.id)} className="p-1.5 rounded-md hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                {client.responsible_person && <div className="flex items-center gap-2"><Building2 className="w-3 h-3" />{client.responsible_person}</div>}
                {client.city && <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{client.city}</div>}
                {client.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{client.phone}</div>}
                {client.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{client.email}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">Ticket Médio</span>
                <span className="text-sm font-semibold text-gray-900">R${(client.average_ticket || 0).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Nome da Clínica *</Label>
              <Input value={form.clinic_name} onChange={e => setForm({...form, clinic_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Responsável</Label>
                <Input value={form.responsible_person} onChange={e => setForm({...form, responsible_person: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Especialidade</Label>
                <Select value={form.specialty} onValueChange={v => setForm({...form, specialty: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ticket Médio (R$)</Label>
                <Input type="number" value={form.average_ticket} onChange={e => setForm({...form, average_ticket: Number(e.target.value)})} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Logotipo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url && <img src={form.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cor Primária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.primary_brand_color} onChange={e => setForm({...form, primary_brand_color: e.target.value})} className="w-8 h-8 rounded border-0 cursor-pointer" />
                  <Input value={form.primary_brand_color} onChange={e => setForm({...form, primary_brand_color: e.target.value})} className="flex-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Cor Secundária</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.secondary_brand_color} onChange={e => setForm({...form, secondary_brand_color: e.target.value})} className="w-8 h-8 rounded border-0 cursor-pointer" />
                  <Input value={form.secondary_brand_color} onChange={e => setForm({...form, secondary_brand_color: e.target.value})} className="flex-1" />
                </div>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700" disabled={!form.clinic_name || createMut.isPending || updateMut.isPending}>
              {editing ? 'Atualizar Cliente' : 'Criar Cliente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}