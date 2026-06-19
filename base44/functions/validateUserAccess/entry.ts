import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Checka se o usuário está inativo - nega acesso completamente
    if (user.status === 'inativo') {
      return Response.json({
        authorized_client_ids: [],
        is_admin: false,
        access_denied: true,
        reason: 'Usuário inativo'
      });
    }

    // Admin vê todos os clientes
    if (user.role === 'admin') {
      const allClients = await base44.asServiceRole.entities.Client.list();
      return Response.json({
        authorized_client_ids: allClients.map(c => c.id),
        is_admin: true
      });
    }

    // Usuário secundário: verifica se ele está ativo E se seu profile está ativo
    let profileIsActive = true;
    if (user.profile_id) {
      const profile = await base44.asServiceRole.entities.Profile.get(user.profile_id);
      profileIsActive = profile?.status === 'ativo';
    }

    // Se o profile está inativo, nega acesso
    if (!profileIsActive) {
      return Response.json({
        authorized_client_ids: [],
        is_admin: false,
        access_denied: true,
        reason: 'Perfil inativo'
      });
    }

    // Usuário secundário vê apenas seus clientes (units)
    const authorizedIds = user.units && Array.isArray(user.units) ? user.units : [];
    
    return Response.json({
      authorized_client_ids: authorizedIds,
      is_admin: false
    });
  } catch (error) {
    console.error('[validateUserAccess] Error:', error);
    return Response.json({
      error: error.message || 'Erro ao validar acesso',
      authorized_client_ids: [],
      access_denied: true
    }, { status: 500 });
  }
});