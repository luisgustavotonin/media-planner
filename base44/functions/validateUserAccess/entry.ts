import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin vê todos os clientes
    if (user.role === 'admin') {
      const allClients = await base44.asServiceRole.entities.Client.list();
      return Response.json({
        authorized_client_ids: allClients.map(c => c.id),
        is_admin: true,
        user_status: user.status,
        user_units: user.units || []
      });
    }

    // Usuário secundário: retorna os clientes que ele tem acesso (units)
    const authorizedIds = user.units && Array.isArray(user.units) ? user.units : [];
    
    return Response.json({
      authorized_client_ids: authorizedIds,
      is_admin: false,
      user_status: user.status,
      user_units: user.units || []
    });
  } catch (error) {
    console.error('[validateUserAccess] Error:', error);
    return Response.json({
      error: error.message || 'Erro ao validar acesso',
      authorized_client_ids: [],
      is_admin: false,
      user_status: null,
      user_units: []
    }, { status: 500 });
  }
});