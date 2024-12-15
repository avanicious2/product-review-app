import { useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, Container, Text, Input } from '@chakra-ui/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('userEmail', email);
      router.push('/'); // Redirect to the main app
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="md" py={10}>
      <Box bg="white" p={6} borderRadius="lg" boxShadow="lg">
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Login to Access Reviews
        </Text>
        {error && (
          <Box bg="red.100" color="red.700" p={2} borderRadius="md" mb={4}>
            {error}
          </Box>
        )}
        <form onSubmit={handleLogin}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            mb={4}
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            mb={4}
            required
          />
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
  );
}
