import { Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Links from './pages/Links'

export default function App() {
  return (
    <Routes>
      <Route path="/a/:hash" element={<Dashboard />} />
      <Route path="/links" element={<Links />} />
      <Route
        path="*"
        element={
          <div className="flex min-h-screen items-center justify-center px-6">
            <div className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-balance">Shrty</h1>
              <p className="mt-2 text-muted-foreground">Link shortener with analytics</p>
              <Link
                to="/links"
                className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
              >
                View all links
              </Link>
            </div>
          </div>
        }
      />
    </Routes>
  )
}
