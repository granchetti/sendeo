import * as ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { theme } from './theme'

// // 1) Polyfill Node globals for the browser before anything else runs:
// ;(window as any).global = window;
// ;(window as any).process = { env: {} };
// import { Buffer } from "buffer";
// ;(window as any).Buffer = Buffer;

const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ChakraProvider theme={theme}>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ChakraProvider>
);
