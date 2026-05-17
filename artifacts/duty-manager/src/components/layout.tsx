import { ShieldAlert, Users, MapPin, ListOrdered, CalendarCheck, Search, ArrowLeftRight, ClipboardList, PackageOpen, CalendarOff, LogOut, KeyRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, changePassword } = useAuth();
  const { toast } = useToast();

  const [changePassOpen, setChangePassOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const navigation = [
    { name: "Live Board",       href: "/",           icon: ShieldAlert },
    { name: "Assign Duty",      href: "/assign",     icon: CalendarCheck },
    { name: "Roster History",   href: "/roster",     icon: ListOrdered },
    { name: "Handover Report",  href: "/handover",   icon: ArrowLeftRight },
    { name: "Muster Roll",      href: "/muster",     icon: ClipboardList },
    { name: "Transfer Receipt", href: "/transfer",   icon: PackageOpen },
    { name: "Leave Register",   href: "/leave",      icon: CalendarOff },
    { name: "Personnel",        href: "/personnel",  icon: Users },
    { name: "Duty Points",      href: "/duty-points",icon: MapPin },
  ];

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    const result = changePassword(current, next);
    if (result.success) {
      toast({ title: "Password changed successfully" });
      setChangePassOpen(false);
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      toast({ title: result.error ?? "Failed to change password", variant: "destructive" });
    }
  }

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
        <div className="p-4 border-t border-sidebar-border/50 space-y-1">
          <button
            onClick={() => setChangePassOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Change Password
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
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
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              OC
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-muted/20">
          {children}
        </main>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePassOpen} onOpenChange={setChangePassOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
            <div>
              <Label className="text-sm font-medium">Current Password</Label>
              <div className="relative mt-1.5">
                <Input type={showCurrent ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)} placeholder="Current password" required className="pr-10" />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">New Password</Label>
              <div className="relative mt-1.5">
                <Input type={showNext ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)} placeholder="Min. 6 characters" required minLength={6} className="pr-10" />
                <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Confirm New Password</Label>
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" required className="mt-1.5" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setChangePassOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!current || !next || !confirm}>Update Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
