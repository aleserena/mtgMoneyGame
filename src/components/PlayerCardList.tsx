"use client";

import { CardImagePreview } from "./CardImagePreview";

interface PlayedCard {
  id: string;
  name: string;
  set: string;
  treatment: string;
  price: number;
}

interface PlayerCardListProps {
  cards: PlayedCard[];
  label: string;
}

const TREATMENT_LABELS: Record<string, string> = {
  nonfoil: "Nonfoil",
  foil: "Foil",
  etched: "Etched",
  glossy: "Glossy",
};

export function PlayerCardList({ cards, label }: PlayerCardListProps) {
  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
      <h3 className="font-semibold text-slate-300 mb-2">{label}</h3>
      {cards.length === 0 ? (
        <p className="text-slate-500 text-sm">No cards played yet</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <CardImagePreview key={card.id} cardId={card.id} className="block">
              <li className="flex justify-between items-center text-sm py-1 border-b border-slate-700/50 last:border-0 cursor-default">
                <span className="text-white">
                  {card.name}
                  <span className="text-slate-500 ml-1">({card.set})</span>
                  <span className="text-slate-400 ml-1">
                    — {TREATMENT_LABELS[card.treatment] || card.treatment}
                  </span>
                </span>
                <span className="font-mono text-amber-400">${card.price}</span>
              </li>
            </CardImagePreview>
          ))}
        </ul>
      )}
    </div>
  );
}
