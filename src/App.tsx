import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Auth } from '@/pages/Auth'
import { Today } from '@/pages/Today'
import { Analytics } from '@/pages/Analytics'
import { Settings } from '@/pages/Settings'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Toaster } from '@/components/ui/toaster'
import { OfflineBanner } from '@/components/layout/OfflineBanner'

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Today />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
