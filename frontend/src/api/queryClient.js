import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

const reportError = (error) => {
  if (error?.code === 'ERR_CANCELED' || error?.response?.status === 401) return;
  window.dispatchEvent(new CustomEvent('crm:error', { detail: {
    message: error?.response?.data?.message || (error?.code === 'ECONNABORTED'
      ? 'The request took too long. Please try again.'
      : error?.response ? 'The request could not be completed. Please try again.' : 'Unable to connect. Check your connection and try again.'),
    requestId: error?.response?.data?.requestId
  } }));
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
