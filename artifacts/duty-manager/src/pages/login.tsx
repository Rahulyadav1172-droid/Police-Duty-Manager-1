import { useState } from "react";
import { Eye, EyeOff, Lock, RefreshCw, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type UserRole } from "@/hooks/use-auth";

export default function LoginPage() {
  const { login, changePassword } = useAuth();
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetCurrent, setResetCurrent] = useState("");
  const [resetNew, setResetNew] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [showResetCurrent, setShowResetCurrent] = useState(false);
  const [showResetNew, setShowResetNew] = useState(false);

  function handleRoleSwitch(role: UserRole) {
    setSelectedRole(role);
    setPassword("");
    setError("");
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setTimeout(() => {
      const ok = login(password, selectedRole);
      if (!ok) {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
      setIsLoading(false);
    }, 400);
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (resetNew !== resetConfirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    const result = changePassword(resetCurrent, resetNew, selectedRole);
    if (result.success) {
      toast({ title: "Password changed successfully" });
      setResetOpen(false);
      setResetCurrent("");
      setResetNew("");
      setResetConfirm("");
    } else {
      toast({ title: result.error ?? "Failed to change password", variant: "destructive" });
    }
  }

  const isAdmin = selectedRole === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg shadow-blue-900/50 mb-4">
            <img src="/up-police-logo.png" alt="UP Police" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Duty Manager</h1>
          <p className="text-blue-300 text-sm mt-1 font-medium uppercase tracking-widest">Ayodhya Police Line</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => handleRoleSwitch("admin")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              isAdmin
                ? "border-blue-500 bg-blue-600/20 text-white"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
            }`}
          >
            <ShieldCheck className={`w-6 h-6 ${isAdmin ? "text-blue-400" : "text-white/40"}`} />
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide">Admin</p>
              <p className="text-[10px] text-white/50 mt-0.5">Full access</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch("officer")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              !isAdmin
                ? "border-amber-500 bg-amber-600/20 text-white"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
            }`}
          >
            <Star className={`w-6 h-6 ${!isAdmin ? "text-amber-400" : "text-white/40"}`} />
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide">Senior Officer</p>
              <p className="text-[10px] text-white/50 mt-0.5">View & reports</p>
            </div>
          </button>
        </div>

        {/* Card */}
        <div className={`backdrop-blur-sm border rounded-2xl p-8 shadow-2xl transition-colors ${
          isAdmin
            ? "bg-white/5 border-white/10"
            : "bg-amber-950/20 border-amber-500/20"
        }`}>
          {/* Username display */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-1.5">
              {isAdmin ? "Username" : "Role"}
            </p>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-white font-semibold text-sm">
                {isAdmin ? "Ayodhya Police Line" : "Senior Officer — View Only"}
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-1.5 block">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter your password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-11 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className={`w-full font-semibold h-11 text-base shadow-lg ${
                isAdmin
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40"
              }`}
              disabled={isLoading || !password}
            >
              {isLoading ? "Signing in…" : `Sign In as ${isAdmin ? "Admin" : "Senior Officer"}`}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="text-xs text-blue-400 hover:text-blue-200 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Change Password
            </button>
          </div>
        </div>

        {!isAdmin && (
          <p className="text-center text-amber-400/60 text-xs mt-4">
            Senior Officer access — view-only. Default password: <span className="font-mono">officer@123</span>
          </p>
        )}

        <p className="text-center text-white/20 text-xs mt-4">
          Ayodhya Police Line · Internal Portal · {new Date().getFullYear()}
        </p>
      </div>
      {/* Change Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change {isAdmin ? "Admin" : "Senior Officer"} Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
            <div>
              <Label className="text-sm font-medium">Current Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showResetCurrent ? "text" : "password"}
                  value={resetCurrent}
                  onChange={(e) => setResetCurrent(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowResetCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">New Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showResetNew ? "text" : "password"}
                  value={resetNew}
                  onChange={(e) => setResetNew(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowResetNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Confirm New Password</Label>
              <Input
                type="password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="Repeat new password"
                required
                className="mt-1.5"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!resetCurrent || !resetNew || !resetConfirm}>
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
