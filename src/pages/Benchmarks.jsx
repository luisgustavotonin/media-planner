import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui-custom/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';

const SEGMENTOS_PT = {
  implants: 'Implantes', aesthetics: 'Estética', orthodontics: 'Ortodontia',
  general: 'Clínica Geral', periodontics: 'Periodontia', endodontics: 'Endodontia',
  pediatric: 'Odontopediatria', other: 'Outro',
};

export default function Benchmarks() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: () => base44.entities.Benchmark.list(),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Benchmark.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['benchmarks'] }); setEditOpen(false); },
  });

  const handleEdit = (b) => { setEditing(b); setForm({ ...b }); setEditOpen(true); };
  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...data } = form;
    updateMut.mutate({ id: editing.id, d: data });
  };
  const fmtPct = v => v ? `${(v * 100).toFixed(0)}%` : '—';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Benchmarks" description="Taxas de conversão e CPL padrão por segmento. Apenas administradores." />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Segmento</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">Lead→Consulta</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">Consulta→Comparec.</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">Comparec.→Venda</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">CPL Meta</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">CPL Google</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">CPL TikTok</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">CPL YouTube</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500">CPL Outro</th>
                <th className="py-3 px-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {benchmarks.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-medium text-gray-900">{SEGMENTOS_PT[b.segment] || b.segment}</td>
                  <td className="py-3 px-3 text-center text-gray-600">{fmtPct(b.lead_to_appointment_rate)}</td>
                  <td className="py-3 px-3 text-center text-gray-600">{fmtPct(b.appointment_to_show_rate)}</td>
                  <td className="py-3 px-3 text-center text-gray-600">{fmtPct(b.show_to_sale_rate)}</td>
                  <td className="py-3 px-3 text-center text-gray-600">R${b.meta_default_cpl || 0}</td>
                  <td className="py-3 px-3 text-center text-gray-600">R${b.google_default_cpl || 0}</td>
                  <td className="py-3 px-3 text-center text-gray-600">R${b.tiktok_default_cpl || 0}</td>
                  <td className="py-3 px-3 text-center text-gray-600">R${b.youtube_default_cpl || 0}</td>
                  <td className="py-3 px-3 text-center text-gray-600">R${b.other_default_cpl || 0}</td>
                  <td className="py-3 px-3">
                    <button onClick={() => handleEdit(b)} className="p-1.5 rounded-md hover:bg-gray-100">
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Benchmark — {SEGMENTOS_PT[form.segment] || form.segment}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taxas de Conversão</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Lead→Consulta</Label>
                <Input type="number" step="0.01" min="0" max="1" value={form.lead_to_appointment_rate || ''} onChange={e => setForm({...form, lead_to_appointment_rate: Number(e.target.value)})} />
              </div>
              <div>
                <Label className="text-xs">Consulta→Comparec.</Label>
                <Input type="number" step="0.01" min="0" max="1" value={form.appointment_to_show_rate || ''} onChange={e => setForm({...form, appointment_to_show_rate: Number(e.target.value)})} />
              </div>
              <div>
                <Label className="text-xs">Comparec.→Venda</Label>
                <Input type="number" step="0.01" min="0" max="1" value={form.show_to_sale_rate || ''} onChange={e => setForm({...form, show_to_sale_rate: Number(e.target.value)})} />
              </div>
            </div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CPL Padrão (R$)</h4>
            <div className="grid grid-cols-2 gap-3">
              {[{key:'meta',label:'Meta'},{key:'google',label:'Google'},{key:'tiktok',label:'TikTok'},{key:'youtube',label:'YouTube'},{key:'other',label:'Outro'}].map(ch => (
                <div key={ch.key}>
                  <Label className="text-xs">{ch.label}</Label>
                  <Input type="number" value={form[`${ch.key}_default_cpl`] || ''} onChange={e => setForm({...form, [`${ch.key}_default_cpl`]: Number(e.target.value)})} />
                </div>
              ))}
            </div>
            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700" disabled={updateMut.isPending}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}