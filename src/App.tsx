import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import PropertiesPage from "./pages/PropertiesPage";
import LeadsPage from "./pages/LeadsPage";
import CalendarPage from "./pages/CalendarPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import AIDashboardPage from "./pages/AIDashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound.tsx";
import { useAuthStore } from "./store/useAuthStore";
import { useAppStore } from "./store/useAppStore";
import { ApiError } from "./lib/api";

const queryClient = new QueryClient();

/** Redirects to /login when there is no active session */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Loads all core data once the user is authenticated */
function DataBootstrap() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { fetchLeads, fetchProperties, fetchVisits, fetchAnalytics } = useAppStore();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchLeads({ limit: "200" }),
      fetchProperties({ limit: "100" }),
      fetchVisits({ limit: "200" }),
      fetchAnalytics(),
    ]).catch((err) => {
      // If token expired and refresh failed, log out cleanly via React Router
      if (err instanceof ApiError && err.status === 401) {
        logout();
      }
    });
  }, [user?.id]);

  return null;
}

const App = () => {
  const rehydrate = useAuthStore((s) => s.rehydrate);

  useEffect(() => {
    rehydrate().catch(() => {});
    // Apply saved theme preference; default is dark
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DataBootstrap />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/propiedades" element={<PropertiesPage />} />
                      <Route path="/leads" element={<LeadsPage />} />
                      <Route path="/calendario" element={<CalendarPage />} />
                      <Route path="/analiticas" element={<AnalyticsPage />} />
                      <Route path="/configuracion" element={<SettingsPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/ia" element={<AIDashboardPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
