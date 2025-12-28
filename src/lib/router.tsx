import { createBrowserRouter, Navigate } from 'react-router-dom'
import { App } from '@/components/App'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/keys" replace />,
  },
  {
    path: '/keys',
    element: <App section="keys" />,
  },
  {
    path: '/experiment',
    element: <App section="experiment" />,
  },
  {
    path: '*',
    element: <Navigate to="/keys" replace />,
  },
])
