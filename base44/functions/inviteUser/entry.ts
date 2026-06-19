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

    const { email, full_name, profile_id, units = [] } = await req.json();
    
    if (!email || !profile_id) {
      return Response.json({ error: 'Email e profile_id são obrigatórios' }, { status: 400 });
    }

    // Verifica se o perfil existe
    const profiles = await base44.asServiceRole.entities.Profile.filter({ id: profile_id });
    const profile = profiles?.[0];
    
    if (!profile) {
      return Response.json({ error: 'Perfil não encontrado' }, { status: 400 });
    }

    // Verifica se o usuário já existe
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers?.length > 0) {
      return Response.json({ error: 'Usuário com este email já existe' }, { status: 400 });
    }

    // Envia convite por email
    await base44.users.inviteUser(email, 'user');

    // Cria o usuário no banco com status inativo, profile_id e units
    const newUser = await base44.asServiceRole.entities.User.create({
      email,
      full_name: full_name || email,
      profile_id,
      units: units && units.length > 0 ? units : [],
      status: 'inativo'
    });
    
    return Response.json({ 
      success: true,
      message: 'Usuário criado e convite enviado com sucesso',
      userId: newUser.id
    });
  } catch (error) {
    console.error('[inviteUser] Error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao criar usuário'
    }, { status: 500 });
  }
});