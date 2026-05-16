import { ShieldAlert, Users, MapPin, ListOrdered, CalendarCheck, Search } from "lucide-react";
import { Link, useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Live Board", href: "/", icon: ShieldAlert },
    { name: "Assign Duty", href: "/assign", icon: CalendarCheck },
    { name: "Roster History", href: "/roster", icon: ListOrdered },
    { name: "Personnel", href: "/personnel", icon: Users },
    { name: "Duty Points", href: "/duty-points", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-sidebar text-sidebar-foreground flex flex-col flex-shrink-0 border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-foreground/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight uppercase tracking-wide">Duty Manager</h1>
              <p className="text-xs text-sidebar-foreground/60 uppercase tracking-widest font-semibold">Ayodhya Police</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border/50">
          <p className="text-xs text-center text-sidebar-foreground/40">
            System Online &bull; Secure Connection
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b bg-card">
          <h2 className="text-lg font-bold text-foreground capitalize">
            {navigation.find((n) => n.href === location)?.name || "Dashboard"}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-2 bg-muted/50 border-none rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                OC
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
