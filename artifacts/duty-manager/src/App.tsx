import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import LiveBoard from "@/pages/live-board";
import PersonnelManagement from "@/pages/personnel";
import DutyPointsManagement from "@/pages/duty-points";
import RosterHistory from "@/pages/roster";
import AssignDuty from "@/pages/assign";
import HandoverReport from "@/pages/handover";
import MusterRoll from "@/pages/muster";
import TransferReceipt from "@/pages/transfer";
import LeaveManagement from "@/pages/leave";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={LiveBoard} />
        <Route path="/personnel" component={PersonnelManagement} />
        <Route path="/duty-points" component={DutyPointsManagement} />
        <Route path="/roster" component={RosterHistory} />
        <Route path="/assign" component={AssignDuty} />
        <Route path="/handover" component={HandoverReport} />
        <Route path="/muster" component={MusterRoll} />
        <Route path="/transfer" component={TransferReceipt} />
        <Route path="/leave" component={LeaveManagement} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
