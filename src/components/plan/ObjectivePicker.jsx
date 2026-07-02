import React from 'react';
import {
  Megaphone, MousePointerClick, MessageCircle, Filter, Smartphone,
  ShoppingCart, Target, Users, TrendingUp, Eye, MapPin, Heart, Zap
} from 'lucide-react';

// Mapeia nome do objetivo → ícone (match case-insensitive por palavra-chave)
function getObjectiveIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('reconh') || n.includes('aware') || n.includes('brand')) return Megaphone;
  if (n.includes('tráfego') || n.includes('trafego') || n.includes('traffic')) return MousePointerClick;
  if (n.includes('engaj')) return Heart;
  if (n.includes('lead')) return Filter;
  if (n.includes('app') || n.includes('promo')) return Smartphone;
  if (n.includes('venda') || n.includes('sale') || n.includes('conversion')) return ShoppingCart;
  if (n.includes('visita') || n.includes('visit')) return MapPin;
  if (n.includes('tráf')) return MousePointerClick;
  return Target;
}

export default function ObjectivePicker({ objectives, value, onChange, readOnly }) {
  if (readOnly) {
    return (
      <span className="text-[10px] font-medium px-2 py-1 rounded-full border bg-secondary/60 text-secondary-foreground border-border whitespace-nowrap">
        {value || '—'}
      </span>
    );
  }

  const brandingObjs = objectives.filter(o => o.type === 'branding');
  const performanceObjs = objectives.filter(o => (o.type || 'performance') === 'performance');

  const renderItem = (obj) => {
    const Icon = getObjectiveIcon(obj.name);
    const isSelected = value === obj.name;
    return (
      <button
        key={obj.id}
        type="button"
        onClick={() => onChange(obj.name)}
        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all text-left ${
          isSelected
            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        {/* Radio */}
        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
          isSelected ? 'border-primary' : 'border-gray-300'
        }`}>
          {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        {/* Icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isSelected ? 'bg-primary/10' : 'bg-gray-100'
        }`}>
          <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-gray-600'}`} />
        </div>
        {/* Label */}
        <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
          {obj.name}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {performanceObjs.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Performance</span>
            <span className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">— funil de vendas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {performanceObjs.map(renderItem)}
          </div>
        </div>
      )}
      {brandingObjs.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <Megaphone className="w-3 h-3 text-secondary-foreground" />
            <span className="text-[11px] font-bold text-secondary-foreground uppercase tracking-wider">Branding</span>
            <span className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">— awareness / alcance</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {brandingObjs.map(renderItem)}
          </div>
        </div>
      )}
    </div>
  );
}