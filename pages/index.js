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
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      fetchProducts();
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First get the user's batch number
      const { data: userData, error: userError } = await supabase
        .from('user_identities')
        .select('batch_number')
        .eq('email', email)
        .single();
  
      if (userError) throw userError;
  
      // Get products that haven't been reviewed by this user
      const { data: products, error: productError } = await supabase
        .from('input_products')
        .select(`
          *,
          reviews!inner(reviewer_email)
        `)
        .eq('assigned_batch', userData.batch_number)
        .neq('reviews.reviewer_email', email)
        .order('scrape_id')
        .limit(2);
  
      if (productError) throw productError;
      
      setProducts(products || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (score) => {
    if (submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const currentProduct = products[currentIndex];
      
      const { error: insertError } = await supabase
        .from('reviews')
        .insert([
          { scrape_id: currentProduct.scrape_id, review_score: score, reviewer_email: email }
        ]);

      if (insertError) throw insertError;

      setReviewCounter(prev => prev + 1);
      
      // Move to next product or finish
      if (currentIndex < products.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setProducts([]);
        setCurrentIndex(0);
      }
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
      ) : !products.length ? (
        <VStack justify="center" align="center" h="100dvh">
          <Text fontSize="xl" fontWeight="bold">No more products to review!</Text>
          <Text fontSize="sm">Start new session to check for more products</Text>
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
          <Box 
            flex="1"
            overflow="auto"
            bg="white"
            borderRadius="lg"
            boxShadow="lg"
          >
            <Box position="relative" pt="100%">
              <Image
                src={products[currentIndex].product_primary_image_url}
                alt={products[currentIndex].product_name}
                fill
                style={{ objectFit: 'contain', pointerEvents: 'none' }}
              />
            </Box>

            <Box p={4}>
              <Text fontSize="sm" color="gray.500" mb={1}>products reviewed: {reviewCounter}</Text>
              <Text fontSize="lg" fontWeight="medium" color="gray.800">
                {products[currentIndex].brand_name} | {products[currentIndex].product_name}
              </Text>
              <Text fontSize="xl" fontWeight="bold" mt={1}>₹{products[currentIndex].selling_price}</Text>
            </Box>
          </Box>

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