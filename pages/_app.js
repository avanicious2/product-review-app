// pages/_app.js
import { ChakraProvider, extendTheme } from '@chakra-ui/react'

const customTheme = extendTheme({})

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider theme={customTheme}>
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default MyApp
