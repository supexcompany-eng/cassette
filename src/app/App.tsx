import { BrowserRouter, Route, Routes, Navigate } from 'react-router'
import TapeListPage from './pages/TapeListPage'
import NewCassettePage from './pages/NewCassettePage'
import TapePage from './pages/TapePage'
import SharePage from './pages/SharePage'
// 꾸미기(DecoratePage)는 현재 스펙아웃 — 라우트 제외(파일은 보존). 재도입 시 import/route 복구.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TapeListPage />} />
        <Route path="/new" element={<NewCassettePage />} />
        <Route path="/tape/:id/edit" element={<NewCassettePage />} />
        <Route path="/tape/:id" element={<TapePage />} />
        <Route path="/s/:id" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
