export interface CardWithPrice {
  id: string;
  price: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  newRemaining?: number;
  roundedPrice?: number;
  winner?: boolean;
  cardName?: string;
  setName?: string;
}

export function validateAndApplyCard(
  remaining: number,
  card: CardWithPrice,
  usedIds: Set<string>
): ValidationResult {
  if (usedIds.has(card.id)) {
    return { valid: false, reason: "Card already used" };
  }

  const roundedPrice = Math.round(card.price);
  if (roundedPrice <= 0) {
    return { valid: false, reason: "Card has no valid price" };
  }
  const newRemaining = remaining - roundedPrice;

  if (newRemaining < 0) {
    return { valid: false, reason: "Card price exceeds remaining amount - you lose your turn" };
  }

  const winner = newRemaining === 0;

  return {
    valid: true,
    newRemaining,
    roundedPrice,
    winner,
  };
}
