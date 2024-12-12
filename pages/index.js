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
  Text,
  Container
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
    <Box 
      minH="100dvh" 
      bg="gray.100" 
      position="relative"
      pb="env(safe-area-inset-bottom)"
    >
      <Head>
        <title>Product Review App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {error && (
        <Box maxW="md" mx="auto" mt={4} p={4} bg="red.100" color="red.700" borderRadius="md">
          {error}
        </Box>
      )}

      {!isAuthenticated ? (
        <Container maxW="md" py={10}>
          <Box bg="white" p={6} borderRadius="lg" boxShadow="lg">
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
        </Container>
      ) : loading ? (
        <VStack justify="center" align="center" h="100dvh">
          <Text>Loading...</Text>
        </VStack>
      ) : !currentProduct ? (
        <VStack justify="center" align="center" h="100dvh">
          <Text fontSize="xl" fontWeight="bold">No more products to review!</Text>
          <Button mt={4} colorScheme="blue" onClick={() => window.location.reload()}>
            Start New Session
          </Button>
        </VStack>
      ) : (
        <Box 
          maxW="sm" 
          mx="auto" 
          h="100dvh"
          display="flex"
          flexDirection="column"
          position="relative"
        >
          {/* Content Container */}
          <Box 
            flex="1"
            overflow="auto"
            bg="white"
            borderRadius="lg"
            boxShadow="lg"
          >
            {/* Image Section */}
            <Box position="relative" pt="100%">
              <Image
                src={currentProduct.product_primary_image_url}
                alt={currentProduct.product_name}
                fill
                style={{ objectFit: 'contain', pointerEvents: 'none' }}
              />
            </Box>

            {/* Info Section */}
            <Box p={4}>
              <Text fontSize="sm" color="gray.500" mb={1}>products reviewed: {reviewCounter}</Text>
              <Text fontSize="lg" fontWeight="medium" color="gray.800">
                {currentProduct.brand_name} | {currentProduct.product_name}
              </Text>
              <Text fontSize="xl" fontWeight="bold" mt={1}>₹{currentProduct.selling_price}</Text>
            </Box>
          </Box>

          {/* Fixed Button Section */}
          <Box
            position="sticky"
            bottom={0}
            left={0}
            right={0}
            bg="white"
            borderTopWidth={1}
            borderColor="gray.200"
            p={4}
            pb="env(safe-area-inset-bottom)"
          >
            <HStack justify="space-between" align="center">
              <Button
                onClick={() => submitReview(0)}
                isDisabled={submitting}
                colorScheme="red"
                size="lg"
                borderRadius="full"
                flex={1}
                py={6}
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
                flex={1}
                py={6}
                fontSize="xl"
              >
                👍 {submitting ? '...' : 'Like'}
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}