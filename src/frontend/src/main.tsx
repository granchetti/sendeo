// src/main.tsx
import * as ReactDOM from "react-dom/client";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";

// 1) Polyfill Node globals for the browser before anything else runs:
;(window as any).global = window;
;(window as any).process = { env: {} };
import { Buffer } from "buffer";
;(window as any).Buffer = Buffer;

const qc = new QueryClient();
const theme = extendTheme({
  // …your theme overrides…
});

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
