import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/layout'
import { OverviewPage } from './features/repos/overview-page'
import { RepoPage } from './features/repo/repo-page'
import { SettingsPage } from './features/settings/settings-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'repo/:owner/:name', element: <RepoPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
