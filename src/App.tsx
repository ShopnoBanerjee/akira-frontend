import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ErrorBoundary } from "@/app/ErrorBoundary";
import { Router } from "@/app/Router";
import { AuthProvider } from "@/features/auth/AuthProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // In-store wifi drops. Retry, but do not hammer.
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
