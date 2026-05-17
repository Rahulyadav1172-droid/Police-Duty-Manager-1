import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import LoginPage from "@/pages/login";
import MessBooking from "@/pages/smart-cell/mess-booking";
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
import EventsPage from "@/pages/events";
import RotationFairness from "@/pages/rotation";

const queryClient = new QueryClient();

function AdminRouter() {
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
        <Route path="/assign" component={AssignDuty} />
        <Route path="/personnel" component={PersonnelManagement} />
        <Route path="/duty-points" component={DutyPointsManagement} />
        <Route path="/events" component={EventsPage} />
        <Route path="/rotation" component={RotationFairness} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppContent() {
  const { role } = useAuth();
  if (role === "smart-cell") return <MessBooking />;
  return <AdminRouter />;
}

function AppInner() {
  const auth = useAuthState();

  return (
    <AuthContext.Provider value={auth}>
      {auth.isAuthenticated ? <AppContent /> : <LoginPage />}
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
