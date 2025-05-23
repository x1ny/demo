import { create } from 'zustand';

// 1. Define ClientCard Type
export type Suit = 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs' | 'Joker';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';

export interface ClientCard {
  suit: Suit;
  rank: Rank;
  isWild: boolean;
  id: string; // e.g., "Spades-A" or "Joker-1"
}

// 2. Update GameState Interface
export interface GameState {
  socketId: string | null;
  playerId: string | null;
  myPlayerName: string | null;
  gamePhase: string | null; // e.g., 'Connecting', 'WaitingForPlayers', 'RoundInProgress_DrawPhase', etc.
  currentRound: number;
  maxRounds: number;
  currentPlayerId: string | null; // Socket ID of the current player
  isMyTurn: boolean;
  playerHand: { selected: boolean; card: ClientCard; }[];
  otherPlayers: { id: string; name: string; score: number; cardCount: number; hasCompletedDrawPhase?: boolean; isGameWinner?: boolean; }[];
  deckSize: number;
  discardPileSize: number;
  gameMessage: { type: 'info' | 'error' | 'success'; text: string; } | null;
  roundOverData: { roundNumber: number; results: any[]; deckSize: number; discardPileSize: number; } | null;
  gameOverData: { message: string; players: any[]; winners: any[]; } | null;

  // Actions
  setSocketConnected: (socketId: string) => void;
  setInitialPlayerInfo: (playerId: string, playerName: string) => void;
  setGameFull: () => void;
  setGameReset: () => void;
  updatePlayerList: (players: any[]) => void;
  setGameStateUpdate: (payload: { 
    gamePhase?: string; 
    currentRound?: number; 
    currentPlayerId?: string; 
    maxRounds?: number; 
    deckSize?: number; 
    discardPileSize?: number; 
    playersInfo?: any[]; 
    hand?: ClientCard[]; 
    isYourTurn?: boolean; 
    currentPlayerName?: string; 
  }) => void;
  setDrawPhaseProcessed: (payload: { 
    newHand: ClientCard[]; 
    gamePhase: string; 
    deckSize: number; 
    discardPileSize: number; 
    playerPublicInfo: any[]; 
  }) => void;
  setRoundOver: (data: any) => void;
  setGameOver: (data: any) => void;
  selectCardToggle: (cardId: string) => void;
  clearMessage: () => void;
}

