"use client";

interface TreatmentPickerProps {
  finishes: string[];
  selected: string;
  onSelect: (treatment: string) => void;
}

const LABELS: Record<string, string> = {
  nonfoil: "Nonfoil",
  foil: "Foil",
  etched: "Etched",
  glossy: "Glossy",
};

export function TreatmentPicker({ finishes, selected, onSelect }: TreatmentPickerProps) {
  const available = finishes.length > 0 ? finishes : ["nonfoil"];

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onSelect(f)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            selected === f
              ? "bg-amber-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          {LABELS[f] || f}
        </button>
      ))}
    </div>
  );
}
