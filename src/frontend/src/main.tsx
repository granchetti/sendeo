import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ReactDOM from 'react-dom/client';

const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={qc}>
    <App />
  </QueryClientProvider>
);
