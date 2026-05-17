import { useState } from "react";
import { Eye, EyeOff, Lock, RefreshCw, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth, SESSION_EXPIRED_KEY } from "@/hooks/use-auth";

export default function LoginPage() {
  const { login, changePassword } = useAuth();

  const [sessionExpired] = useState(() => {
    const flag = localStorage.getItem(SESSION_EXPIRED_KEY) === "1";
    if (flag) localStorage.removeItem(SESSION_EXPIRED_KEY);
    return flag;
  });
  const { toast } = useToast();

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

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setTimeout(() => {
      const ok = login(password, "admin");
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
    const result = changePassword(resetCurrent, resetNew, "admin");
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

        {/* Session-expired notice */}
        {sessionExpired && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-300">
            <Clock className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs font-medium leading-snug">
              You were automatically logged out after 1 hour of inactivity. Please sign in again.
            </p>
          </div>
        )}

        {/* Card */}
        <div className="backdrop-blur-sm border border-white/10 bg-white/5 rounded-2xl p-8 shadow-2xl">

          {/* Role badge */}
          <div className="flex items-center justify-center gap-2 mb-7">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 text-sm font-bold uppercase tracking-widest">गणना कार्यालय</span>
          </div>

          {/* Username display */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-1.5">Username</p>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-white font-semibold text-sm">Ayodhya Police Line</span>
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
              className="w-full font-semibold h-11 text-base shadow-lg bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
              disabled={isLoading || !password}
            >
              {isLoading ? "Signing in…" : "Sign In"}
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

        <p className="text-center text-white/20 text-xs mt-4">
          Ayodhya Police Line · Internal Portal · {new Date().getFullYear()}
        </p>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
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
