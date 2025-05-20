import { create } from 'zustand'

interface Card {
  id: string;
  name: string;
  description: string;
  attack: number;
}


type Suit = 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

type CommonCard = {
  suit: Suit;
  rank: Rank;
}

interface GameState {
  playerHand: {
    selected: boolean
    card: CommonCard
  }[];
  neutralZone: Card[];
  deck: CommonCard[];
  discardPile: CommonCard[];
  selectCard: (card: CommonCard) => void;
  drawCard: (count: number) => void;
}

const createShuffledDeck = (): CommonCard[] => {
  const suits: Suit[] = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  // 创建完整的牌组
  const deck = suits.flatMap(suit => 
    ranks.map(rank => ({
      suit,
      rank,
    }))
  );
  
  // Fisher-Yates 洗牌算法
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  console.log({ deck });
  
  return deck;
};

const useGameStore = create<GameState>()((set) => ({
  discardPile: [],
  deck: createShuffledDeck(),
  playerHand: [],
  neutralZone: Array.from({ length: 3 }, (_, i) => ({
    id: i.toString(),
    name: `Card ${i}`,
    description: `Card ${i} description`,
    attack: (i + 2) * 2,
  })),
  selectCard: (card: CommonCard) => set((state) => ({
    playerHand: state.playerHand.map((item) => ({
      ...item,
      selected: item.card === card ? !item.selected : item.selected,
    })),
  })),
  drawCard: (count: number) => set((state) => ({
    playerHand: [...state.playerHand, ...state.deck.slice(0, count).map((card) => ({
      card,
      selected: false,
    }))],
    deck: state.deck.slice(count),
  })),
}))

export default useGameStore;