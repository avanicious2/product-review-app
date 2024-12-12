// pages/_app.js
import { ChakraProvider, createTheme } from '@chakra-ui/react'

// Create a theme instance
const theme = createTheme({
  // your theme customization (if needed)
})

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme}>
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default MyApp