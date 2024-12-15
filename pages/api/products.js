// pages/api/products.js
import db from '../../lib/db';

export default async function handler(req, res) {
  console.log('Products API called');
  console.log('Request method:', req.method);

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    console.error('Email is required to fetch products');
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    console.log('Fetching batch number for user with email:', email);

    // Get user's batch number
    const [userData] = await db.query(
      'SELECT batch_number FROM user_identities WHERE email = ?',
      [email]
    );

    console.log('Fetched user data:', userData);

    if (!userData) {
      console.warn('No user found with the given email:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Fetching unreviewed products for batch number:', userData.batch_number);

    // Get unreviewed products for the user's batch
    const products = await db.query(
      `SELECT i.* 
       FROM input_products i
       LEFT JOIN reviews r ON r.scrape_id = i.scrape_id AND r.reviewer_email = ?
       WHERE i.assigned_batch = ?
       AND (r.review_score IS NULL)  -- Only unreviewed products
       ORDER BY i.scrape_id
       LIMIT 300`,
      [email, userData.batch_number]
    );

    console.log('Fetched products:', products);

    if (products.length === 0) {
      console.warn('No unreviewed products found for the user in this batch');
    }

    return res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', {
      message: error.message,
      code: error.code,
    });

    return res.status(500).json({ error: 'Failed to load products' });
  } finally {
    await db.end();
  }
}
