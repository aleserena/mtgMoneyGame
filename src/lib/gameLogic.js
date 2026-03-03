function validateAndApplyCard(remaining, card, usedIds) {
  if (usedIds.has(card.id)) {
    return { valid: false, reason: "Card already used" };
  }

  const roundedPrice = Math.round(card.price);
  if (roundedPrice <= 0) {
    return { valid: false, reason: "Card has no valid price" };
  }
  const newRemaining = remaining - roundedPrice;

  if (newRemaining < 0) {
    return {
      valid: false,
      reason: "Card price exceeds remaining amount - you lose your turn",
    };
  }

  const winner = newRemaining === 0;

  return {
    valid: true,
    newRemaining,
    roundedPrice,
    winner,
  };
}

module.exports = { validateAndApplyCard };
