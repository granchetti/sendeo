import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactDOM from 'react-dom/client';
import App from './App';

const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={qc}>
    <App />
  </QueryClientProvider>
);
