// pages/api/auth.js
import db from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    const results = await db.query(
      'SELECT * FROM user_identities WHERE email = ? AND password = ?',
      [email, password]
    );
    
    await db.end();

    if (!results || results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(200).json(results[0]);
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}