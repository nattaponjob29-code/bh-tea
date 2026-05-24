import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });

  const { userId, password } = req.body;
  if (!userId || !password) return res.status(400).json({ error: 'userId and password required' });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