// Old code like createShuffledDeck and the main store implementation will be replaced next.
const useGameStore = create<GameState>()((set) => ({
  // Initial Values
  socketId: null,
  playerId: null,
  myPlayerName: null,
  gamePhase: 'Connecting', // Initial phase
  currentRound: 0,
  maxRounds: 0, // Will be set by server
  currentPlayerId: null,
  isMyTurn: false,
  playerHand: [],
  otherPlayers: [],
  deckSize: 0,
  discardPileSize: 0,
  gameMessage: null,
  roundOverData: null,
  gameOverData: null,

  // 3. Refine/Add Store Actions for State Updates
  setSocketConnected: (socketId: string) => set({ 
    socketId, 
    gamePhase: 'WaitingForPlayers', 
    gameMessage: { type: 'info', text: 'Connected to server.' } 
  }),
  setInitialPlayerInfo: (playerId: string, playerName: string) => set({ 
    playerId, 
    myPlayerName: playerName 
  }),
  setGameFull: () => set({ 
    gameMessage: { type: 'error', text: 'Game is full or already in progress.' } 
  }),
  setGameReset: () => set(state => ({ 
    ...state, // Keep socketId, playerId, myPlayerName if needed, or reset them if server implies full disconnect/reconnect
    gamePhase: 'WaitingForPlayers', 
    currentRound: 0, 
    playerHand: [], 
    otherPlayers: [], // Reset other players
    roundOverData: null, 
    gameOverData: null, 
    gameMessage: { type: 'info', text: 'Game has been reset. Waiting for players.' }, 
    isMyTurn: false, 
    currentPlayerId: null,
    deckSize: 0, 
    discardPileSize: 0 
  })),
  updatePlayerList: (players: any[]) => set(state => ({ 
    otherPlayers: players.filter(p => p.id !== state.playerId) 
  })),
  setGameStateUpdate: (payload: { 
    gamePhase?: string; 
    currentRound?: number; 
    currentPlayerId?: string; 
    maxRounds?: number; 
    deckSize?: number; 
    discardPileSize?: number; 
    playersInfo?: any[]; 
    hand?: ClientCard[]; 
    isYourTurn?: boolean; 
    currentPlayerName?: string; 
  }) => set(state => {
    const updates: Partial<GameState> = {};
    if (payload.gamePhase) updates.gamePhase = payload.gamePhase;
    if (payload.currentRound !== undefined) updates.currentRound = payload.currentRound;
    
    if (payload.currentPlayerId) { 
      updates.currentPlayerId = payload.currentPlayerId; 
      updates.isMyTurn = payload.currentPlayerId === state.socketId; 
    } else if (payload.currentPlayerName && payload.playersInfo) {
      const currentP = payload.playersInfo.find(p => p.name === payload.currentPlayerName);
      if (currentP) { 
        updates.currentPlayerId = currentP.id; 
        updates.isMyTurn = currentP.id === state.socketId; 
      }
    } else if (payload.currentPlayerName && state.otherPlayers && state.myPlayerName && state.playerId) { 
        const allPlayersTemp = [...state.otherPlayers, {id: state.playerId, name: state.myPlayerName, score:0, cardCount:0}];
        const currentP = allPlayersTemp.find(p => p.name === payload.currentPlayerName);
        if (currentP) {
            updates.currentPlayerId = currentP.id;
            updates.isMyTurn = currentP.id === state.socketId;
        }
    }

    if (payload.maxRounds) updates.maxRounds = payload.maxRounds;
    if (payload.deckSize !== undefined) updates.deckSize = payload.deckSize;
    if (payload.discardPileSize !== undefined) updates.discardPileSize = payload.discardPileSize;
    
    if (payload.playersInfo) {
      updates.otherPlayers = payload.playersInfo.filter(p => p.id !== state.playerId);
      // const myInfo = payload.playersInfo.find(p => p.id === state.playerId);
      // if (myInfo) { /* Update my own specific fields if needed from playersInfo */ }
    }
    
    if (payload.hand) updates.playerHand = payload.hand.map(card => ({ card, selected: false }));
    if (payload.isYourTurn !== undefined) updates.isMyTurn = payload.isYourTurn;

    return { ...state, ...updates };
  }),
  setDrawPhaseProcessed: (payload: { 
    newHand: ClientCard[]; 
    gamePhase: string; 
    deckSize: number; 
    discardPileSize: number; 
    playerPublicInfo: any[]; // Server sends array of all players with updated public info
  }) => set(state => {
    const newOtherPlayers = payload.playerPublicInfo.filter(p => p.id !== state.playerId);
    const myUpdatedInfo = payload.playerPublicInfo.find(p => p.id === state.playerId);
    const newPlayerHand = myUpdatedInfo ? payload.newHand.map(card => ({ card, selected: false })) : state.playerHand;

    return {
      playerHand: newPlayerHand,
      // gamePhase: payload.gamePhase, // This might be updated by a subsequent gameStateUpdate
      deckSize: payload.deckSize,
      discardPileSize: payload.discardPileSize,
      otherPlayers: newOtherPlayers,
      isMyTurn: false, 
      gameMessage: { type: 'success', text: 'Cards discarded and new cards drawn.' }
    };
  }),
  setRoundOver: (data: any) => set({ 
    roundOverData: data, 
    gamePhase: 'RoundOver', 
    gameMessage: { type: 'info', text: `Round ${data.roundNumber} ended.` } 
  }),
  setGameOver: (data: any) => set({ 
    gameOverData: data, 
    gamePhase: 'GameOver', 
    gameMessage: {type: 'info', text: data.message || 'Game Over!'} 
  }),
  selectCardToggle: (cardId: string) => set(state => ({ 
    playerHand: state.playerHand.map(c => c.card.id === cardId ? { ...c, selected: !c.selected } : c) 
  })),
  clearMessage: () => set({ gameMessage: null }),
}));

export default useGameStore;
// Removed old createShuffledDeck and related logic as deck is server-managed.
// Removed old Card interface if it was different.
// Removed neutralZone, deck, discardPile (arrays of cards) from state.
// Removed drawCard action.