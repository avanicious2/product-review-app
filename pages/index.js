import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import Image from 'next/image';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewCounter, setReviewCounter] = useState(0);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: userData, error: userError } = await supabase
        .from('user_identities')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (userError || !userData) {
        setError('Invalid email or password');
        return;
      }

      setIsAuthenticated(true);
      fetchNextProduct();
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextProduct = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: userReviews, error: reviewError } = await supabase
        .from('reviews')
        .select('scrape_id')
        .eq('reviewer_email', email);

      if (reviewError) throw reviewError;

      const reviewedIds = userReviews?.map((r) => r.scrape_id).join(',') || '0';

      const { data: product, error: productError } = await supabase
        .from('input_products')
        .select('*')
        .lt('review_count', 5)
        .not('scrape_id', 'in', `(${reviewedIds})`)
        .limit(1)
        .single();

      if (productError && productError.code !== 'PGRST116') {
        throw productError;
      }

      setCurrentProduct(product || null);
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load next product');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (score) => {
    if (!currentProduct || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('reviews')
        .insert([
          {
            scrape_id: currentProduct.scrape_id,
            review_score: score,
            reviewer_email: email
          }
        ])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      // Update review count in input_products table
      const { error: updateError } = await supabase
        .from('input_products')
        .update({ review_count: currentProduct.review_count + 1 })
        .eq('scrape_id', currentProduct.scrape_id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Increment local review counter
      setReviewCounter(reviewCounter + 1);

      await fetchNextProduct();
    } catch (error) {
      console.error('Error submitting review:', error);
      setError('Failed to submit review: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Product Review App</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-4">Login to Review Products</h1>
            <form onSubmit={handleAuth}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full p-2 border rounded mb-4"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full p-2 border rounded mb-4"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-blue-300"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        ) : loading ? (
          <div className="text-center">Loading...</div>
        ) : !currentProduct ? (
          <div className="text-center">
            <h2 className="text-xl font-bold">No more products to review!</h2>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-500 text-white p-2 rounded"
            >
              Start New Session
            </button>
          </div>
        ) : (
          <div className="max-w-sm mx-auto bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            {/* Image container with a fixed height of 75% viewport height */}
            <div className="relative w-full" style={{ height: '75vh' }}>
              <Image
                src={currentProduct.product_primary_image_url}
                alt={currentProduct.product_name}
                fill
                style={{ objectFit: 'contain', pointerEvents: 'none' }}
              />
            </div>

            {/* Info Section */}
            <div className="p-4">
              <div className="text-sm text-gray-500 mb-2">
                products reviewed: {reviewCounter}
              </div>
              <div className="text-lg font-medium text-gray-800">
                {currentProduct.brand_name} | {currentProduct.product_name}
              </div>
              <div className="font-bold text-xl mt-2">₹{currentProduct.selling_price}</div>

              {/* Buttons at the bottom: Dislike on left (red), Like on right (green) */}
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => submitReview(0)}
                  disabled={submitting}
                  className="px-6 py-2 bg-red-500 text-white rounded-full disabled:bg-red-300"
                >
                  👎 {submitting ? '...' : 'Dislike'}
                </button>
                <button
                  onClick={() => submitReview(1)}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-500 text-white rounded-full disabled:bg-green-300"
                >
                  👍 {submitting ? '...' : 'Like'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
