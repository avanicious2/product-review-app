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
  const [submitting, setSubmitting] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    console.log('Login attempt started');
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
        console.log('Login failed:', userError);
        setError('Invalid email or password');
        return;
      }

      console.log('Login successful');
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
    console.log('Fetching next product');
    setLoading(true);
    setError('');
    
    try {
      const { data: userReviews, error: reviewError } = await supabase
        .from('reviews')
        .select('scrape_id')
        .eq('reviewer_email', email);

      if (reviewError) {
        console.error('Error fetching user reviews:', reviewError);
        throw reviewError;
      }

      const reviewedIds = userReviews?.map(r => r.scrape_id).join(',') || '0';
      console.log('Fetching product not in reviewed IDs:', reviewedIds);

      const { data: product, error: productError } = await supabase
        .from('input_products')
        .select('*')
        .lt('review_count', 5)
        .not('scrape_id', 'in', `(${reviewedIds})`)
        .limit(1)
        .single();

      if (productError && productError.code !== 'PGRST116') {
        console.error('Error fetching product:', productError);
        throw productError;
      }

      console.log('Next product fetched:', product);
      setCurrentProduct(product || null);
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load next product');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Logout clicked');
    setIsAuthenticated(false);
    setCurrentProduct(null);
    setEmail('');
    setPassword('');
  };

  const handleReview = async (score, e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Review clicked with score:', score);
    
    if (!currentProduct || submitting) {
      console.log('Preventing submission:', { currentProduct: !!currentProduct, submitting });
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      console.log('Submitting review:', {
        scrape_id: currentProduct.scrape_id,
        score,
        email
      });

      const { data, error: insertError } = await supabase
        .from('reviews')
        .insert([{
          scrape_id: currentProduct.scrape_id,
          review_score: score,
          reviewer_email: email
        }])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Review submitted successfully:', data);
      
      const { error: updateError } = await supabase
        .from('input_products')
        .update({ review_count: currentProduct.review_count + 1 })
        .eq('scrape_id', currentProduct.scrape_id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Product review count updated, fetching next product');
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
          // ... keep login form the same ...
        ) : loading ? (
          <div className="text-center">Loading...</div>
        ) : !currentProduct ? (
          // ... keep no products view the same ...
        ) : (
          <div className="max-w-xl mx-auto bg-white rounded-lg shadow-lg">
            <div className="p-4 flex flex-col">
              {/* Header Section */}
              <div className="flex justify-between items-center mb-4 relative z-10">
                <h2 className="text-xl font-bold">{currentProduct.brand_name}</h2>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded"
                >
                  Logout
                </button>
              </div>
              
              <p className="text-gray-600 mb-4 relative z-10">{currentProduct.product_name}</p>

              {/* Image Container with Fixed Height */}
              <div className="w-full h-[400px] relative mb-4">
                <div className="absolute inset-0">
                  <Image
                    src={currentProduct.product_primary_image_url}
                    alt={currentProduct.product_name}
                    fill
                    style={{ objectFit: 'contain' }}
                    className="pointer-events-none"
                    priority
                  />
                </div>
              </div>

              {/* Price Section */}
              <div className="flex justify-between items-center mb-4 relative z-10">
                <span className="text-lg font-semibold">₹{currentProduct.selling_price}</span>
                <span className="text-sm text-gray-500">{currentProduct.price_category}</span>
              </div>

              {/* Review Buttons */}
              <div className="flex justify-center gap-4 relative z-10">
                <button
                  type="button"
                  onClick={(e) => handleReview(0, e)}
                  disabled={submitting}
                  className="px-6 py-2 bg-red-500 text-white rounded-full disabled:bg-red-300 hover:bg-red-600 active:bg-red-700"
                >
                  👎 {submitting ? 'Submitting...' : 'Dislike'}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleReview(1, e)}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-500 text-white rounded-full disabled:bg-green-300 hover:bg-green-600 active:bg-green-700"
                >
                  👍 {submitting ? 'Submitting...' : 'Like'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

