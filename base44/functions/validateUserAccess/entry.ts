import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ authorized_client_ids: [], is_admin: false }, { status: 401 });
    }

    // Se é admin, retorna todos os clientes
    if (user.role === 'admin') {
      const allClients = await base44.asServiceRole.entities.Client.list();
      return Response.json({
        authorized_client_ids: allClients.map(c => c.id),
        is_admin: true,
        user_id: user.id,
        user_email: user.email
      });
    }

    // Para usuário secundário, retorna apenas os units dele
    const clientIds = Array.isArray(user.units) ? user.units : [];
    
    return Response.json({
      authorized_client_ids: clientIds,
      is_admin: false,
      user_id: user.id,
      user_email: user.email
    });
  } catch (error) {
    console.error('[validateUserAccess]', error.message);
    return Response.json({
      authorized_client_ids: [],
      is_admin: false,
      error: error.message
    }, { status: 500 });
  }
});