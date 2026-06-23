import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { FieldProvider } from "./contexts/FieldContext";
import { LanguageProvider } from "./contexts/LanguageContext";

import AuthPage from "./features/auth/AuthPage";
import DrisProjectMapPage from "./features/map/MapPage";
import DrisProjectHealthPage from "./features/health/HealthPage";
import DrisProjectAnalysisPage from "./features/analysis/AnalysisPage";
import DrisProjectFieldDetailPage from "./features/field/FieldDetailPage";
import DrisProjectWeatherPage from "./features/weather/WeatherPage";
import DrisProjectDroughtPage from "./features/drought/DroughtPage";
import ProtectedRoute from "./features/auth/ProtectedRoute";

// Admin imports
import AdminLoginPage from "./features/admin/AdminLoginPage";
import AdminProtectedRoute from "./features/admin/AdminProtectedRoute";
import AdminLayout from "./features/admin/AdminLayout";
import AdminDashboardPage from "./features/admin/AdminDashboardPage";
import AdminFieldsPage from "./features/admin/AdminFieldsPage";
import AdminUsersPage from "./features/admin/AdminUsersPage";
import AdminAlertsPage from "./features/admin/AdminAlertsPage";
import AdminSecurityLogs from './features/admin/pages/AdminSecurityLogs';
import AdminGeeMonitorPage from './features/admin/AdminGeeMonitorPage';

function AppContent() {
  return (
    <div className="app">
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Admin Login Route */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin Protected Routes */}
        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/fields" element={<AdminFieldsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/alerts" element={<AdminAlertsPage />} />
            <Route path="/admin/security" element={<AdminSecurityLogs />} />
            <Route path="/admin/gee-monitor" element={<AdminGeeMonitorPage />} />
          </Route>
        </Route>

        {/* Standard Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dris_project" replace />} />
          <Route path="/dris_project" element={<DrisProjectMapPage />} />
          <Route
            path="/dris_project/field/:fieldId"
            element={<DrisProjectFieldDetailPage />}
          />
          <Route
            path="/dris_project/health/:fieldId"
            element={<DrisProjectHealthPage />}
          />
          <Route
            path="/dris_project/analysis/:fieldId"
            element={<DrisProjectAnalysisPage />}
          />
          <Route
            path="/dris_project/weather/:fieldId"
            element={<DrisProjectWeatherPage />}
          />
          <Route
            path="/dris_project/drought/:fieldId"
            element={<DrisProjectDroughtPage />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/dris_project" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <FieldProvider>
          <Router>
            <AppContent />
          </Router>
        </FieldProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
