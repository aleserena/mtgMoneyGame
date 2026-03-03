"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TreatmentPicker } from "./TreatmentPicker";
import { CardImagePreview } from "./CardImagePreview";

interface PrintingInfo {
  id: string;
  name: string;
  set_name: string;
  set: string;
  collector_number?: string;
  finishes: string[];
  frame_effects?: string[];
  promo?: boolean;
  promo_types?: string[];
}

function formatPrintingLabel(p: PrintingInfo): string {
  const parts: string[] = [];
  parts.push(p.set_name);
  if (p.set) parts.push(`(${p.set})`);
  if (p.collector_number) parts.push(`#${p.collector_number}`);
  if (p.frame_effects?.length) {
    const effects = p.frame_effects.map((e) => e.replace(/_/g, " ")).join(", ");
    parts.push(`[${effects}]`);
  }
  if (p.promo_types?.length) {
    parts.push(`— ${p.promo_types.join(", ")}`);
  } else if (p.promo) {
    parts.push("— Promo");
  }
  const finishes = (p.finishes || ["nonfoil"])
    .map((f) => f.charAt(0).toUpperCase() + f.slice(1))
    .join("/");
  parts.push(`— ${finishes}`);
  return parts.join(" ");
}

interface CardSearchProps {
  onSelect: (cardId: string, treatment: string) => void;
  disabled?: boolean;
}

export function CardSearch({ onSelect, disabled }: CardSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [printings, setPrintings] = useState<PrintingInfo[]>([]);
  const [setFilter, setSetFilter] = useState<string>("");
  const [selectedPrinting, setSelectedPrinting] = useState<PrintingInfo | null>(null);
  const [treatment, setTreatment] = useState("nonfoil");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAutocomplete = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/scryfall/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchAutocomplete]);

  const fetchPrintings = useCallback(async (name: string) => {
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/scryfall/search?q=${encodeURIComponent(name)}`);
      const data = await res.json();
      setPrintings(Array.isArray(data) ? data : []);
      setSetFilter("");
      setSelectedPrinting(null);
      setTreatment("nonfoil");
    } catch {
      setPrintings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSuggestionClick = (name: string) => {
    setQuery("");
    setSuggestions([]);
    fetchPrintings(name);
  };

  const handleConfirm = () => {
    if (selectedPrinting) {
      const finishes = selectedPrinting.finishes?.length ? selectedPrinting.finishes : ["nonfoil"];
      const finalTreatment = finishes.includes(treatment) ? treatment : finishes[0];
      onSelect(selectedPrinting.id, finalTreatment);
      setSelectedPrinting(null);
      setPrintings([]);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && fetchAutocomplete(query)}
        placeholder="Search for a card..."
        disabled={disabled}
        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />

      {suggestions.length > 0 && !selectedPrinting && (
        <ul className="mt-1 w-full max-h-48 overflow-y-auto rounded-lg bg-slate-800 border border-slate-600 shadow-lg">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => handleSuggestionClick(name)}
                className="w-full px-4 py-2 text-left hover:bg-slate-700 text-white"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {printings.length > 0 && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Filter by set</label>
            <select
              value={setFilter}
              onChange={(e) => {
                setSetFilter(e.target.value);
                setSelectedPrinting(null);
              }}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All sets</option>
              {Array.from(
                new Map(printings.map((p) => [p.set, { name: p.set_name, code: p.set }])).values()
              )
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
            </select>
          </div>
          <p className="text-sm text-slate-400">Select a printing (no prices shown):</p>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {(() => {
              const filtered = setFilter
                ? printings.filter((p) => p.set_name === setFilter)
                : printings;
              return filtered.length === 0 ? (
                <p className="text-slate-500 text-sm py-2">No printings match the selected set.</p>
              ) : (
                filtered.map((p) => (
                  <CardImagePreview key={p.id} cardId={p.id} className="block">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPrinting(p);
                        const validFinishes = p.finishes?.length ? p.finishes : ["nonfoil"];
                        setTreatment(validFinishes.includes(treatment) ? treatment : validFinishes[0]);
                      }}
                      className={`w-full px-4 py-2 rounded-lg text-left transition-colors ${
                        selectedPrinting?.id === p.id
                          ? "bg-amber-600/30 border border-amber-500"
                          : "bg-slate-800 border border-slate-600 hover:bg-slate-700"
                      }`}
                    >
                      <span className="font-medium text-white">{p.name}</span>
                      <span className="text-slate-400 text-sm ml-2">
                        — {formatPrintingLabel(p)}
                      </span>
                    </button>
                  </CardImagePreview>
                ))
              );
            })()}
          </div>

          {selectedPrinting && (
            <CardImagePreview cardId={selectedPrinting.id} className="block pt-2 border-t border-slate-600">
            <div>
              <p className="text-sm text-slate-400 mb-2">Select treatment:</p>
              <TreatmentPicker
                finishes={selectedPrinting.finishes || ["nonfoil"]}
                selected={treatment}
                onSelect={setTreatment}
              />
              <button
                type="button"
                onClick={handleConfirm}
                disabled={disabled}
                className="mt-3 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium"
              >
                Play this card
              </button>
            </div>
            </CardImagePreview>
          )}
        </div>
      )}

      {loading && (
        <p className="mt-2 text-sm text-slate-500">Loading...</p>
      )}
    </div>
  );
}
