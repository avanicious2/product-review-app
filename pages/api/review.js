// pages/api/submit-review.js
import db from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { scrape_id, review_score, reviewer_email } = req.body;

  if (!scrape_id || review_score === undefined || !reviewer_email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await db.query(
      'INSERT INTO reviews (scrape_id, review_score, reviewer_email) VALUES (?, ?, ?)',
      [scrape_id, review_score, reviewer_email]
    );
    
    await db.end();
    
    return res.status(200).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error('Review submission error:', error);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
}