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

    const { email, full_name, profile_id } = await req.json();
    
    if (!email || !profile_id) {
      return Response.json({ error: 'Email e profile_id são obrigatórios' }, { status: 400 });
    }

    // Busca o perfil para determinar o role
    const profiles = await base44.asServiceRole.entities.Profile.filter({ id: profile_id });
    const profile = profiles?.[0];
    
    if (!profile) {
      return Response.json({ error: 'Perfil não encontrado' }, { status: 400 });
    }

    let role = 'consultant';
    if (profile.level === 1) role = 'admin';
    else if (profile.level >= 4) role = 'client';

    // Verifica se o usuário já existe
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers?.length > 0) {
      return Response.json({ error: 'Usuário com este email já existe' }, { status: 400 });
    }

    // Envia convite através do SDK
    console.log(`[inviteUser] Inviting: ${email}, role: ${role}, profile: ${profile.name}`);
    await base44.users.inviteUser(email, role);
    console.log(`[inviteUser] Invite sent for ${email}`);

    // Aguarda um pouco para sincronização
    let createdUser = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 300));
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users?.length > 0) {
        createdUser = users[0];
        console.log(`[inviteUser] User found on attempt ${i + 1}: ${createdUser.id}`);
        break;
      }
    }

    // Atualiza o usuário com profile e nome se foi criado
    if (createdUser) {
      try {
        const updateData = { profile_id };
        if (full_name) updateData.full_name = full_name;
        await base44.asServiceRole.entities.User.update(createdUser.id, updateData);
        console.log(`[inviteUser] Updated user ${createdUser.id} with profile and full_name`);
      } catch (updateErr) {
        console.error(`[inviteUser] Error updating user:`, updateErr.message);
      }
    } else {
      console.warn(`[inviteUser] User not found after polling - may need manual profile assignment`);
    }

    return Response.json({ 
      success: true,
      message: 'Convite enviado com sucesso',
      email,
      userId: createdUser?.id
    });
  } catch (error) {
    console.error('[inviteUser] Fatal error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao enviar convite',
      details: error.stack
    }, { status: 500 });
  }
});