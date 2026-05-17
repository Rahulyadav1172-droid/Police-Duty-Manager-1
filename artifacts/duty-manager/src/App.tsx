import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import LoginPage from "@/pages/login";
import { AuthContext, useAuthState, useAuth } from "@/hooks/use-auth";

import LiveBoard from "@/pages/live-board";
import PersonnelManagement from "@/pages/personnel";
import DutyPointsManagement from "@/pages/duty-points";
import RosterHistory from "@/pages/roster";
import AssignDuty from "@/pages/assign";
import HandoverReport from "@/pages/handover";
import MusterRoll from "@/pages/muster";
import TransferReceipt from "@/pages/transfer";
import LeaveManagement from "@/pages/leave";
import AttendanceSummary from "@/pages/attendance";
import BiometricAttendance from "@/pages/biometric";

const queryClient = new QueryClient();

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { role } = useAuth();
  if (role !== "admin") return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  const { role } = useAuth();
  return (
    <Layout>
      <Switch>
        <Route path="/" component={LiveBoard} />
        <Route path="/roster" component={RosterHistory} />
        <Route path="/handover" component={HandoverReport} />
        <Route path="/muster" component={MusterRoll} />
        <Route path="/transfer" component={TransferReceipt} />
        <Route path="/leave" component={LeaveManagement} />
        <Route path="/attendance" component={AttendanceSummary} />
        <Route path="/biometric" component={BiometricAttendance} />

        {/* Admin-only routes */}
        <Route path="/assign">
          {role === "admin" ? <AssignDuty /> : <Redirect to="/" />}
        </Route>
        <Route path="/personnel">
          {role === "admin" ? <PersonnelManagement /> : <Redirect to="/" />}
        </Route>
        <Route path="/duty-points">
          {role === "admin" ? <DutyPointsManagement /> : <Redirect to="/" />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppInner() {
  const auth = useAuthState();

  return (
    <AuthContext.Provider value={auth}>
      {auth.isAuthenticated ? <Router /> : <LoginPage />}
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppInner />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
