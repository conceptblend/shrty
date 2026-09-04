import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/a/:hash" element={<Dashboard />} />
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">Shrty</h1>
              <p className="text-gray-500 dark:text-gray-400">Link shortener with analytics</p>
            </div>
          </div>
        }
      />
    </Routes>
  )
}
