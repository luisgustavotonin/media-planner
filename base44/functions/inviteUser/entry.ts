import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { email, role, profile_id } = await req.json();
    if (!email || !role) return Response.json({ error: 'Missing email or role' }, { status: 400 });

    await base44.asServiceRole.users.inviteUser(email, role);
    
    // If profile_id provided, we need to wait for user creation and update their profile
    // For now, return success - admin can manually assign profile in UI
    return Response.json({ success: true, message: 'Convite enviado com sucesso' });
  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ error: error.message || 'Erro ao enviar convite' }, { status: 500 });
  }
});