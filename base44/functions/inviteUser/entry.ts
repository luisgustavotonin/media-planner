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

    console.log(`[inviteUser] Profile level: ${profile.level}`);

    // Verifica se o usuário já existe
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers?.length > 0) {
      return Response.json({ error: 'Usuário com este email já existe' }, { status: 400 });
    }

    // 1. Envia convite por email através do SDK (role deve ser 'user')
    console.log(`[inviteUser] Sending email invite for: ${email}, profile: ${profile.name}`);
    await base44.users.inviteUser(email, 'user');
    console.log(`[inviteUser] Email invite sent`);

    // 2. Cria o usuário direto no banco com status inativo e perfil
    // Para consultants/admins, usa um cliente padrão (obrigatório)
    let clientId = '';
    const clients = await base44.asServiceRole.entities.Client.list();
    if (clients?.length > 0) {
      clientId = clients[0].id;
    }
    
    const newUser = await base44.asServiceRole.entities.User.create({
      email,
      full_name: full_name || email,
      profile_id,
      status: 'inativo',
      assigned_client_id: clientId
    });
    
    console.log(`[inviteUser] User created in DB: ${newUser.id} with status=inativo and profile=${profile.name}`);

    return Response.json({ 
      success: true,
      message: 'Convite enviado com sucesso',
      email,
      userId: newUser.id,
      user: newUser
    });
  } catch (error) {
    console.error('[inviteUser] Fatal error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao enviar convite',
      details: error.stack
    }, { status: 500 });
  }
});