import { useState } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router'
import { AnimatePresence } from 'motion/react'
import TapeListPage from './pages/TapeListPage'
import NewCassettePage from './pages/NewCassettePage'
import TapePage from './pages/TapePage'
import DecoratePage from './pages/DecoratePage'
import SplashPage from './pages/SplashPage'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TapeListPage />} />
        <Route path="/new" element={<NewCassettePage />} />
        <Route path="/tape/:id/edit" element={<NewCassettePage />} />
        <Route path="/tape/:id" element={<TapePage />} />
        <Route path="/tape/:id/decorate" element={<DecoratePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AnimatePresence>
        {showSplash && <SplashPage onDone={() => setShowSplash(false)} />}
      </AnimatePresence>
    </BrowserRouter>
  )
}
