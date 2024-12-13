// pages/index.js
import { useState } from 'react';
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
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setIsAuthenticated(true);
      fetchProducts();
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/products?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load products');
      }

      setProducts(data || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Products fetch error:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (score) => {
    if (submitting) return; // Prevent multiple submissions
    setSubmitting(true);
    setError('');
  
    try {
      const currentProduct = products[currentIndex];
      
      console.log('Submitting review for product:', currentProduct);
  
      // Submit review
      const response = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrape_id: currentProduct.scrape_id,
          review_score: score,
          reviewer_email: email,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }
  
      console.log('Review submitted successfully:', data);
      
      // Increment review counter
      setReviewCounter(prev => prev + 1);
  
      // Move to next product if available
      if (currentIndex < products.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
      // Otherwise session is complete
    } catch (err) {
      console.error('Review submission error:', err);
      setError(err.message || 'Failed to submit review');
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
              <Button 
                type="submit" 
                isLoading={loading}
                loadingText="Logging in..."
                w="full" 
                colorScheme="blue"
              >
                Login
              </Button>
            </form>
          </Box>
        </Container>
      ) : loading ? (
        <VStack justify="center" align="center" h="100dvh">
          <Text>Loading...</Text>
        </VStack>
      ) : !products.length || currentIndex >= products.length ? (
        <VStack justify="center" align="center" h="100dvh">
          <Text fontSize="xl" fontWeight="bold">Session Complete!</Text>
          <Text fontSize="md" mb={2}>You reviewed {reviewCounter} products</Text>
          <Text fontSize="sm">Start new session to review more products</Text>
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
            m={4}
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
              <Text fontSize="sm" color="gray.500" mb={1}>Products reviewed: {reviewCounter}</Text>
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
                isLoading={submitting}
                loadingText="..."
                colorScheme="red"
                size="lg"
                borderRadius="full"
                flex={1}
                py={6}
                fontSize="xl"
              >
                👎 Dislike
              </Button>
              <Button
                onClick={() => submitReview(1)}
                isLoading={submitting}
                loadingText="..."
                colorScheme="green"
                size="lg"
                borderRadius="full"
                flex={1}
                py={6}
                fontSize="xl"
              >
                👍 Like
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}