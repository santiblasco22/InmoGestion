import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Propiedades", url: "/propiedades", icon: Building2 },
  { title: "Leads (CRM)", url: "/leads", icon: Users },
  { title: "Calendario", url: "/calendario", icon: CalendarDays },
  { title: "Analíticas", url: "/analiticas", icon: BarChart3 },
  { title: "Actividad", url: "/actividad", icon: Activity },
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const allNavItems = [
    ...navItems,
    ...(user?.role === "ADMIN" ? [{ title: "Admin", url: "/admin", icon: ShieldCheck }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    toast.success("Sesión cerrada");
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <Building2 className="h-6 w-6 text-sidebar-primary" />
        {!collapsed && (
          <span className="text-base font-semibold text-sidebar-foreground tracking-tight">
            InmoGestión
          </span>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/60"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name ?? "Agente"}
              </p>
              <p className="text-xs text-sidebar-muted truncate">{user?.email ?? ""}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
