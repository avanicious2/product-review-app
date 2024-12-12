// pages/index.js
import { useState } from 'react';
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

  // Authentication handler
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if user exists in user_identities
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
      setError('An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextProduct = async () => {
  console.log("Fetching next product...");
  setLoading(true);
  try {
    // Get products already reviewed by current user
    const { data: userReviews, error: reviewError } = await supabase
      .from('reviews')
      .select('scrape_id')
      .eq('reviewer_email', email);

    if (reviewError) throw reviewError;

    // Get excluded product IDs or use 0 if none
    const reviewedIds = userReviews?.map(r => r.scrape_id).join(',') || '0';

    // Get one product that:
    // 1. Has less than 5 reviews
    // 2. Hasn't been reviewed by current user
    const { data: product, error: productError } = await supabase
      .from('input_products')
      .select('*')
      .lt('review_count', 5)
      .not('scrape_id', 'in', `(${reviewedIds})`)
      .limit(1)
      .single();

    if (productError && productError.code !== 'PGRST116') { // Ignore "no rows returned" error
      throw productError;
    }

    setCurrentProduct(product || null);
  } catch (error) {
    console.error('Error fetching product:', error);
    setError('Error loading next product');
  } finally {
    setLoading(false);
  }
};

  // Submit review
  const submitReview = async (score) => {
  console.log("Submitting review:", { score, product: currentProduct });
  try {
    // Check current review count before submitting
    const { data: product, error: checkError } = await supabase
      .from('input_products')
      .select('review_count')
      .eq('scrape_id', currentProduct.scrape_id)
      .single();

    if (checkError) throw checkError;

    if (product.review_count >= 5) {
      setError('This product has already reached maximum reviews');
      fetchNextProduct();
      return;
    }

    const { error } = await supabase
      .from('reviews')
      .insert({
        scrape_id: currentProduct.scrape_id,
        review_score: score,
        reviewer_email: email
      });

    if (error) throw error;
    
    console.log("Review submitted successfully");
    fetchNextProduct();
  } catch (error) {
    console.error('Error submitting review:', error);
    setError('Error submitting review');
  }
};

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Product Review App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? 'Loading...' : 'Login'}
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
              className="mt-4 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Start New Session
            </button>
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{currentProduct.brand_name}</h2>
                <button
                  onClick={() => setIsAuthenticated(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
              <p className="text-gray-600 mb-4">{currentProduct.product_name}</p>
              <div className="relative pt-[100%] mb-4">
                <div className="absolute top-0 left-0 w-full h-full">
                  <Image
                    src={currentProduct.product_primary_image_url}
                    alt={currentProduct.product_name}
                    fill
                    style={{ objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">₹{currentProduct.selling_price}</span>
                <span className="text-sm text-gray-500">{currentProduct.price_category}</span>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => submitReview(0)}
                  className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  👎 Dislike
                </button>
                <button
                  onClick={() => submitReview(1)}
                  className="px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600"
                >
                  👍 Like
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
