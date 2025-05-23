import { useEffect, useRef } from 'react';
import './App.css';
import useGameStore, { ClientCard } from './game/store'; // Assuming ClientCard is exported from store
import { io, Socket } from 'socket.io-client';

// Helper functions for card display
const getSuitSymbol = (suit: string): string => {
  switch (suit) {
    case 'Spades': return '♠';
    case 'Hearts': return '♥';
    case 'Diamonds': return '♦';
    case 'Clubs': return '♣';
    default: return ''; // Joker or unknown
  }
};

const getSuitColor = (suit: string): string => {
  if (suit === 'Hearts' || suit === 'Diamonds') {
    return 'red';
  }
  if (suit === 'Joker') {
    return 'purple';
  }
  return 'black';
};


function App() {
  const socketRef = useRef<Socket | null>(null);

  const { 
    socketId, playerId, myPlayerName, gamePhase, currentRound, maxRounds, 
    currentPlayerId, isMyTurn, playerHand, otherPlayers, deckSize, 
    discardPileSize, gameMessage, roundOverData, gameOverData,
    // Actions from store
    setSocketConnected, setInitialPlayerInfo, setGameFull, setGameReset,
    updatePlayerList, setGameStateUpdate, setDrawPhaseProcessed,
    setRoundOver, setGameOver, clearMessage, selectCardToggle
  } = useGameStore(state => ({
    socketId: state.socketId,
    playerId: state.playerId,
    myPlayerName: state.myPlayerName,
    gamePhase: state.gamePhase,
    currentRound: state.currentRound,
    maxRounds: state.maxRounds,
    currentPlayerId: state.currentPlayerId,
    isMyTurn: state.isMyTurn,
    playerHand: state.playerHand,
    otherPlayers: state.otherPlayers,
    deckSize: state.deckSize,
    discardPileSize: state.discardPileSize,
    gameMessage: state.gameMessage,
    roundOverData: state.roundOverData,
    gameOverData: state.gameOverData,
    // Actions
    setSocketConnected: useGameStore.getState().setSocketConnected,
    setInitialPlayerInfo: useGameStore.getState().setInitialPlayerInfo,
    setGameFull: useGameStore.getState().setGameFull,
    setGameReset: useGameStore.getState().setGameReset,
    updatePlayerList: useGameStore.getState().updatePlayerList,
    setGameStateUpdate: useGameStore.getState().setGameStateUpdate,
    setDrawPhaseProcessed: useGameStore.getState().setDrawPhaseProcessed,
    setRoundOver: useGameStore.getState().setRoundOver,
    setGameOver: useGameStore.getState().setGameOver,
    clearMessage: useGameStore.getState().clearMessage,
    selectCardToggle: useGameStore.getState().selectCardToggle,
  }));

  // Memoize allPlayers to avoid re-calculating on every render if possible
  // This is a simple example; for complex states, consider useMemo more carefully.
  const allPlayers = useMemo(() => {
    const self = playerId && myPlayerName ? [{ id: playerId, name: myPlayerName, score: otherPlayers.find(p => p.id === playerId)?.score ?? 0, cardCount: playerHand.length, hasCompletedDrawPhase: useGameStore.getState().playerHand.length > 0 ? useGameStore.getState().isMyTurn === false && gamePhase === 'RoundInProgress_DrawPhase' : false, isGameWinner: gameOverData?.winners.some(w => w.id === playerId) }] : [];
    return [...otherPlayers, ...self.filter(s => !otherPlayers.find(op => op.id === s.id))];
  }, [otherPlayers, playerId, myPlayerName, playerHand.length, isMyTurn, gamePhase, gameOverData]);


  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    socketRef.current = newSocket;

    newSocket.on('connect', () => { setSocketConnected(newSocket.id || 'NO_ID_RECEIVED'); }); // Ensure newSocket.id is not null
    newSocket.on('playerSuccessfullyJoined', (data) => { 
      setInitialPlayerInfo(data.playerId, data.playerName); 
      updatePlayerList(data.initialPlayers); 
    });
    newSocket.on('updatePlayerList', (players) => { updatePlayerList(players); });
    newSocket.on('gameFullOrInProgress', (data) => { 
      setGameFull(); 
      useGameStore.getState().setGameMessage({type: 'error', text: data.message }); 
    });
    newSocket.on('gameResetDueToDisconnect', (data) => { 
      setGameReset(); 
      useGameStore.getState().setGameMessage({type: 'info', text: data.message }); 
    });
    newSocket.on('gameStarted_YourHand', (data) => { setGameStateUpdate(data); });
    newSocket.on('drawActionProcessed', (data) => { setDrawPhaseProcessed(data); });
    newSocket.on('transitionToShowdown', (data) => { 
      setGameStateUpdate({ 
        gamePhase: data.gamePhase, 
        playersInfo: data.playersPublicInfo 
      }); 
    });
    newSocket.on('nextPlayerForDraw', (data) => { 
      // Ensure currentPlayerId is directly updated from data.currentPlayerId if available, or derive from name
      const updatePayload: any = { gamePhase: data.gamePhase, playersInfo: data.playersPublicInfo };
      if (data.currentPlayerId) {
        updatePayload.currentPlayerId = data.currentPlayerId;
      } else if (data.currentPlayerName && data.playersPublicInfo) {
        // Fallback: try to find ID from name in playersPublicInfo
        const nextPlayer = data.playersPublicInfo.find((p:any) => p.name === data.currentPlayerName);
        if (nextPlayer) updatePayload.currentPlayerId = nextPlayer.id;
      }
      setGameStateUpdate(updatePayload); 
    });
    newSocket.on('roundOver_Results', (data) => { setRoundOver(data); });
    newSocket.on('newRoundStarted_YourHand', (data) => { setGameStateUpdate(data); });
    newSocket.on('gameOver_FinalResults', (data) => { setGameOver(data); });
    newSocket.on('disconnect', () => { 
      useGameStore.getState().setGameMessage({type: 'error', text: 'Disconnected from server.'}); 
      // Do not call setGamePhase directly on the store object, use an action if available
      // For now, we'll rely on setGameMessage, or a dedicated action like setDisconnectedPhase
      useGameStore.getState().setGameStateUpdate({ gamePhase: 'Disconnected' });
    });
    newSocket.on('actionError', (data) => { 
      useGameStore.getState().setGameMessage({type: 'error', text: data.message }); 
    });

    return () => { newSocket.disconnect(); };
  }, [setSocketConnected, setInitialPlayerInfo, updatePlayerList, setGameFull, setGameReset, setGameStateUpdate, setDrawPhaseProcessed, setRoundOver, setGameOver]);

  const handleDiscard = () => {
    if (!socketRef.current || !isMyTurn || gamePhase !== 'RoundInProgress_DrawPhase') return;
    const indicesToDiscard = playerHand
      .map((cardState, index) => cardState.selected ? index : -1)
      .filter(index => index !== -1);
    socketRef.current.emit('playerDiscardRequest', { cardsToDiscardIndices: indicesToDiscard });
  };

  // Basic UI structure - will be filled in with actual state and components
  return (
    <div className="app-container">
      {/* Game Info Panel */}
      <div className="game-info-panel">
        <h2>Game Information</h2>
        <div>Socket ID: {socketId}</div>
        <div>Player ID: {playerId}</div>
        <div>My Name: {myPlayerName}</div>
        <div>Game Phase: {gamePhase}</div>
        <div>Round: {currentRound} / {maxRounds}</div>
        <div>Current Turn: { (allPlayers.find(p => p.id === currentPlayerId) || {name: 'N/A'}).name }</div>
        <div>Deck: {deckSize} | Discard: {discardPileSize}</div>
      </div>

      {/* Game Message */}
      {gameMessage && (
        <div className={`game-message ${gameMessage.type}`}>
          {gameMessage.text}
          <button onClick={clearMessage}>X</button>
        </div>
      )}

      {/* Opponents Area */}
      <div className="opponents-area">
        <h2>Opponents</h2>
        {otherPlayers.map(op => (
          <div key={op.id} className={op.id === currentPlayerId ? 'current-turn-highlight' : ''}>
            {op.name} (Score: {op.score}) - Cards: {op.cardCount} - {op.hasCompletedDrawPhase ? 'Draw Done' : 'Drawing...'}
            {op.isGameWinner && <span> - GAME WINNER!</span>}
          </div>
        ))}
      </div>
      
      {/* Player Area (My Hand) */}
      <div className="player-area">
        <h2>Your Hand ({myPlayerName} - Score: {allPlayers.find(p=>p.id===playerId)?.score || 0})</h2>
        <div className="card-display-area">
          {playerHand.map((cardState) => (
            <div 
              key={cardState.card.id}
              className={`card ${cardState.selected ? 'selected' : ''} ${cardState.card.isWild ? 'joker' : ''}`}
              onClick={() => selectCardToggle(cardState.card.id)}
              style={{ color: getSuitColor(cardState.card.suit) }}
            >
              <span className="rank">{cardState.card.rank === 'Joker' && cardState.card.isWild ? '' : cardState.card.rank}</span>
              <span className="suit">{getSuitSymbol(cardState.card.suit)}</span>
              {cardState.card.isWild && <div className="joker-text">JOKER</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons / Status Messages */}
      <div className="action-area">
        {isMyTurn && gamePhase === 'RoundInProgress_DrawPhase' && (
          <>
            <div>Your turn to discard. Select cards and click 'Discard Selected'.</div>
            <button onClick={handleDiscard} className="discard-button">Discard Selected</button>
          </>
        )}
        {!isMyTurn && gamePhase === 'RoundInProgress_DrawPhase' && currentPlayerId && (
          <div>Waiting for {(allPlayers.find(p=>p.id === currentPlayerId) || {name: 'player'}).name}...</div>
        )}
      </div>

      {/* Round Results */}
      {roundOverData && (
        <div className="results-panel">
          <h3>Round {roundOverData.roundNumber} Results</h3>
          {roundOverData.results.map((r: any) => (
            <div key={r.playerId}>
              <p>{r.playerName}: {r.handName} (Score: {r.handStrengthScore}) {r.isRoundWinner ? "🏆" : ""}</p>
              <p className="text-xs">Contributing Ranks: {r.contributingRanks.join(', ')}</p>
              <p className="text-xs">Player Total Score: {r.currentPlayerScore}</p>
              <div className="card-display-area" style={{marginBottom: '10px'}}>
                {r.hand.map((card: ClientCard) => (
                   <div key={card.id} className={`card small ${card.isWild ? 'joker' : ''}`} style={{ color: getSuitColor(card.suit) }}>
                     <span className="rank">{card.rank === 'Joker' && card.isWild ? '' : card.rank}</span>
                     <span className="suit">{getSuitSymbol(card.suit)}</span>
                     {card.isWild && <div className="joker-text">JOKER</div>}
                   </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Game Over Display */}
      {gameOverData && (
        <div className="results-panel">
          <h2>{gameOverData.message}</h2>
          {gameOverData.players.map((p: any) => (
            <div key={p.id}>
              {p.name}: {p.finalScore} points {p.isGameWinner ? "🏆 - Overall Winner!" : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
