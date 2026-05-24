import { BrowserRouter, Route, Routes, Navigate } from 'react-router'
import TapeListPage from './pages/TapeListPage'
import TapePage from './pages/TapePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TapeListPage />} />
        <Route path="/tape/:id" element={<TapePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
