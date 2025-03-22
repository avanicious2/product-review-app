// pages/index.js
import { useState, useEffect } from 'react';
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
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [imageUrlMap, setImageUrlMap] = useState({});

  // Replace the existing fetchImageUrl function with this enhanced version
  const fetchImageUrl = async (product) => {
    console.log('Attempting to fetch image URL for product:', product.scrape_id);
    
    try {
      console.log('Sending request to /api/gen-s3-url with scrape_id:', product.scrape_id);
      
      const response = await fetch('/api/gen-s3-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrape_id: product.scrape_id
        }),
      });

      console.log('Response status from gen-s3-url:', response.status);
      const data = await response.json();
      console.log('Response data from gen-s3-url:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image URL');
      }

      console.log('Successfully generated URL:', data.url);
      setCurrentImageUrl(data.url);
    } catch (err) {
      console.error('Error fetching image URL:', err);
      setError(`Failed to load image URL: ${err.message}`);
      setCurrentImageUrl(''); // Clear URL on error
    }
  };

  const preloadAllImageUrls = async (productsList) => {
  console.log(`Starting to preload image URLs for ${productsList.length} products in a single batch`);
  
  // Creating a map to store scrape_id -> imageUrl
  const urlMap = {};
  let successCount = 0;
  let failCount = 0;
  
  // Process all products at once
  const promises = productsList.map(product => {
    return new Promise(async (resolve) => {
      try {
        const response = await fetch('/api/gen-s3-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scrape_id: product.scrape_id
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          urlMap[product.scrape_id] = data.url;
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Error generating URL for product ${product.scrape_id}:`, err);
        failCount++;
      }
      resolve();
    });
  });
  
  // Wait for all promises to complete
  await Promise.all(promises);
  
  console.log(`URL preloading complete. Success: ${successCount}, Failed: ${failCount}`);
  return urlMap;
};
// Replace the existing fetchProducts function with this enhanced version
  const fetchProducts = async (userEmail) => {
    setLoading(true);
    setError('');

    try {
      console.log('Fetching products for email:', userEmail || email);
      const response = await fetch(`/api/products?email=${encodeURIComponent(userEmail || email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load products');
      }

      console.log(`Fetched ${data.length} products`);
      
      // Save products to localStorage
      localStorage.setItem('products', JSON.stringify(data));
      localStorage.setItem('currentProductIndex', '0');
      
      // Preload all image URLs
      console.log('Starting image URL preloading...');
      const urlMap = await preloadAllImageUrls(data);
      setImageUrlMap(urlMap);
      
      // Set products and current index
      setProducts(data || []);
      setCurrentIndex(0);
      
      // Set the current image URL if we have the first product
      if (data && data.length > 0 && urlMap[data[0].scrape_id]) {
        setCurrentImageUrl(urlMap[data[0].scrape_id]);
      }
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

 // Also update the useEffect for initial load to use preloaded URLs
  useEffect(() => {
    console.log('Initial load useEffect triggered');
    const savedEmail = localStorage.getItem('userEmail');
    const savedIndex = localStorage.getItem('currentProductIndex');
    const savedProducts = localStorage.getItem('products');
    
    if (savedEmail) {
      console.log('Found saved email:', savedEmail);
      setEmail(savedEmail);
      setIsAuthenticated(true);

      if (savedProducts) {
        console.log('Found saved products in localStorage');
        try {
          const parsedProducts = JSON.parse(savedProducts);
          setProducts(parsedProducts);
          
          const index = savedIndex ? parseInt(savedIndex, 10) : 0;
          console.log('Setting current index to:', index);
          
          if (index < parsedProducts.length) {
            setCurrentIndex(index);
            
            // Preload all image URLs
            preloadAllImageUrls(parsedProducts).then(urlMap => {
              setImageUrlMap(urlMap);
              
              // Set current image URL
              const product = parsedProducts[index];
              if (urlMap[product.scrape_id]) {
                setCurrentImageUrl(urlMap[product.scrape_id]);
              } else {
                // Fallback to direct fetch
                fetchImageUrl(product);
              }
            });
          }
        } catch (err) {
          console.error('Error parsing saved products:', err);
          fetchProducts(savedEmail);
        }
      } else {
        console.log('No saved products, fetching from API');
        fetchProducts(savedEmail);
      }
    } else {
      console.log('No saved email, user needs to log in');
    }
  }, []);

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

      localStorage.setItem('userEmail', email);
      setIsAuthenticated(true);
      fetchProducts(email);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  // Replace the existing submitReview function with this enhanced version
  // Replace the existing submitReview function with this fixed version
  const submitReview = async (score) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const currentProduct = products[currentIndex];
      console.log('Submitting review for product scrape_id:', currentProduct.scrape_id);
      
      const response = await fetch('/api/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrape_id: currentProduct.scrape_id,
          review_score: score, // Use the passed score parameter (0 or 1)
          reviewer_email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviewCounter((prev) => prev + 1);

      if (currentIndex < products.length - 1) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        localStorage.setItem('currentProductIndex', newIndex.toString());
        
        console.log('Moving to next product, index:', newIndex);
        const nextProduct = products[newIndex];
        
        // Use preloaded URL from map instead of fetching again
        if (imageUrlMap[nextProduct.scrape_id]) {
          setCurrentImageUrl(imageUrlMap[nextProduct.scrape_id]);
        } else {
          // Fallback to fetching if somehow not preloaded
          console.log('URL not preloaded for product, fetching on demand...');
          await fetchImageUrl(nextProduct);
        }
      } else {
        console.log('No more products to review');
        setCurrentIndex(products.length);
        localStorage.removeItem('currentProductIndex');
      }
    } catch (err) {
      console.error('Error in submitReview:', err);
      setError(`Failed to submit review: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      localStorage.setItem('currentProductIndex', currentIndex.toString());
    };
  }, [currentIndex]);

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
          // Replace the Button component in the Session Complete view
          <Button 
            mt={4} 
            colorScheme="blue" 
            onClick={() => {
              // Clear localStorage items related to products
              localStorage.removeItem('currentProductIndex');
              localStorage.removeItem('products');
              // Fetch fresh products
              fetchProducts(email);
            }}
          >
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
              {currentImageUrl && (
                <Image
                  src={currentImageUrl}
                  alt={products[currentIndex].product_name}
                  fill
                  style={{ objectFit: 'contain', pointerEvents: 'none' }}
                />
              )}
            </Box>

            <Box p={4}>
              <Text fontSize="sm" color="gray.500" mb={1}>Products reviewed: {reviewCounter}</Text>
              <Text fontSize="sm" color="gray.500" mb={2}>ID: {products[currentIndex].scrape_id}</Text>
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
            borderBottomWidth={1}
            borderColor="gray.200"
            p={4}
            pt="env(safe-area-inset-bottom)"
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