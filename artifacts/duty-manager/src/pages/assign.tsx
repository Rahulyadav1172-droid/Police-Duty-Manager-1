import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import {
  useListPersonnel,
  useListDutyPoints,
  useAssignDuty,
  RosterInputDutyType,
  getGetLiveBoardQueryKey,
  getListRosterQueryKey,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SearchableCombobox, type ComboboxOption } from "@/components/searchable-combobox";

const assignSchema = z.object({
  personnelId: z.coerce.number().min(1, "Personnel selection is required"),
  dutyPointId: z.coerce.number().min(1, "Duty point selection is required"),
  dutyType: z.enum([RosterInputDutyType.unlimited, RosterInputDutyType.fixed]),
  startDateTime: z.string().min(1, "Start time is required"),
  endDateTime: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.dutyType === RosterInputDutyType.fixed && !data.endDateTime) return false;
  return true;
}, { message: "End time is required for fixed duty", path: ["endDateTime"] });

export default function AssignDuty() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(window.location.search);
  const preselectedPersonnelId = searchParams.get("personnelId");

  const { data: personnel } = useListPersonnel();
  const { data: dutyPoints } = useListDutyPoints();

  const assignMutation = useAssignDuty({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLiveBoardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListRosterQueryKey() });
        toast({ title: "Duty assigned successfully" });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ title: "Assignment Failed", description: err.message || "An error occurred", variant: "destructive" });
      },
    },
  });

  const now = new Date();
  now.setMinutes(0, 0, 0);
  const defaultStartTime = format(now, "yyyy-MM-dd'T'HH:mm");
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultEndTime = format(tomorrow, "yyyy-MM-dd'T'HH:mm");

  const form = useForm<z.infer<typeof assignSchema>>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      personnelId: preselectedPersonnelId ? parseInt(preselectedPersonnelId) : undefined,
      dutyPointId: undefined,
      dutyType: RosterInputDutyType.unlimited,
      startDateTime: defaultStartTime,
      endDateTime: defaultEndTime,
      notes: "",
    },
  });

  const dutyType = form.watch("dutyType");

  const onSubmit = (values: z.infer<typeof assignSchema>) => {
    if (values.dutyType === RosterInputDutyType.unlimited) {
      delete values.endDateTime;
    } else {
      if (new Date(values.endDateTime!) <= new Date(values.startDateTime)) {
        form.setError("endDateTime", { message: "End time must be after start time" });
        return;
      }
    }
    const payload = {
      ...values,
      startDateTime: new Date(values.startDateTime).toISOString(),
      ...(values.endDateTime ? { endDateTime: new Date(values.endDateTime).toISOString() } : {}),
    };
    assignMutation.mutate({ data: payload as any });
  };

  // Build combobox options
  const personnelOptions: ComboboxOption[] = (personnel ?? []).map((p) => ({
    value: String(p.id),
    label: p.name,
    sublabel: `${p.beltNumber} · ${p.rank.replace(/_/g, " ")}`,
  }));

  const dutyPointOptions: ComboboxOption[] = (dutyPoints ?? []).map((dp) => ({
    value: String(dp.id),
    label: dp.name,
    sublabel: dp.location,
  }));

  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-2xl">Assign Duty</CardTitle>
          <CardDescription>
            Deploy personnel to a specific duty point. Active assignments will immediately reflect on the Live Board.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Personnel + Duty Point */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Location & Personnel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Searchable Personnel */}
                  <FormField
                    control={form.control}
                    name="personnelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Personnel</FormLabel>
                        <FormControl>
                          <SearchableCombobox
                            options={personnelOptions}
                            value={field.value ? String(field.value) : undefined}
                            onChange={(val) => field.onChange(parseInt(val))}
                            placeholder="Search by name or belt no."
                            searchPlaceholder="Type name or belt number…"
                            emptyText="No personnel found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Searchable Duty Point */}
                  <FormField
                    control={form.control}
                    name="dutyPointId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Duty Point</FormLabel>
                        <FormControl>
                          <SearchableCombobox
                            options={dutyPointOptions}
                            value={field.value ? String(field.value) : undefined}
                            onChange={(val) => field.onChange(parseInt(val))}
                            placeholder="Search duty point…"
                            searchPlaceholder="Type point name or location…"
                            emptyText="No duty points found."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Timing */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Timing & Duration</h3>

                <FormField
                  control={form.control}
                  name="dutyType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-bold">Assignment Type</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3 bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30">
                            <FormControl>
                              <RadioGroupItem value={RosterInputDutyType.unlimited} className="text-red-600" />
                            </FormControl>
                            <div className="space-y-1 leading-none w-full">
                              <FormLabel className="font-bold text-red-900 dark:text-red-200">Unlimited Duty</FormLabel>
                              <FormDescription className="text-red-700/70 dark:text-red-300/70">Remains active until manually released by a commander.</FormDescription>
                            </div>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30">
                            <FormControl>
                              <RadioGroupItem value={RosterInputDutyType.fixed} className="text-blue-600" />
                            </FormControl>
                            <div className="space-y-1 leading-none w-full">
                              <FormLabel className="font-bold text-blue-900 dark:text-blue-200">Fixed Duration</FormLabel>
                              <FormDescription className="text-blue-700/70 dark:text-blue-300/70">Automatically expires at a specific date and time.</FormDescription>
                            </div>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="startDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {dutyType === RosterInputDutyType.fixed && (
                    <FormField
                      control={form.control}
                      name="endDateTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">End Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} className="bg-background border-blue-200 dark:border-blue-900/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Special Instructions / Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any equipment required, specific threats to watch for, etc..." className="resize-none h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setLocation("/")}>Cancel</Button>
                <Button type="submit" size="lg" className="px-8 font-bold" disabled={assignMutation.isPending}>
                  {assignMutation.isPending ? "Deploying..." : "Deploy Personnel"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
