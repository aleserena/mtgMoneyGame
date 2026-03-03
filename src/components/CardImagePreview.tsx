"use client";

import { useState } from "react";

interface CardImagePreviewProps {
  cardId: string;
  children: React.ReactNode;
  className?: string;
}

export function getCardImageUrl(cardId: string): string {
  return `https://api.scryfall.com/cards/${cardId}?format=image&version=normal`;
}

export function CardImagePreview({ cardId, children, className = "" }: CardImagePreviewProps) {
  const [show, setShow] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    const timer = setTimeout(() => setShow(true), 200);
    setHoverTimer(timer);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setHoverTimer(null);
    setShow(false);
  };

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div className="pointer-events-none fixed right-4 top-1/2 z-[100] -translate-y-1/2">
          <img
            src={getCardImageUrl(cardId)}
            alt="Card preview"
            className="h-auto w-56 rounded-lg border-2 border-slate-600 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
