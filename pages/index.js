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

  // Rest of the handlers remain the same...
  const handleAuth = async (e) => {
    // ... same code as before
  };

  const fetchNextProduct = async () => {
    // ... same code as before
  };

  const submitReview = async (score) => {
    // ... same code as before
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Product Review App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Authentication form and error message sections remain the same */}
        {!isAuthenticated ? (
          // ... same login form as before
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
              {/* Rest of the UI remains the same */}
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
