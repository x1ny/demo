import { create } from 'zustand'

interface Card {
  id: string;
  name: string;
  description: string;
  attack: number;
}

interface GameState {
  playerHand: {
    selected: boolean
    card: Card
  }[];
  neutralZone: Card[];
  selectCard: (card: Card) => void;
}

const useGameStore = create<GameState>()((set) => ({
  playerHand: Array.from({ length: 5 }, (_, i) => ({
    selected: false,
    card: {
      id: i.toString(),
      name: `Card ${i}`,
      description: `Card ${i} description`,
      attack: i,
    },
  })),
  neutralZone: Array.from({ length: 3 }, (_, i) => ({
    id: i.toString(),
    name: `Card ${i}`,
    description: `Card ${i} description`,
    attack: (i + 2) * 2,
  })),
  selectCard: (card: Card) => set((state) => ({
    playerHand: state.playerHand.map((item) => ({
      ...item,
      selected: item.card.id === card.id ? !item.selected : item.selected,
    })),
  })),
}))

export default useGameStore;