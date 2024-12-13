// pages/api/submit-review.js
import db from '../../lib/db';

export default async function handler(req, res) {
  console.log('Submit review API called');
  console.log('Request method:', req.method);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scrape_id, review_score, reviewer_email } = req.body;

  // Validate input data
  if (!scrape_id || review_score === undefined || !reviewer_email) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      received: { scrape_id, review_score, reviewer_email }
    });
  }

  try {
    // Insert new review without specifying id (it will auto-increment)
    const result = await db.query(
      `INSERT INTO reviews 
       (scrape_id, review_score, reviewer_email, created_at) 
       VALUES (?, ?, ?, NOW())`,
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
      code: error.code
    });

    // Handle duplicate review error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        error: 'You have already reviewed this product'
      });
    }

    return res.status(500).json({ 
      error: 'Failed to submit review',
      details: error.message
    });
  } finally {
    await db.end();
  }
}