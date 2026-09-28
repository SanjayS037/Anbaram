import { BarChart3, Boxes, ClipboardList, Flag, LayoutDashboard, Truck, UsersRound, Warehouse } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/overview', label: 'Home', icon: LayoutDashboard },
  { to: '/collection-points', label: 'Collection Points', icon: Warehouse },
  { to: '/distribution-centers', label: 'Distribution Centers', icon: Truck },
  { to: '/requests', label: 'Requests', icon: ClipboardList, badgeKey: 'stockAlerts' },
  { to: '/officers', label: 'Officers', icon: UsersRound, badgeKey: 'pendingOfficers' },
  { to: '/flags', label: 'Flags', icon: Flag, badgeKey: 'openFlags' },
  { to: '/batches', label: 'Shipments', icon: Boxes },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]
