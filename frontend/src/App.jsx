import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Pendaftaranpasien from "./pages/Pendaftaranpasien";
import PelayananMedis from "./pages/PelayananMedis";

import Administration from "./pages/Administration";
import Kasir from "./pages/Kasir";
import PenunjangMedis from "./pages/PenunjangMedis";

import Logistik from "./pages/Logistik";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="app-shell">
                  <Sidebar activeKey="dashboard" />
                  <main className="app-content">
                    <Dashboard />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pendaftaran"
            element={
              <ProtectedRoute>
                <div className="app-shell">
                  <Sidebar activeKey="pelayanan" />
                  <main className="app-content">
                    <Pendaftaranpasien />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/medis"
            element={
              <ProtectedRoute>
                <div className="app-shell">
                  <Sidebar activeKey="medis" />
                  <main className="app-content">
                    <PelayananMedis />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/administration"
            element={
              <ProtectedRoute>
                <div className="app-shell">
                  <Sidebar activeKey="sistem" />
                  <main className="app-content">
                    <Administration />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/kasir"
            element={
              <ProtectedRoute>
                <div className="app-shell">
                  <Sidebar activeKey="kasir" />
                  <main className="app-content">
                    <Kasir />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/penunjang"
            element={
              <ProtectedRoute>
                <div className="app-shell">
                  <Sidebar activeKey="penunjang" />
                  <main className="app-content">
                    <PenunjangMedis />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistik"
            element={
              <ProtectedRoute>
                <div className="app-shell">
                  <Sidebar activeKey="logistik" />
                  <main className="app-content">
                    <Logistik />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;