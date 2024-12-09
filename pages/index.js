// pages/index.js
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';

// Initialize Supabase client - replace with your project URL and anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [name, setName] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch next unreviewed product
  const fetchNextProduct = async () => {
    setLoading(true);
    try {
      // Get all reviewed scrape_ids by this user
      const { data: reviewedProducts } = await supabase
        .from('reviews')
        .select('scrape_id')
        .eq('reviewer_name', name);

      const reviewedIds = reviewedProducts?.map(r => r.scrape_id) || [];

      // Fetch a product that hasn't been reviewed
      const { data: products } = await supabase
        .from('input_products')
        .select('*')
        .not('scrape_id', 'in', `(${reviewedIds.join(',')})`)
        .limit(1);

      if (products && products.length > 0) {
        setCurrentProduct(products[0]);
      } else {
        setCurrentProduct(null); // No more products to review
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
    setLoading(false);
  };

  // Submit review
  const submitReview = async (score) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          scrape_id: currentProduct.scrape_id,
          review_score: score,
          reviewer_name: name
        });

      if (error) throw error;
      fetchNextProduct();
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  // Handle name submission
  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      setIsNameSubmitted(true);
      fetchNextProduct();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Product Review App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {!isNameSubmitted ? (
          // Name input form
          <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-4">Welcome to Product Review</h1>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full p-2 border rounded mb-4"
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Start Reviewing
              </button>
            </form>
          </div>
        ) : loading ? (
          // Loading state
          <div className="text-center">Loading...</div>
        ) : !currentProduct ? (
          // No more products to review
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
          // Product review card
          <div className="max-w-xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">{currentProduct.brand_name}</h2>
              <p className="text-gray-600 mb-4">{currentProduct.product_name}</p>
              <div className="relative pt-[100%] mb-4">
                <img
                  src={currentProduct.product_primary_image_url}
                  alt={currentProduct.product_name}
                  className="absolute top-0 left-0 w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                  }}
                />
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
