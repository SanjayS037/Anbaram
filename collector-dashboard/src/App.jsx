import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './hooks/AuthProvider'
import { router } from './routes/router'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
