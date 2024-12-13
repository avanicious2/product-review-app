// pages/api/submit-review.js
import db from '../../lib/db';

export default async function handler(req, res) {
  // Add detailed request logging
  console.log('Submit review API called');
  console.log('Request method:', req.method);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scrape_id, review_score, reviewer_email } = req.body;

  // Validate input data
  console.log('Received data:', { scrape_id, review_score, reviewer_email });
  
  if (!scrape_id || review_score === undefined || !reviewer_email) {
    console.log('Missing required fields:', { scrape_id, review_score, reviewer_email });
    return res.status(400).json({ 
      error: 'Missing required fields',
      received: { scrape_id, review_score, reviewer_email }
    });
  }

  try {
    console.log('Attempting database query...');
    
    // First check if review already exists
    const existingReview = await db.query(
      'SELECT * FROM reviews WHERE scrape_id = ? AND reviewer_email = ?',
      [scrape_id, reviewer_email]
    );

    console.log('Existing review check:', existingReview);

    if (existingReview && existingReview.length > 0) {
      console.log('Review already exists');
      await db.end();
      return res.status(400).json({ error: 'Review already exists for this product' });
    }

    // Insert new review
    const result = await db.query(
      'INSERT INTO reviews (scrape_id, review_score, reviewer_email) VALUES (?, ?, ?)',
      [scrape_id, review_score, reviewer_email]
    );
    
    console.log('Insert result:', result);
    
    await db.end();
    
    return res.status(200).json({ 
      message: 'Review submitted successfully',
      result: result 
    });
  } catch (error) {
    console.error('Database error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    await db.end();
    
    return res.status(500).json({ 
      error: 'Failed to submit review',
      details: error.message,
      code: error.code
    });
  }
}