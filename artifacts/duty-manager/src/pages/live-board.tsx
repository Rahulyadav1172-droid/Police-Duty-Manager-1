import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import { ShieldAlert, MapPin, Search, Clock, Users, ArrowRightCircle, LogOut } from "lucide-react";
import { 
  useGetLiveBoard, 
  getGetLiveBoardQueryKey,
  useGetRosterStats,
  useReleaseFromDuty,
  RosterEntry,
  Personnel
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RankBadge } from "@/components/rank-badge";

function TimeRemaining({ endDateTime }: { endDateTime: string }) {
  const end = new Date(endDateTime);
  const now = new Date();
  
  if (now > end) {
    return <span className="text-red-500 font-bold">Expired</span>;
  }
  
  const mins = differenceInMinutes(end, now);
  const hrs = differenceInHours(end, now);
  
  if (hrs > 0) {
    return <span>{hrs}h {mins % 60}m left</span>;
  }
  return <span>{mins}m left</span>;
}

export default function LiveBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: liveBoard, isLoading: isLiveBoardLoading } = useGetLiveBoard({
    query: {
      queryKey: getGetLiveBoardQueryKey(),
      refetchInterval: 30000,
    }
  });
  
  const { data: stats, isLoading: isStatsLoading } = useGetRosterStats({
    query: {
      queryKey: ["getRosterStats"],
      refetchInterval: 30000,
    }
  });

  const releaseMutation = useReleaseFromDuty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLiveBoardQueryKey() });
        toast({ title: "Personnel released from duty" });
      },
      onError: () => {
        toast({ title: "Failed to release personnel", variant: "destructive" });
      }
    }
  });

  const handleRelease = (id: number) => {
    releaseMutation.mutate({ id });
  };

  const filteredOnDuty = liveBoard?.onDuty.filter(entry => 
    entry.personnel?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.personnel?.beltNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.dutyPoint?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredAvailable = liveBoard?.available.filter(person => 
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.beltNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Duty Board</h1>
          <p className="text-sm text-muted-foreground">Real-time status of all personnel across Ayodhya Police Line.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search personnel or location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full"
            />
          </div>
          <Link href="/assign" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2" data-testid="link-assign-duty">
            <CalendarCheck className="w-4 h-4" />
            Assign Duty
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Personnel</p>
              {isStatsLoading ? <Skeleton className="h-8 w-16 mt-2" /> : <h3 className="text-3xl font-bold mt-1">{stats?.totalPersonnel || 0}</h3>}
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-950 text-white border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-200 uppercase tracking-wider">On Duty</p>
              {isStatsLoading ? <Skeleton className="h-8 w-16 mt-2 bg-blue-900" /> : <h3 className="text-3xl font-bold mt-1">{stats?.totalOnDuty || 0}</h3>}
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-900 text-white border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-200 uppercase tracking-wider">Available</p>
              {isStatsLoading ? <Skeleton className="h-8 w-16 mt-2 bg-emerald-800" /> : <h3 className="text-3xl font-bold mt-1">{stats?.totalAvailable || 0}</h3>}
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Duty Points</p>
              {isLiveBoardLoading ? <Skeleton className="h-8 w-16 mt-2" /> : <h3 className="text-3xl font-bold mt-1">{liveBoard?.totalDutyPoints || 0}</h3>}
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* On Duty Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              ON DUTY
            </h2>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold">
              {filteredOnDuty.length} Active
            </Badge>
          </div>
          
          <div className="space-y-3">
            {isLiveBoardLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
            ) : filteredOnDuty.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-lg border border-dashed">
                <p className="text-muted-foreground">No personnel currently on duty.</p>
              </div>
            ) : (
              filteredOnDuty.map((entry) => (
                <Card key={entry.id} className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base">{entry.personnel?.name}</h4>
                        <span className="text-xs font-mono text-muted-foreground">#{entry.personnel?.beltNumber}</span>
                        <RankBadge rank={entry.personnel?.rank || ""} />
                      </div>
                      
                      <div className="flex items-start gap-2 text-sm text-foreground">
                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium">{entry.dutyPoint?.name}</p>
                          <p className="text-muted-foreground text-xs">{entry.dutyPoint?.location}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        {entry.dutyType === 'unlimited' ? (
                          <Badge variant="destructive" className="text-[10px] uppercase">Unlimited</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] uppercase">Fixed</Badge>
                        )}
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Started: {format(new Date(entry.startDateTime), "HH:mm")}
                        </span>
                        {entry.dutyType === 'fixed' && entry.endDateTime && (
                          <span className="text-foreground font-medium flex items-center gap-1">
                            <ArrowRightCircle className="w-3 h-3" />
                            <TimeRemaining endDateTime={entry.endDateTime} />
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRelease(entry.id)}
                      disabled={releaseMutation.isPending}
                      data-testid={`btn-release-${entry.id}`}
                      className="shrink-0"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Release
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Available Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              AVAILABLE
            </h2>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
              {filteredAvailable.length} Ready
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isLiveBoardLoading ? (
              Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : filteredAvailable.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-lg border border-dashed col-span-full">
                <p className="text-muted-foreground">No personnel available.</p>
              </div>
            ) : (
              filteredAvailable.map((person) => (
                <Card key={person.id} className="border-l-4 border-l-emerald-500 bg-card/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate">{person.name}</h4>
                        <span className="text-xs font-mono text-muted-foreground">#{person.beltNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <RankBadge rank={person.rank} />
                      <Link href={`/assign?personnelId=${person.id}`} className="text-xs font-medium text-primary hover:underline flex items-center gap-1" data-testid={`link-assign-${person.id}`}>
                        Assign <ArrowRightCircle className="w-3 h-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Needed imports
import { CalendarCheck } from "lucide-react";
