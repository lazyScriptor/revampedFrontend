import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry if the backend specifically tells us we are unauthorized
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        return failureCount < 2; // Retry up to 2 times for standard network hiccups
      },
      staleTime: 1000 * 60 * 5, // Data is considered "fresh" for 5 minutes
      refetchOnWindowFocus: false, // Prevents annoying refetches every time you change browser tabs
    },
  },
});