import { ChakraProvider } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Tabs, TabList, Tab, Button, Flex } from '@chakra-ui/react';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail && router.pathname !== '/login') {
      router.push('/login'); // Redirect to login if not authenticated
    } else if (userEmail && router.pathname === '/login') {
      router.push('/'); // Redirect to the app if already authenticated
    } else {
      setIsAuthenticated(!!userEmail);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    router.push('/login');
  };

  if (!isAuthenticated && router.pathname !== '/login') {
    return null; // Prevent rendering until authentication check is complete
  }

  return (
    <ChakraProvider>
      {router.pathname !== '/login' && (
        <Box>
          <Flex
            justify="space-between"
            align="center"
            bg="white"
            px={4}
            position="sticky"
            top={0}
            zIndex={10}
            boxShadow="sm"
          >
            <Tabs>
              <TabList>
                <Tab onClick={() => router.push('/')}>Review</Tab>
                <Tab onClick={() => router.push('/dashboard')}>Dashboard</Tab>
              </TabList>
            </Tabs>
            <Button
              onClick={handleLogout}
              colorScheme="red"
              size="sm"
              ml={4}
            >
              Logout
            </Button>
          </Flex>
        </Box>
      )}
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
