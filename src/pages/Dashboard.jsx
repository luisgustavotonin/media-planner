import React from 'react';
import { withProtectedPage } from '@/components/ProtectedPage';

function Dashboard() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Bem-vindo ao Media Planner</p>
      </div>
    </div>
  );
}

export default withProtectedPage(Dashboard, 'visualizar_dashboard');