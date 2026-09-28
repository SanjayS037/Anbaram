import { createBrowserRouter, Navigate } from 'react-router'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { LoginPage } from '../pages/auth/LoginPage'
import { OverviewPage } from '../pages/overview/OverviewPage'
import { ReportsPage } from '../pages/reports/ReportsPage'
import { OfficersPage } from '../pages/officers/OfficersPage'
import { NotFoundPage } from '../pages/errors/NotFoundPage'
import { CollectionPointsPage } from '../pages/collection-points/CollectionPointsPage'
import { DistributionCentersPage } from '../pages/distribution-centers/DistributionCentersPage'
import { FlagsPage } from '../pages/flags/FlagsPage'
import { BatchExplorerPage } from '../pages/batches/BatchExplorerPage'
import { CollectionRequestsPage } from '../pages/requests/CollectionRequestsPage'
import { PanelRedirect } from './PanelRedirect'
import { RequireAdmin } from './RequireAdmin'

const handle = (title) => ({ title })

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAdmin>
        <DashboardLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', handle: handle('Home'), element: <OverviewPage /> },
      { path: 'collection-points', handle: handle('Collection Points'), element: <CollectionPointsPage /> },
      { path: 'collection-points/:id', element: <PanelRedirect to="/collection-points" /> },
      { path: 'distribution-centers', handle: handle('Distribution Centers'), element: <DistributionCentersPage /> },
      { path: 'distribution-centers/:id', element: <PanelRedirect to="/distribution-centers" /> },
      { path: 'requests', handle: handle('Requests & Stock'), element: <CollectionRequestsPage /> },
      { path: 'officers', handle: handle('Officers'), element: <OfficersPage /> },
      { path: 'officers/:id', element: <PanelRedirect to="/officers" /> },
      { path: 'flags', handle: handle('Flags'), element: <FlagsPage /> },
      { path: 'batches', handle: handle('Shipments'), element: <BatchExplorerPage /> },
      { path: 'batches/:id', element: <PanelRedirect to="/batches" /> },
      { path: 'reports', handle: handle('Reports'), element: <ReportsPage /> },
      { path: '*', handle: handle('Page not found'), element: <NotFoundPage /> },
    ],
  },
])
