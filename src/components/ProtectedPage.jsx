import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/hooks/useAuth';
import { usePermissions } from '@/components/hooks/usePermissions';
import { base44 } from '@/api/base44Client';

export function withProtectedPage(Component, requiredPermission) {
  return function ProtectedComponent(props) {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const perms = usePermissions(user, profile);

    useEffect(() => {
      if (authLoading) return;

      if (!user) {
        navigate('/');
        return;
      }

      if (user.role === 'admin') {
        setProfile({ permissions: {} });
        setLoading(false);
        return;
      }

      if (user.profile_id) {
        base44.entities.Profile.list().then(profiles => {
          const p = profiles.find(pr => pr.id === user.profile_id);
          setProfile(p);
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }, [user, authLoading, navigate]);

    if (authLoading || loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (requiredPermission && !perms[requiredPermission]) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
            <p className="text-gray-500">Você não tem permissão para acessar esta página.</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}