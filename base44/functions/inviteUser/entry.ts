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

    // Determina role baseado no profile
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

    // Envia convite para o usuário
    console.log(`Inviting user: ${email} with role: ${role}`);
    await base44.asServiceRole.users.inviteUser(email, role);
    
    // Aguarda a criação do usuário no sistema (máx 3 segundos)
    let newUser = null;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 500));
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users?.length > 0) {
        newUser = users[0];
        console.log(`Found new user: ${newUser.id}`);
        break;
      }
    }

    // Se encontrou o usuário, atualiza com profile e full_name
    if (newUser) {
      const updateData = { profile_id };
      if (full_name) updateData.full_name = full_name;
      
      await base44.asServiceRole.entities.User.update(newUser.id, updateData);
      console.log(`Updated user ${newUser.id} with profile and full_name`);
    } else {
      console.warn(`User creation took too long, convite sent but profile may need manual assignment`);
    }

    return Response.json({ 
      success: true, 
      message: 'Convite enviado com sucesso' 
    });
  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao enviar convite' 
    }, { status: 500 });
  }
});