import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/modules/auth/context/AuthContext";
import { AppRouter } from "@/app/router/AppRouter";

function getStatusCode(error: unknown): number | undefined {
  const err = error as { response?: { status: number } } | undefined;
  return err?.response?.status;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = getStatusCode(error);
        if (status && [400, 401, 403, 404, 409, 422, 429].includes(status)) {
          return false;
        }
        return failureCount < 2;
      }
    }
  }
});

export function AppProviders(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
