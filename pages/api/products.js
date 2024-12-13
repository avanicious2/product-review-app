// pages/api/products.js
import db from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // First get user's batch number
    const [userData] = await db.query(
      'SELECT batch_number FROM user_identities WHERE email = ?',
      [email]
    );

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Then get unreviewed products from that batch
    const products = await db.query(`
      SELECT i.* 
      FROM input_products i
      LEFT JOIN reviews r ON r.scrape_id = i.scrape_id
      WHERE i.assigned_batch = ? 
      AND r.review_score IS NULL
      ORDER BY i.scrape_id
      LIMIT 2
    `, [userData.batch_number]);

    await db.end();
    
    return res.status(200).json(products);
  } catch (error) {
    console.error('Products fetch error:', error);
    return res.status(500).json({ error: 'Failed to load products' });
  }
}