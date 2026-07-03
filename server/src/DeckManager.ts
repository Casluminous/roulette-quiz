import { v4 as uuidv4 } from 'uuid';
import { Card, CardType, TableType } from './types';

const CARD_COUNTS: Record<CardType, number> = {
  king: 6,
  queen: 6,
  ace: 6,
  joker: 2,
  devil: 1,
};

export class DeckManager {
  createDeck(): Card[] {
    const deck: Card[] = [];
    for (const [type, count] of Object.entries(CARD_COUNTS)) {
      for (let i = 0; i < count; i++) {
        deck.push({
          id: uuidv4(),
          type: type as CardType,
        });
      }
    }
    return deck;
  }

  shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  dealCards(deck: Card[], count: number): { cards: Card[]; remaining: Card[] } {
    const cards = deck.slice(0, count);
    const remaining = deck.slice(count);
    return { cards, remaining };
  }

  pickTableType(): TableType {
    const types: TableType[] = ['king', 'queen', 'ace'];
    return types[Math.floor(Math.random() * types.length)];
  }

  markDevilCard(cards: Card[]): Card[] {
    return cards.map(card => {
      if (card.type === 'devil') {
        return { ...card, isDevil: true };
      }
      return card;
    });
  }

  createRoundDeck(playerCount: number): { deck: Card[]; tableType: TableType } {
    const deck = this.shuffleDeck(this.createDeck());
    const tableType = this.pickTableType();
    return { deck, tableType };
  }
}
