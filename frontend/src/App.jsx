import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Pendaftaranpasien from "./pages/Pendaftaranpasien";

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
<<<<<<< HEAD
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pendaftaran" element={<Pendaftaranpasien />} />
=======
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
>>>>>>> ceb9a49f36330b1ea45d65cb371a81754ba8e27d
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
