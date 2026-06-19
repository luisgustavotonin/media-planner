import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await req.json();
    
    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Delete all UserClient records for this user
    const userClients = await base44.asServiceRole.entities.UserClient.filter({ user_id: userId });
    for (const uc of userClients) {
      await base44.asServiceRole.entities.UserClient.delete(uc.id);
    }

    return Response.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});