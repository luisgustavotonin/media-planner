import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        authorized_client_ids: [], 
        is_admin: false,
        is_inactive: false 
      }, { status: 401 });
    }

    // Se usuário está inativo, nega acesso imediatamente
    if (user.status === 'inativo') {
      return Response.json({ 
        authorized_client_ids: [], 
        is_admin: false,
        is_inactive: true,
        message: 'Usuário inativo não tem permissão de acesso'
      }, { status: 403 });
    }

    // Se é admin, retorna todos os clientes
    if (user.role === 'admin') {
      const allClients = await base44.asServiceRole.entities.Client.list();
      return Response.json({
        authorized_client_ids: allClients.map(c => c.id),
        is_admin: true,
        is_inactive: false,
        user_id: user.id,
        user_email: user.email
      });
    }

    // Para usuário secundário, retorna apenas os units dele
    const clientIds = Array.isArray(user.units) ? user.units : [];
    
    console.log(`[validateUserAccess] User ${user.email} - units: ${JSON.stringify(clientIds)}`);
    
    return Response.json({
      authorized_client_ids: clientIds,
      is_admin: false,
      is_inactive: false,
      user_id: user.id,
      user_email: user.email,
      debug_units: user.units
    });
  } catch (error) {
    console.error('[validateUserAccess]', error.message);
    return Response.json({
      authorized_client_ids: [],
      is_admin: false,
      is_inactive: false,
      error: error.message
    }, { status: 500 });
  }
});