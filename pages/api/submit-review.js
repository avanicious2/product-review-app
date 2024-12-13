// pages/api/submit-review.js
import db from '../../lib/db';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  console.log('Submit review API called');
  console.log('Request method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scrape_id, review_score, reviewer_email } = req.body;

  console.log('Request body:', { scrape_id, review_score, reviewer_email });

  // Validate input data
  if (!scrape_id || review_score === undefined || !reviewer_email) {
    console.error('Missing required fields:', { scrape_id, review_score, reviewer_email });
    return res.status(400).json({
      error: 'Missing required fields',
      received: { scrape_id, review_score, reviewer_email },
    });
  }

  try {
    // Check if the review already exists
    const checkExistingReview = await db.query(
      `SELECT 1 FROM reviews WHERE scrape_id = ? AND reviewer_email = ?`,
      [scrape_id, reviewer_email]
    );

    console.log('Check for existing review:', checkExistingReview);

    if (checkExistingReview.length > 0) {
      console.warn('Review already exists for this product and user:', { scrape_id, reviewer_email });
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    // Generate UUID for the new review
    const reviewId = randomUUID();
    console.log('Generated UUID for review:', reviewId);

    // Insert new review
    const result = await db.query(
      `INSERT INTO reviews 
       (id, scrape_id, review_score, reviewer_email, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [reviewId, scrape_id, review_score, reviewer_email]
    );

    console.log('Review successfully inserted:', result);

    return res.status(200).json({
      message: 'Review submitted successfully',
      result,
    });
  } catch (error) {
    console.error('Database error during review submission:', {
      message: error.message,
      code: error.code,
    });

    return res.status(500).json({
      error: 'Failed to submit review',
      details: error.message,
    });
  } finally {
    await db.end();
  }
}
