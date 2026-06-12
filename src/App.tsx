import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import LoginPage from '@/pages/auth/LoginPage';

import EmployeeHomePage from '@/pages/employee/HomePage';
import EmployeeHistoryPage from '@/pages/employee/HistoryPage';
import EmployeeLeavePage from '@/pages/employee/LeavePage';
import EmployeeAdjustPage from '@/pages/employee/AdjustPage';
import EmployeePayslipPage from '@/pages/employee/PayslipPage';

import AdminDashboardPage from '@/pages/admin/DashboardPage';
import AdminEmployeesPage from '@/pages/admin/EmployeesPage';
import AdminAttendancePage from '@/pages/admin/AttendancePage';
import AdminApprovalsPage from '@/pages/admin/ApprovalsPage';
import AdminPayrollPage from '@/pages/admin/PayrollPage';
import AdminSettingsPage from '@/pages/admin/SettingsPage';
import AdminReportsPage from '@/pages/admin/ReportsPage';

function RootRedirect() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === 'employee') return <Navigate to="/employee" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Employee */}
            <Route
              path="/employee"
              element={<RequireAuth requireRole="employee"><AppShell><EmployeeHomePage /></AppShell></RequireAuth>}
            />
            <Route
              path="/employee/history"
              element={<RequireAuth requireRole="employee"><AppShell><EmployeeHistoryPage /></AppShell></RequireAuth>}
            />
            <Route
              path="/employee/leave"
              element={<RequireAuth requireRole="employee"><AppShell><EmployeeLeavePage /></AppShell></RequireAuth>}
            />
            <Route
              path="/employee/adjust"
              element={<RequireAuth requireRole="employee"><AppShell><EmployeeAdjustPage /></AppShell></RequireAuth>}
            />
            <Route
              path="/employee/payslip"
              element={<RequireAuth requireRole="employee"><AppShell><EmployeePayslipPage /></AppShell></RequireAuth>}
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={<RequireAuth requireRole="admin"><AppShell><AdminDashboardPage /></AppShell></RequireAuth>}
            />
            <Route
              path="/admin/employees"
              element={<RequireAuth requireRole="admin"><AppShell><AdminEmployeesPage /></AppShell></RequireAuth>}
            />
            <Route
              path="/admin/attendance"
              element={<RequireAuth requireRole="admin"><AppShell><AdminAttendancePage /></AppShell></RequireAuth>}
            />
            <Route
              path="/admin/approvals"
              element={<RequireAuth requireRole="admin"><AppShell><AdminApprovalsPage /></AppShell></RequireAuth>}
            />
            <Route
              path="/admin/payroll"
              element={<RequireAuth requireRole="admin"><AppShell><AdminPayrollPage /></AppShell></RequireAuth>}
            />
            <Route
              path="/admin/settings"
              element={<RequireAuth requireRole="admin"><AppShell><AdminSettingsPage /></AppShell></RequireAuth>}
            />
            <Route
              path="/admin/reports"
              element={<RequireAuth requireRole="admin"><AppShell><AdminReportsPage /></AppShell></RequireAuth>}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
