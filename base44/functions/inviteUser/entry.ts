import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { email, full_name, role, profile_id } = await req.json();
    if (!email || !role) return Response.json({ error: 'Email e função são obrigatórios' }, { status: 400 });

    // Convida o usuário com o role especificado
    const inviteResult = await base44.asServiceRole.users.inviteUser(email, role);
    console.log('Invite result:', inviteResult);
    
    // Aguarda um curto tempo para a sincronização do usuário (máx 2s)
    let newUser = null;
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 500));
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users?.length > 0) {
        newUser = users[0];
        break;
      }
    }

    // Se encontrou o usuário e tem profile_id, atualiza o perfil e nome
    if (newUser && profile_id) {
      const updateData = { profile_id };
      if (full_name) updateData.full_name = full_name;
      await base44.asServiceRole.entities.User.update(newUser.id, updateData);
    }

    return Response.json({ success: true, message: 'Convite enviado com sucesso' });
  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ error: error.message || 'Erro ao enviar convite' }, { status: 500 });
  }
});