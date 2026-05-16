import { PersonnelRank } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

export function RankBadge({ rank }: { rank: string }) {
  let colorClass = "bg-gray-100 text-gray-800 border-gray-200";
  
  switch (rank) {
    case PersonnelRank.Constable:
      colorClass = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100";
      break;
    case PersonnelRank.Head_Constable:
      colorClass = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200";
      break;
    case PersonnelRank["Sub-Inspector"]:
      colorClass = "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200";
      break;
    case PersonnelRank.Inspector:
      colorClass = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200";
      break;
  }

  return (
    <Badge variant="outline" className={`font-semibold px-2 py-0.5 whitespace-nowrap ${colorClass}`}>
      {rank}
    </Badge>
  );
}
