import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, data } = await req.json();
    
    if (!userId || !data) {
      return Response.json({ error: 'userId e data são obrigatórios' }, { status: 400 });
    }

    // Se deleted: true, deleta o usuário
    if (data.deleted === true) {
      await base44.asServiceRole.entities.User.delete(userId);
      return Response.json({ success: true, deleted: true });
    }

    const result = await base44.asServiceRole.entities.User.update(userId, data);
    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('[updateUser] Error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao atualizar usuário'
    }, { status: 500 });
  }
});