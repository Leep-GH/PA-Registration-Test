interface Props {
  registeredCount: number;
  candidateCount: number;
  addedThisMonth: number;
  removedThisMonth: number;
}

export default function StatsBar({ registeredCount, candidateCount, addedThisMonth, removedThisMonth }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard
        label="Immatriculées"
        value={registeredCount}
        colour="text-green-700"
        bgColour="bg-green-50 border-green-200"
      />
      <StatCard
        label="Candidates"
        value={candidateCount}
        colour="text-amber-700"
        bgColour="bg-amber-50 border-amber-200"
      />
      <StatCard
        label="Ajouts (30j)"
        value={addedThisMonth}
        colour="text-blue-700"
        bgColour="bg-blue-50 border-blue-200"
      />
      <StatCard
        label="Retraits (30j)"
        value={removedThisMonth}
        colour="text-red-700"
        bgColour="bg-red-50 border-red-200"
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  colour: string;
  bgColour: string;
}

function StatCard({ label, value, colour, bgColour }: StatCardProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-5 rounded-lg border ${bgColour}`}>
      <span className={`text-3xl font-bold ${colour}`}>{value}</span>
      <span className="mt-1 text-sm text-gray-600">{label}</span>
    </div>
  );
}
