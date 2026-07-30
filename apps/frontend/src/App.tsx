import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { apiClient } from './api/client';
import { Header } from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';

const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const PublicRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};

function App() {
  const { setAuth, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    apiClient.post('/auth/refresh')
      .then(async (res) => {
        const token = res.data.accessToken;
        const meRes = await apiClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        setAuth(meRes.data, token);
      })
      .catch(() => clearAuth())
      .finally(() => setIsInitializing(false));
  }, [setAuth, clearAuth]);

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
        <Header />
        <main className="p-4 container mx-auto">
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<div>Profile page</div>} />
            </Route>

            <Route path="/" element={<h1 className="text-2xl mt-10">Welcome to E-Shop Aggregator!</h1>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
