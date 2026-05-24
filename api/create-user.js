import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify caller is authenticated and is Admin
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  const { username, password, role, branchId, areas, label } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'username, password, role required' });

  // Create auth user with @bh.local email convention
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: `${username.trim()}@bh.local`,
    password,
    email_confirm: true,
  });
  if (createErr) return res.status(400).json({ error: createErr.message });

  // Upsert profile
  const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
    id: newUser.user.id,
    username: username.trim(),
    role,
    branch_id: branchId || null,
    areas: areas || [],
    label: label || '',
  });
  if (profileErr) {
    // Clean up orphaned auth user if profile creation failed
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return res.status(500).json({ error: profileErr.message });
  }

  return res.status(200).json({ ok: true, userId: newUser.user.id });
}
