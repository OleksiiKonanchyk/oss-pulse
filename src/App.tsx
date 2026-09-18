import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'
import { createPersister, queryClient } from './queries/client'
import { router } from './router'

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: createPersister() }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  )
}
