// pages/index.js
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import Image from 'next/image';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text
} from '@chakra-ui/react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [reviewCounter, setReviewCounter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    } catch (err) {
      console.error('Authentication error:', err);
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

      const reviewedIds = userReviews?.map(r => r.scrape_id).join(',') || '0';

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
    } catch (err) {
      console.error('Error fetching product:', err);
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
      const { error: insertError } = await supabase
        .from('reviews')
        .insert([
          { scrape_id: currentProduct.scrape_id, review_score: score, reviewer_email: email }
        ])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      const { error: updateError } = await supabase
        .from('input_products')
        .update({ review_count: currentProduct.review_count + 1 })
        .eq('scrape_id', currentProduct.scrape_id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      setReviewCounter(prev => prev + 1);
      await fetchNextProduct();
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.100" p={4}>
      <Head>
        <title>Product Review App</title>
      </Head>

      {error && (
        <Box maxW="md" mx="auto" mt={4} p={4} bg="red.100" color="red.700" borderRadius="md">
          {error}
        </Box>
      )}

      {!isAuthenticated ? (
        <Box maxW="md" mx="auto" bg="white" p={6} borderRadius="lg" boxShadow="lg" mt={10}>
          <Text fontSize="2xl" fontWeight="bold" mb={4}>Login to Review Products</Text>
          <form onSubmit={handleAuth}>
            <Box mb={4}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                required
              />
            </Box>
            <Box mb={4}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                required
              />
            </Box>
            <Button type="submit" isDisabled={loading} w="full" colorScheme="blue">
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Box>
      ) : loading ? (
        <VStack justify="center" align="center" h="100vh">
          <Text>Loading...</Text>
        </VStack>
      ) : !currentProduct ? (
        <VStack justify="center" align="center" h="100vh">
          <Text fontSize="xl" fontWeight="bold">No more products to review!</Text>
          <Button mt={4} colorScheme="blue" onClick={() => window.location.reload()}>
            Start New Session
          </Button>
        </VStack>
      ) : (
        <Box maxW="sm" mx="auto" bg="white" borderRadius="lg" boxShadow="lg" overflow="hidden" display="flex" flexDirection="column" height="100vh">
          {/* Image Section (top 65%) */}
          <Box flex="0 0 65%" position="relative">
            <Image
              src={currentProduct.product_primary_image_url}
              alt={currentProduct.product_name}
              fill
              style={{ objectFit: 'contain', pointerEvents: 'none' }}
            />
          </Box>

          {/* Info Section (middle 15%) */}
          <Box flex="0 0 15%" p={4}>
            <Text fontSize="sm" color="gray.500" mb={1}>products reviewed: {reviewCounter}</Text>
            <Text fontSize="lg" fontWeight="medium" color="gray.800">
              {currentProduct.brand_name} | {currentProduct.product_name}
            </Text>
            <Text fontSize="xl" fontWeight="bold" mt={1}>₹{currentProduct.selling_price}</Text>
          </Box>

          {/* Buttons Section (bottom 20%) */}
          <HStack flex="0 0 20%" p={4} justify="space-between" align="center">
            <Button
              onClick={() => submitReview(0)}
              isDisabled={submitting}
              colorScheme="red"
              size="lg"
              borderRadius="full"
              fontWeight="bold"
              px={8} py={6}
              fontSize="xl"
            >
              👎 {submitting ? '...' : 'Dislike'}
            </Button>
            <Button
              onClick={() => submitReview(1)}
              isDisabled={submitting}
              colorScheme="green"
              size="lg"
              borderRadius="full"
              fontWeight="bold"
              px={8} py={6}
              fontSize="xl"
            >
              👍 {submitting ? '...' : 'Like'}
            </Button>
          </HStack>
        </Box>
      )}
    </Box>
  );
}
