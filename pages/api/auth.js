// pages/api/auth.js
import db from '../../lib/db';

export default async function handler(req, res) {
  console.log('Auth API called with method:', req.method);
  console.log('Request body:', req.body);
  
  if (req.method !== 'POST') {
    console.log('Invalid method attempted:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;
  console.log('Login attempt for email:', email);

  try {
    const query = 'SELECT * FROM user_identities WHERE email = ? AND password = ?';
    console.log('Auth query:', query);
    console.log('Query parameters:', [email, password]);

    const results = await db.query(query, [email, password]);
    console.log('Query results:', results);
    
    if (!results || results.length === 0) {
      console.log('Authentication failed - Invalid credentials for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Authentication successful for user:', results[0]);
    await db.end();
    return res.status(200).json(results[0]);
  } catch (error) {
    console.error('Auth error:', error);
    console.error('Error stack:', error.stack);
    await db.end();
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
