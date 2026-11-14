import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { formatErrorResolution } from '../utils/errorHandler.js';

const reportError = (error) => {
  if (error?.code === 'ERR_CANCELED') return;
  // Format the error into full resolution payload with title, message, how-to-solve, and page routing links
  const resolution = formatErrorResolution(error);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm:error', { detail: resolution }));
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: reportError }),
  mutationCache: new MutationCache({ onError: reportError }),
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 5 * 60000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (count, error) => count < 1 && (!error?.response || error.response.status >= 500),
      retryDelay: 1500
    },
    mutations: { retry: false }
  }
});
