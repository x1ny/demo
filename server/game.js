// Hand Ranking Constants
const HAND_TYPES = {
  FIVE_OF_A_KIND: 'Five of a Kind',
  ROYAL_FLUSH: 'Royal Flush',
  STRAIGHT_FLUSH: 'Straight Flush',
  FOUR_OF_A_KIND: 'Four of a Kind',
  FULL_HOUSE: 'Full House',
  FLUSH: 'Flush',
  STRAIGHT: 'Straight',
  THREE_OF_A_KIND: 'Three of a Kind',
  TWO_PAIR: 'Two Pair',
  ONE_PAIR: 'One Pair',
  HIGH_CARD: 'High Card',
};

const HAND_SCORES = {
  [HAND_TYPES.FIVE_OF_A_KIND]: 100,
  [HAND_TYPES.ROYAL_FLUSH]: 90,
  [HAND_TYPES.STRAIGHT_FLUSH]: 80,
  [HAND_TYPES.FOUR_OF_A_KIND]: 70,
  [HAND_TYPES.FULL_HOUSE]: 60,
  [HAND_TYPES.FLUSH]: 50,
  [HAND_TYPES.STRAIGHT]: 40,
  [HAND_TYPES.THREE_OF_A_KIND]: 30,
  [HAND_TYPES.TWO_PAIR]: 20,
  [HAND_TYPES.ONE_PAIR]: 10,
  [HAND_TYPES.HIGH_CARD]: 0,
};

// Card Definition
/**
 * @typedef {'Spades' | 'Hearts' | 'Diamonds' | 'Clubs' | 'Joker'} Suit
 */

/**
 * @typedef {'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker'} Rank
 */

/**
 * @typedef {object} Card
 * @property {Suit} suit
 * @property {Rank} rank
 * @property {boolean} isWild
 * @property {string} id
 */

// Deck Creation Function
/**
 * Creates a standard 52-card deck plus 2 Jokers.
 * @returns {Card[]} Array of Card objects.
 */
function createDeck() {
  const suits = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit: /** @type {Suit} */ (suit),
        rank: /** @type {Rank} */ (rank),
        isWild: false,
        id: `${suit}-${rank}`
      });
    }
  }

  // Add Jokers
  deck.push({ suit: 'Joker', rank: 'Joker', isWild: true, id: 'Joker-1' });
  deck.push({ suit: 'Joker', rank: 'Joker', isWild: true, id: 'Joker-2' });

  return deck;
}

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 * @param {Card[]} deck The deck to shuffle.
 * @returns {Card[]} A new array with the shuffled cards.
 */
function shuffleDeck(deck) {
  const shuffledDeck = [...deck];
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
  }
  return shuffledDeck;
}

/**
 * Deals 5 cards to each player from the deck.
 * @param {Player[]} players - Array of player objects.
 * @param {Card[]} deck - The deck of cards to deal from.
 */
function dealInitialHands(players, deck) {
  for (const player of players) {
    player.hand = []; // Ensure hand is empty before dealing
    for (let i = 0; i < 5; i++) {
      if (deck.length > 0) {
        player.hand.push(deck.pop()); // Deal one card
      } else {
        console.warn("Deck ran out of cards while dealing initial hands.");
        break; 
      }
    }
  }
  // players and deck arrays are mutated directly
}

/**
 * Converts card rank to a numerical value.
 * Ace is 14, King 13, ..., 2 is 2.
 * For A-5 straights, Ace can be 1, handled by straight checking logic.
 * Jokers are not handled by this function.
 * @param {Rank} rank
 * @returns {number}
 */
function getRankValue(rank) {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  if (rank >= '2' && rank <= '9') return parseInt(rank, 10);
  if (rank === '10') return 10; // parseInt('10', 10) is 10, but explicit for clarity
  return 0; // Should not happen for valid Ranks
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkFiveOfAKind(hand) {
  const rankCounts = {};
  let numJokers = 0;
  const actualCardRanks = [];

  for (const card of hand) {
    if (card.isWild) {
      numJokers++;
    } else {
      const rankValue = getRankValue(card.rank);
      rankCounts[rankValue] = (rankCounts[rankValue] || 0) + 1;
      actualCardRanks.push(rankValue);
    }
  }

  // Sort unique actual card ranks to check from highest
  const uniqueSortedRanks = [...new Set(actualCardRanks)].sort((a, b) => b - a);

  for (const rankValue of uniqueSortedRanks) {
    if ((rankCounts[rankValue] || 0) + numJokers >= 5) {
      return { isMatch: true, ranks: [rankValue] }; // Only one rank matters for 5 of a kind
    }
  }
  // Case: 5 Jokers (or 4 jokers + 1 card, 3 jokers + 2 cards etc.)
  // If all cards are jokers, it's 5 of a kind of Aces (highest possible)
  if (numJokers === 5) {
      return { isMatch: true, ranks: [getRankValue('A')] };
  }
  // If there are jokers, and no single rank can make 5 of a kind, but there are cards
  // e.g. [Joker, Joker, K, K, K] -> Five Kings
  // This is covered by the loop above.
  // What if it's [Joker, Joker, Joker, K, Q]? -> Five Kings (using first card as base)
  // The logic should prioritize the highest existing card rank to form 5 of a kind
  if (numJokers > 0 && actualCardRanks.length > 0) {
      // Try to make 5 of a kind with the highest card present
      const highestRank = Math.max(...actualCardRanks);
      if ((rankCounts[highestRank] || 0) + numJokers >= 5) {
           return { isMatch: true, ranks: [highestRank] };
      }
  }


  return null;
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkTwoPair(hand) {
  const rankCounts = {};
  let numJokers = 0;
  const actualCardRanks = [];

  for (const card of hand) {
    if (card.isWild) {
      numJokers++;
    } else {
      const rankValue = getRankValue(card.rank);
      rankCounts[rankValue] = (rankCounts[rankValue] || 0) + 1;
      actualCardRanks.push(rankValue);
    }
  }

  const uniqueSortedRanks = [...new Set(actualCardRanks)].sort((a, b) => b - a);
  const pairsFound = []; // Stores the ranks of the pairs

  // Find pairs from actual cards first
  for (const rankValue of uniqueSortedRanks) {
    if (rankCounts[rankValue] >= 2) {
      pairsFound.push(rankValue);
    }
  }

  // If we already have two distinct pairs from actual cards
  if (pairsFound.length >= 2) {
    const sortedPairs = pairsFound.sort((a, b) => b - a);
    const highestPair = sortedPairs[0];
    const secondHighestPair = sortedPairs[1];
    let kicker = 0;
    const cardsNotInPairs = actualCardRanks.filter(r => r !== highestPair && r !== secondHighestPair);
    if (cardsNotInPairs.length > 0) {
      kicker = Math.max(...cardsNotInPairs);
    } else if (numJokers > 0) { // All actual cards formed the two pairs, kicker is a joker
      kicker = getRankValue('A');
      while (kicker === highestPair || kicker === secondHighestPair) kicker--;
    } else {
        // This implies 5 cards, 2 pairs and the 5th card was part of one pair (e.g. K K Q Q K - full house)
        // or K K Q Q A - no jokers, kicker A. This is caught by cardsNotInPairs.length > 0
        // This path should be unlikely if previous checks (Full House) were done.
    }
     if (kicker === 0 && actualCardRanks.length === 5 && new Set(actualCardRanks).size === 2){
        // e.g. K K K Q Q (Full House) or K K Q Q Q (Full House)
        // This means all 5 cards are part of the two pairs, which is a full house.
        return null;
    }
    if (kicker === 0 && numJokers === 0 && actualCardRanks.length === 4 && new Set(actualCardRanks).size === 2) {
        // K K Q Q and no 5th card (and no jokers). This is not a 5 card hand.
        // This check function assumes a 5 card hand.
        // If it was K K Q Q JOKER, numJokers > 0 path is taken.
    }


    return { isMatch: true, ranks: [highestPair, secondHighestPair, kicker].sort((a,b)=>b-a) };
  }

  // If one actual pair is found, try to make another with remaining cards and jokers
  if (pairsFound.length === 1) {
    const firstPairRank = pairsFound[0];
    let jokersAvailable = numJokers;
    const remainingActualRanks = uniqueSortedRanks.filter(r => r !== firstPairRank);
    
    // Try to make a second pair from remaining actual cards + jokers
    for (const potentialSecondPairRank of remainingActualRanks) {
      if ((rankCounts[potentialSecondPairRank] || 0) + jokersAvailable >= 2) {
        const secondPairRank = potentialSecondPairRank;
        const jokersUsedForSecondPair = Math.max(0, 2 - (rankCounts[secondPairRank] || 0));
        let remainingJokersForKicker = jokersAvailable - jokersUsedForSecondPair;
        
        let kicker = 0;
        const cardsNotInPairs = actualCardRanks.filter(r => r !== firstPairRank && r !== secondPairRank);
        if (cardsNotInPairs.length > 0) {
          kicker = Math.max(...cardsNotInPairs);
        } else if (remainingJokersForKicker > 0) {
          kicker = getRankValue('A');
          while (kicker === firstPairRank || kicker === secondPairRank) kicker--;
        }
        return { isMatch: true, ranks: [firstPairRank, secondPairRank, kicker].sort((a,b)=>b-a) };
      }
    }
    // If no second actual pair can be formed, but we have enough jokers to form a new pair
    if (jokersAvailable >= 2 && remainingActualRanks.length === 0) { // One actual pair, rest are jokers
        // e.g. K K J J J. First pair K. Jokers make 2nd pair (Aces). Kicker (King if Aces, else Ace).
        const secondPairRank = (firstPairRank === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
        let kicker = 0;
        // Kicker must be different from firstPairRank and secondPairRank
        // One joker left from the 3 after making 2nd pair.
        if (jokersAvailable - 2 >= 1) { // jokersAvailable was numJokers.
             kicker = getRankValue('A');
             while(kicker === firstPairRank || kicker === secondPairRank) kicker--;
             if (kicker < 2 && firstPairRank === getRankValue('A') && secondPairRank === getRankValue('K')) kicker = getRankValue('Q');
             else if (kicker < 2) kicker = getRankValue('K'); // fallback
        } else { // No jokers left for kicker, must be an actual card not in pairs. But remainingActualRanks is empty.
            // This implies a hand like K, K, J, J. (4 cards) or K, K, Q, J, J (K,K and Q,Q with Q as kicker?)
            // If hand is K K J J J -> K K A A J -> J is Ace. Kicker is Q.
            // firstPairRank = K. secondPairRank = A. remainingJokersForKicker = 1.
            // kicker = Q. Ranks: K,A,Q
             kicker = getRankValue('A'); // Default, adjust if needed
             while(kicker === firstPairRank || kicker === secondPairRank) kicker--;
             if (kicker < 2) { // e.g. A, K are pairs
                kicker = getRankValue('Q');
             }
        }
        return { isMatch: true, ranks: [firstPairRank, secondPairRank, kicker].sort((a,b)=>b-a) };
    } else if (jokersAvailable >= 2 && remainingActualRanks.length > 0) {
        // One actual pair (e.g. K,K), other actual cards (e.g. Q), and jokers (e.g. J,J)
        // K,K, Q, J, J -> Pairs K,K and A,A (from J,J). Kicker Q.
        const secondPairRank = (firstPairRank === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
        let kicker = 0;
        if (remainingActualRanks.includes(secondPairRank)) { // Joker pair rank matches an existing card.
            // e.g. K K A J J. Pair K. Joker pair is A. Kicker is the actual A.
            // This scenario is complex. It might be simpler: if one actual pair, use jokers to make highest other pair.
        }
        kicker = Math.max(...remainingActualRanks.filter(r => r !== secondPairRank));
        if (!kicker && (jokersAvailable-2 >=1) ) {
             kicker = getRankValue('A');
             while(kicker === firstPairRank || kicker === secondPairRank) kicker--;
        } else if (!kicker) { // No actual kicker, no jokers for kicker
            // This implies the 5th card was used to make the joker pair.
            // e.g. K K Q J J. Pair K. Jokers form Pair A. Q is kicker.
            // This is covered by: kicker = Math.max(...remainingActualRanks.filter(r => r !== secondPairRank));
        }
         return { isMatch: true, ranks: [firstPairRank, secondPairRank, kicker].sort((a,b)=>b-a) };
    }
  }

  // No actual pairs, try to form two pairs with jokers
  // Need at least 1 actual card to base the first pair, or 2 jokers for first pair and 2 for second.
  if (numJokers >= 2 && uniqueSortedRanks.length >= 1) { // At least one actual card to make a pair with a joker
    // Option 1: Use one joker for the first pair, one for the second pair
    if (numJokers >= 2 && uniqueSortedRanks.length >= 2) { // K Q J J A -> KK QQ A (K+J, Q+J, A)
      const firstPairRank = uniqueSortedRanks[0]; // Highest actual card for first pair
      const secondPairRank = uniqueSortedRanks[1]; // Second highest for second pair
      let kicker = 0;
      if (uniqueSortedRanks.length >=3) {
          kicker = uniqueSortedRanks[2];
      } else if (numJokers >= 3 || (numJokers >=2 && uniqueSortedRanks.length <=2) ) { // (K Q J J J) or (K J J J A)
          // K Q J J J -> KK QQ J(becomes Ace). Kicker Ace.
          // K A J J J -> KK AA J(becomes Q). Kicker Q.
          kicker = getRankValue('A');
          while(kicker === firstPairRank || kicker === secondPairRank) kicker--;
          if (kicker < 2) kicker = getRankValue('Q'); // Fallback if A,K are pairs
      }
      return { isMatch: true, ranks: [firstPairRank, secondPairRank, kicker].sort((a,b)=>b-a) };
    }
    // Option 2: Use two jokers for one pair (e.g. Aces), and an existing actual pair (or make one)
    // This is covered by "if one actual pair is found" logic if an actual pair exists.
    // If no actual pair, e.g. K Q 10 J J -> Pair Aces (J,J), Kicker K (Q, 10 are lower)
    // This is essentially One Pair logic, not Two Pair.
    // What if hand is K, J, J, J, J? -> Pair Aces (J,J), Kicker K. This is One Pair.
    // (Actually, this would be 3 of a kind Aces with K kicker, or 4 Aces with K kicker etc.)
  }
  
  // Case: Pure Jokers. e.g. J J J J K -> Not two pair, but Four of a Kind.
  // J J J Q K -> Three of a Kind.
  // J J Q K A -> Two Pair: AA (Jokers), KK (K + Joker assumed K), Q kicker? No.
  // If numJokers = 2. Hand: A K Q J J. -> Pair Aces (J,J), Kicker A, K, Q. This is One Pair.
  // This means we make highest possible pair with jokers, then take highest 3 kickers.
  // The logic for one pair should handle this.
  // This function specifically looks for *two distinct pairs*.

  // If only one actual card and >=2 jokers: e.g. K J J Q A. Pair K's (K+J), Pair A's (A+J), Q kicker.
  // This was missed above.
   if (pairsFound.length === 0 && numJokers >= 1 && uniqueSortedRanks.length >=2 ) {
       // Try to make two pairs using one joker for each, or two jokers for one and an actual pair.
       // Iterate through uniqueSortedRanks to be the first pair (using a joker)
       for (let i=0; i < uniqueSortedRanks.length; i++) {
           const firstPairRankAttempt = uniqueSortedRanks[i];
           let jokersLeft = numJokers -1; // Used one for firstPairRankAttempt

           // Try to make second pair from other unique ranks + another joker
           for (let j=0; j < uniqueSortedRanks.length; j++) {
               if (i === j) continue;
               const secondPairRankAttempt = uniqueSortedRanks[j];
               if (jokersLeft >=1) { // Can make second pair with a joker
                   let kicker = 0;
                   const remainingCardsForKicker = uniqueSortedRanks.filter(r => r !== firstPairRankAttempt && r !== secondPairRankAttempt);
                   if (remainingCardsForKicker.length > 0) {
                       kicker = remainingCardsForKicker[0]; // Highest one
                   } else if (jokersLeft >= 2) { // One joker for 2nd pair, one for kicker
                        kicker = getRankValue('A');
                        while(kicker === firstPairRankAttempt || kicker === secondPairRankAttempt) kicker--;
                        if (kicker < 2) kicker = getRankValue('Q');
                   }
                    return { isMatch: true, ranks: [firstPairRankAttempt, secondPairRankAttempt, kicker].sort((a,b)=>b-a) };
               }
           }
           // Could not make a second pair with another actual card + joker.
           // Can we make a second pair purely from remaining jokers? (Need at least 2)
           if (jokersLeft >=2) { // Formed firstPairRankAttempt (actual + joker). Now form second pair from 2 jokers.
               const secondPairRankFromJokers = (firstPairRankAttempt === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
               let kicker = 0;
               const remainingCardsForKicker = uniqueSortedRanks.filter(r => r !== firstPairRankAttempt);
                if (remainingCardsForKicker.length > 0 && remainingCardsForKicker[0] !== secondPairRankFromJokers) {
                     kicker = remainingCardsForKicker[0];
                } else if (jokersLeft >= 3) { // 1 for 1st pair, 2 for 2nd pair, 1 for kicker
                    kicker = getRankValue('A');
                    while(kicker === firstPairRankAttempt || kicker === secondPairRankFromJokers) kicker--;
                    if (kicker < 2 && ( (firstPairRankAttempt === getRankValue('A') && secondPairRankFromJokers === getRankValue('K')) || (firstPairRankAttempt === getRankValue('K') && secondPairRankFromJokers === getRankValue('A')) ) ) {
                        kicker = getRankValue('Q');
                    } else if (kicker < 2) {
                        kicker = getRankValue('J'); // some distinct rank
                    }
                } else if (remainingCardsForKicker.length > 0 && remainingCardsForKicker[0] === secondPairRankFromJokers){
                    // e.g. A, J, J, J, Q. 1st pair A (A+J). 2nd pair K (J+J). Kicker Q.
                    // Here firstPair=A, secondPair=K. Kicker=Q.
                    // remainingCardsForKicker[0] is Q (if A is firstPairAttempt).
                    kicker = remainingCardsForKicker[0];

                }

               return { isMatch: true, ranks: [firstPairRankAttempt, secondPairRankFromJokers, kicker].sort((a,b)=>b-a) };
           }
       }
   }


  return null;
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkThreeOfAKind(hand) {
  const rankCounts = {};
  let numJokers = 0;
  const actualCardRanks = [];

  for (const card of hand) {
    if (card.isWild) {
      numJokers++;
    } else {
      const rankValue = getRankValue(card.rank);
      rankCounts[rankValue] = (rankCounts[rankValue] || 0) + 1;
      actualCardRanks.push(rankValue);
    }
  }

  const uniqueSortedRanks = [...new Set(actualCardRanks)].sort((a, b) => b - a);

  for (const rankValue of uniqueSortedRanks) {
    if ((rankCounts[rankValue] || 0) + numJokers >= 3) {
      // Found three of a kind of rankValue
      const threeOfAKindRank = rankValue;
      const kickers = [];
      
      const cardsNotInThreeOfAKind = actualCardRanks.filter(r => r !== threeOfAKindRank);
      cardsNotInThreeOfAKind.sort((a,b) => b-a);

      for(const kicker of cardsNotInThreeOfAKind) {
          if(kickers.length < 2) kickers.push(kicker);
      }
      
      const jokersUsedForThree = Math.max(0, 3 - (rankCounts[rankValue] || 0));
      let remainingJokers = numJokers - jokersUsedForThree;

      // Fill remaining kicker spots with jokers (as highest cards not part of three of a kind)
      // This logic needs to be careful not to create a Full House or Four of a Kind if those were missed.
      // However, evaluateHand calls in order, so this should be fine.
      let nextHighestKicker = getRankValue('A');
      while (kickers.length < 2 && remainingJokers > 0) {
        // Ensure kicker is not the same as threeOfAKindRank or existing kickers
        while (nextHighestKicker === threeOfAKindRank || kickers.includes(nextHighestKicker)) {
          nextHighestKicker--;
          if (nextHighestKicker < 2) break; // No more ranks available
        }
        if (nextHighestKicker >=2) {
            kickers.push(nextHighestKicker);
            remainingJokers--;
        } else {
            break; // Should not happen if jokers are left
        }
      }
      kickers.sort((a,b) => b-a);
      return { isMatch: true, ranks: [threeOfAKindRank, ...kickers.slice(0,2)].sort((a,b)=>b-a) };
    }
  }

  // Case: All cards are jokers or form 3 of a kind mostly with jokers
  // e.g., J,J,J,K,Q -> Three Aces, K, Q kickers
  // e.g., K,J,J,Q,10 -> Three Ks, Q, 10 kickers
  if (actualCardRanks.length <= 2 && numJokers >= (3 - actualCardRanks.length) && numJokers >=1 ) { // ensure at least one joker is used for the three of a kind potentially
      let threeOfAKindRank = getRankValue('A'); // Default to Ace if no actual cards or many jokers
      const kickers = [];

      if (uniqueSortedRanks.length > 0) {
          threeOfAKindRank = uniqueSortedRanks[0]; // Make the three of a kind from the highest actual card
      }
      
      // Add other actual cards as kickers first
      for(let i = 0; i < uniqueSortedRanks.length; i++) {
          if (uniqueSortedRanks[i] !== threeOfAKindRank && kickers.length < 2) {
              kickers.push(uniqueSortedRanks[i]);
          } else if (uniqueSortedRanks[i] === threeOfAKindRank && uniqueSortedRanks.length > 1 && i+1 < uniqueSortedRanks.length && kickers.length < 2) {
              // If the three of a kind rank is the same as the current highest,
              // and there's another unique rank available, use that as a kicker.
              // e.g. A, K, J, J, J -> three A's, K kicker. (Here threeOfAKindRank is A, uniqueSortedRanks[1] is K)
              if(uniqueSortedRanks[i+1] !== threeOfAKindRank) kickers.push(uniqueSortedRanks[i+1]);
          }
      }
       if (uniqueSortedRanks.length === 1 && uniqueSortedRanks[0] === threeOfAKindRank && numJokers + 1 === 5){
           // Hand like K, J, J, J, J -> Three Ks. Need two kickers.
           // This is covered by the nextHighestKicker logic below.
       }


      const jokersUsedForThree = Math.max(0, 3 - (rankCounts[threeOfAKindRank] || 0));
      let remainingJokers = numJokers - jokersUsedForThree;
      
      let nextHighestKicker = getRankValue('A');
      while (kickers.length < 2 && remainingJokers > 0) {
        while (nextHighestKicker === threeOfAKindRank || kickers.includes(nextHighestKicker) || 
               (uniqueSortedRanks.includes(nextHighestKicker) && !kickers.includes(nextHighestKicker)) // avoid using a rank if an actual card of that rank exists but wasn't chosen as kicker yet
              ) {
          nextHighestKicker--;
           if (nextHighestKicker < 2) break;
        }
        if (nextHighestKicker >=2) {
            kickers.push(nextHighestKicker);
            remainingJokers--;
        } else {
            break; 
        }
      }
      kickers.sort((a,b) => b-a);
      return { isMatch: true, ranks: [threeOfAKindRank, ...kickers.slice(0,2)].sort((a,b)=>b-a) };
  }


  return null;
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkStraight(hand) {
  // This function must ensure it's not a straight flush.
  // We assume checkStraightFlush is called first.
  // If we are here, it's not a flush.

  let numJokers = hand.filter(c => c.isWild).length;
  const actualCardRanks = hand.filter(c => !c.isWild).map(c => getRankValue(c.rank));
  
  // Remove duplicate ranks for straight checking, jokers can fill gaps
  const uniqueSortedRanks = [...new Set(actualCardRanks)].sort((a, b) => b - a);

  if (uniqueSortedRanks.length + numJokers < 5 && !(uniqueSortedRanks.length === 4 && numJokers ===1 && uniqueSortedRanks.includes(14) && uniqueSortedRanks.includes(2) && uniqueSortedRanks.includes(3) && uniqueSortedRanks.includes(4) ) && !(uniqueSortedRanks.length === 4 && numJokers ===1 && uniqueSortedRanks.includes(14) && uniqueSortedRanks.includes(5) && uniqueSortedRanks.includes(4) && uniqueSortedRanks.includes(3) )  ) {
      // Special case for A-5 straight: A,2,3,4 + Joker, or A,3,4,5 + Joker etc.
      // If not enough unique cards + jokers to form a 5-card sequence, it's not a straight.
      // Exception: A,2,3,4 + J needs 5 unique ranks (A becomes 1).
      // If uniqueSortedRanks = [14,4,3,2] (A,4,3,2) and 1 joker, it can be A,2,3,4,5. Length is 4, numJokers 1.
      // The findStraight helper handles this.
  }


  const result = findStraight(uniqueSortedRanks, numJokers);
  if (result) {
    // Verify it's not also a flush (which would make it a straight flush)
    // This check is important if evaluateHand doesn't strictly call isFlush before isStraight
    // or if isStraightFlush is not comprehensive.
    // For now, assume evaluateHand calls in order, so if we reach here, it's not a flush.
    const suitsInHand = new Set(hand.filter(c => !c.isWild).map(c => c.suit));
    if (suitsInHand.size === 1 && (hand.filter(c=>!c.isWild).length + numJokers === 5) ) { // All cards same suit, or jokers can make it so
        // This would be a straight flush.
        // This logic is a bit redundant if checkStraightFlush is called first.
        // However, if findStraight created a sequence that happens to be all of one suit
        // from a multi-suited hand + jokers, it should be caught here.
        // This check needs to be more robust: check if the *cards forming the straight* are of the same suit.
        // This is complex. For now, rely on the order of calls in evaluateHand.
    }
    return { isMatch: true, ranks: result.ranks };
  }

  return null;
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkOnePair(hand) {
  const rankCounts = {};
  let numJokers = 0;
  const actualCardRanks = [];

  for (const card of hand) {
    if (card.isWild) {
      numJokers++;
    } else {
      const rankValue = getRankValue(card.rank);
      rankCounts[rankValue] = (rankCounts[rankValue] || 0) + 1;
      actualCardRanks.push(rankValue);
    }
  }
  actualCardRanks.sort((a,b)=>b-a); // Sort for kickers

  const uniqueSortedRanks = [...new Set(actualCardRanks)].sort((a, b) => b - a);

  // Try to find a pair from actual cards
  for (const rankValue of uniqueSortedRanks) {
    if ((rankCounts[rankValue] || 0) >= 2) { // Found an actual pair
      const pairRank = rankValue;
      const kickers = actualCardRanks.filter(r => r !== pairRank).slice(0, 3);
      return { isMatch: true, ranks: [pairRank, ...kickers].sort((a,b)=>b-a) };
    }
  }

  // If no actual pair, try to make one with a joker and an actual card
  if (numJokers > 0 && uniqueSortedRanks.length > 0) {
    // Make a pair with the highest actual card + joker
    const pairRank = uniqueSortedRanks[0];
    const kickers = uniqueSortedRanks.slice(1, 4); // Next 3 highest actual cards as kickers
    
    // If not enough actual kickers, fill with jokers (as highest cards not pairRank or existing kickers)
    let jokersAvailableForKickers = numJokers - 1; // One joker used for the pair
    let nextHighestKickerRank = getRankValue('A');
    while (kickers.length < 3 && jokersAvailableForKickers > 0) {
        while(nextHighestKickerRank === pairRank || kickers.includes(nextHighestKickerRank)) {
            nextHighestKickerRank--;
            if(nextHighestKickerRank < 2) break;
        }
        if (nextHighestKickerRank >=2) {
            kickers.push(nextHighestKickerRank);
            jokersAvailableForKickers--;
        } else {
            break;
        }
    }
    kickers.sort((a,b)=>b-a);
    return { isMatch: true, ranks: [pairRank, ...kickers.slice(0,3)].sort((a,b)=>b-a) };
  }

  // If hand is all jokers, or jokers + all unique actual cards (no natural pair)
  // e.g., J,J,K,Q,A -> Pair Aces (from J,J), Kickers K,Q,A
  if (numJokers >= 2) {
      const pairRank = getRankValue('A'); // Jokers form pair of Aces
      const kickers = uniqueSortedRanks.slice(0,3); // Highest 3 actual cards are kickers
      
      let jokersAvailableForKickers = numJokers - 2; // Two jokers used for the Ace pair
      let nextHighestKickerRank = getRankValue('K'); // Start with King as Ace is the pair
      while (kickers.length < 3 && jokersAvailableForKickers > 0) {
          while(nextHighestKickerRank === pairRank || kickers.includes(nextHighestKickerRank)) {
              nextHighestKickerRank--;
              if(nextHighestKickerRank < 2) break;
          }
          if (nextHighestKickerRank >=2 ) {
              kickers.push(nextHighestKickerRank);
              jokersAvailableForKickers--;
          } else {
              break;
          }
      }
      kickers.sort((a,b)=>b-a);
      return { isMatch: true, ranks: [pairRank, ...kickers.slice(0,3)].sort((a,b)=>b-a) };
  }
  
  return null; // No pair could be formed
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkHighCard(hand) {
  let numJokers = hand.filter(c => c.isWild).length;
  let actualCardRanks = hand.filter(c => !c.isWild).map(c => getRankValue(c.rank));

  // Jokers become the highest possible cards not already present
  let ranks = [...actualCardRanks];
  let jokersToAssign = numJokers;

  // Assign ranks to jokers
  for (let r = 14; r >= 2 && jokersToAssign > 0; r--) {
    if (!ranks.includes(r)) {
      ranks.push(r);
      jokersToAssign--;
    }
  }
  ranks.sort((a, b) => b - a);
  return { isMatch: true, ranks: ranks.slice(0, 5) };
}

/**
 * Evaluates a 5-card hand and returns its poker ranking, score, and tie-breaking ranks.
 * @param {Card[]} hand - An array of 5 Card objects.
 * @returns {{ handName: string, score: number, contributingRanks: number[] }}
 */
function evaluateHand(hand) {
  if (hand.length !== 5) {
    throw new Error("Hand must contain exactly 5 cards.");
  }

  let result;

  result = checkFiveOfAKind(hand);
  if (result && result.isMatch) {
    return { handName: HAND_TYPES.FIVE_OF_A_KIND, score: HAND_SCORES[HAND_TYPES.FIVE_OF_A_KIND], contributingRanks: result.ranks };
  }

  result = checkRoyalFlush(hand); // checkRoyalFlush calls checkStraightFlush
  if (result && result.isMatch) {
    return { handName: HAND_TYPES.ROYAL_FLUSH, score: HAND_SCORES[HAND_TYPES.ROYAL_FLUSH], contributingRanks: result.ranks };
  }

  result = checkStraightFlush(hand);
  if (result && result.isMatch) {
    return { handName: HAND_TYPES.STRAIGHT_FLUSH, score: HAND_SCORES[HAND_TYPES.STRAIGHT_FLUSH], contributingRanks: result.ranks };
  }

  result = checkFourOfAKind(hand);
  if (result && result.isMatch) {
    return { handName: HAND_TYPES.FOUR_OF_A_KIND, score: HAND_SCORES[HAND_TYPES.FOUR_OF_A_KIND], contributingRanks: result.ranks };
  }

  result = checkFullHouse(hand);
  if (result && result.isMatch) {
    return { handName: HAND_TYPES.FULL_HOUSE, score: HAND_SCORES[HAND_TYPES.FULL_HOUSE], contributingRanks: result.ranks };
  }

  result = checkFlush(hand);
  if (result && result.isMatch) {
    // Ensure it's not a straight flush (already checked, but good practice)
     const isStraightFlushCheck = checkStraightFlush(hand);
     if (!isStraightFlushCheck || !isStraightFlushCheck.isMatch) {
        return { handName: HAND_TYPES.FLUSH, score: HAND_SCORES[HAND_TYPES.FLUSH], contributingRanks: result.ranks };
     }
  }

  result = checkStraight(hand);
  if (result && result.isMatch) {
     // Ensure it's not a straight flush or royal flush
     const isStraightFlushCheck = checkStraightFlush(hand);
     if (!isStraightFlushCheck || !isStraightFlushCheck.isMatch) {
        return { handName: HAND_TYPES.STRAIGHT, score: HAND_SCORES[HAND_TYPES.STRAIGHT], contributingRanks: result.ranks };
     }
  }
  
  result = checkThreeOfAKind(hand);
  if (result && result.isMatch) {
    return { handName: HAND_TYPES.THREE_OF_A_KIND, score: HAND_SCORES[HAND_TYPES.THREE_OF_A_KIND], contributingRanks: result.ranks };
  }

  result = checkTwoPair(hand);
  if (result && result.isMatch) {
    return { handName: HAND_TYPES.TWO_PAIR, score: HAND_SCORES[HAND_TYPES.TWO_PAIR], contributingRanks: result.ranks };
  }

  result = checkOnePair(hand);
  if (result && result.isMatch) {
    return { handName: HAND_TYPES.ONE_PAIR, score: HAND_SCORES[HAND_TYPES.ONE_PAIR], contributingRanks: result.ranks };
  }

  result = checkHighCard(hand);
  return { handName: HAND_TYPES.HIGH_CARD, score: HAND_SCORES[HAND_TYPES.HIGH_CARD], contributingRanks: result.ranks };
}

/**
 * Performs the player's draw action, discarding specified cards and drawing new ones.
 * Mutates player.hand, deck, and discardPile.
 * @param {Player} player - The player performing the draw.
 * @param {number[]} cardsToDiscardIndices - Array of indices in player.hand to discard.
 * @param {Card[]} deck - The current game deck.
 * @param {Card[]} discardPile - The current game discard pile.
 */
function performPlayerDraw(player, cardsToDiscardIndices, deck, discardPile) {
  // Validate cardsToDiscardIndices
  if (!Array.isArray(cardsToDiscardIndices)) {
    console.error("performPlayerDraw: cardsToDiscardIndices must be an array.");
    // Potentially throw an error or handle more gracefully depending on desired server robustness
    return; 
  }
  if (cardsToDiscardIndices.some(isNaN || index < 0 || index >= player.hand.length)) {
    console.error("performPlayerDraw: Invalid indices in cardsToDiscardIndices.");
    return;
  }

  cardsToDiscardIndices.sort((a, b) => b - a); // Sort descending to avoid index issues when removing

  const keptCards = [];
  const discardedThisTurn = [];

  for (let i = 0; i < player.hand.length; i++) {
    if (cardsToDiscardIndices.includes(i)) {
      discardedThisTurn.push(player.hand[i]);
    } else {
      keptCards.push(player.hand[i]);
    }
  }
  
  discardPile.push(...discardedThisTurn);
  player.hand = keptCards;

  const numToDraw = cardsToDiscardIndices.length;

  for (let i = 0; i < numToDraw; i++) {
    if (deck.length === 0) {
      if (discardPile.length === 0) {
        console.error("No cards left in deck or discard pile. Cannot draw.");
        // This state should ideally be handled or prevented by game rules (e.g., ending game)
        break; // Stop trying to draw
      }
      console.log("Deck is empty. Shuffling discard pile...");
      // shuffleDeck directly mutates the array passed to it,
      // so we copy discardPile before shuffling if shuffleDeck expects to return a new array
      // or ensure shuffleDeck handles mutation correctly.
      // Based on previous shuffleDeck, it returns a new shuffled array.
      const shuffledDiscard = shuffleDeck([...discardPile]); // Shuffle a copy
      deck.push(...shuffledDiscard);
      discardPile.length = 0; // Clear the discard pile
      console.log(`Deck reshuffled from discard pile. New deck size: ${deck.length}`);
    }
    if (deck.length > 0) { // Double check deck has cards after potential reshuffle
        player.hand.push(deck.pop());
    }
  }
  // player.hand is already mutated
}


/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkFlush(hand) {
  let numJokers = 0;
  const suitCounts = { 'Spades': 0, 'Hearts': 0, 'Diamonds': 0, 'Clubs': 0 };
  const actualCardRanks = [];

  for (const card of hand) {
    if (card.isWild) {
      numJokers++;
    } else {
      suitCounts[card.suit]++;
      actualCardRanks.push(getRankValue(card.rank));
    }
  }

  for (const suit in suitCounts) {
    if (suitCounts[suit] + numJokers >= 5) {
      // This is a flush of 'suit'.
      // The ranks are all the actual card ranks, jokers fill in to make 5 cards.
      // For tie-breaking, we just need the ranks of the cards in the hand.
      // If actualCardRanks.length < 5, jokers must have been used.
      // The ranks of jokers for a flush don't have specific values,
      // they just complete the suit count. So, we only care about actual card ranks.
      // However, for tie-breaking, a flush with higher cards wins.
      // If hand is [J, J, K_S, Q_S, 10_S], ranks are [13,12,10]. This is enough.
      // If hand is [A_S, K_S, Q_S, J_S, 10_S], ranks are [14,13,12,11,10]
      // If hand is [2_H, 3_H, J, J, J], ranks are [3,2]. The jokers complete the flush.
      // The problem specifies contributingRanks are sorted numerical ranks that form the hand.
      // For a flush, all 5 cards contribute. If jokers are used, they must assume some rank.
      // To maximize score, jokers should assume highest ranks not present.
      // This is complex. Simplification: just use the ranks of actual cards.
      // The problem statement: "For a flush K, Q, J, 9, 8: [13, 12, 11, 9, 8]"
      // This implies all 5 cards' ranks are important.

      const sortedRanks = actualCardRanks.sort((a, b) => b - a);
      
      // If fewer than 5 actual cards, jokers must complete the hand.
      // For a flush, jokers don't need to be specific ranks, just fill the suit.
      // However, for tie-breaking, the ranks matter.
      // To implement tie-breaking correctly as per example, if jokers are used,
      // they should effectively be the highest possible ranks that *are not* part of a straight flush
      // (since straight flush is higher).
      // This is too complex. Let's assume for "Flush", the ranks are simply the sorted actual cards,
      // and if jokers are involved, they are just "filling" the flush.
      // The problem asks for "contributingRanks".
      // For a flush, all 5 cards contribute.
      // If we have K_S, Q_S, J_S, Joker, Joker. This is a flush.
      // Ranks are K, Q, J. What are the joker ranks? They should be the highest cards
      // not already present and not forming a straight/royal flush.
      // E.g., A, 9. So ranks: [14,13,12,11,9]
      // This is tricky. Let's follow the simpler interpretation: ranks of the cards in hand.
      // If jokers make up the flush, they become the highest possible ranks for tie-breaking.

      let contributingRanks = [];
      const cardsOfFlushSuit = hand.filter(c => !c.isWild && c.suit === suit).map(c => getRankValue(c.rank));
      let jokersToAssign = 5 - cardsOfFlushSuit.length;
      
      const allPresentRanks = hand.filter(c => !c.isWild).map(c => getRankValue(c.rank));
      const flushSuitRanks = cardsOfFlushSuit.sort((a,b)=>b-a);
      contributingRanks.push(...flushSuitRanks);

      // Assign ranks to jokers for tie-breaking (highest available that don't make a straight flush)
      // This gets complicated. For now, just return the ranks of the cards of the flush suit.
      // If there are 3 actual cards K, Q, J of spades, and 2 jokers.
      // Ranks: [13,12,11]. This doesn't make 5.
      // The problem implies the 5 ranks for the flush.
      // Let's try to fill with highest cards.
      const tempHandRanks = hand.filter(c => !c.isWild || c.suit === suit).map(c => c.isWild ? 'JOKER' : getRankValue(c.rank));
      const actualRanksInFlushSuit = hand.filter(c => !c.isWild && c.suit === suit).map(c => getRankValue(c.rank));
      let effectiveRanks = [...actualRanksInFlushSuit];
      let numJokersInFlush = numJokers;

      if (suitCounts[suit] + numJokers >= 5) {
          // We have a flush of 'suit'
          let ranksInFlush = hand.filter(c => !c.isWild && c.suit === suit).map(c => getRankValue(c.rank));
          let jokersAvailable = numJokers;
          
          // Add highest possible ranks for jokers
          // Start from Ace (14) downwards
          for (let r = 14; r >= 2 && ranksInFlush.length < 5; r--) {
              if (!ranksInFlush.includes(r) && jokersAvailable > 0) {
                  ranksInFlush.push(r);
                  jokersAvailable--;
              }
          }
          // If still not 5 (e.g. 2,3,4 + 2 jokers -> 2,3,4,A,K), fill with lowest if needed (not for flush)
          // For flush, high cards are better.
          ranksInFlush.sort((a, b) => b - a);
          
          // Check if this flush is actually a straight flush
          // This check is simplified; a more robust check would use findStraight
          let isAlsoStraightFlush = false;
          if (ranksInFlush.length === 5) {
              let currentJokers = 0; // Jokers already conceptually assigned above
              const straightCheckResult = findStraight(ranksInFlush, 0); // Check if the assigned ranks form a straight
              if (straightCheckResult) {
                  isAlsoStraightFlush = true;
              }
          }

          if (!isAlsoStraightFlush) {
            return { isMatch: true, ranks: ranksInFlush.slice(0,5).sort((a,b)=>b-a) };
          }
      }
    }
  }
  return null;
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkFullHouse(hand) {
  const rankCounts = {};
  let numJokers = 0;
  const actualCardRanks = [];

  for (const card of hand) {
    if (card.isWild) {
      numJokers++;
    } else {
      const rankValue = getRankValue(card.rank);
      rankCounts[rankValue] = (rankCounts[rankValue] || 0) + 1;
      actualCardRanks.push(rankValue);
    }
  }

  const uniqueSortedRanks = [...new Set(actualCardRanks)].sort((a, b) => b - a);

  // Iterate through each unique rank to be the potential three-of-a-kind
  for (const threeRank of uniqueSortedRanks) {
    const countOfThreeRank = rankCounts[threeRank] || 0;

    // Try to form three of 'threeRank'
    if (countOfThreeRank + numJokers >= 3) {
      const jokersUsedForThree = Math.max(0, 3 - countOfThreeRank);
      const remainingJokers = numJokers - jokersUsedForThree;

      // Now try to form a pair from the remaining cards
      const otherRanks = uniqueSortedRanks.filter(r => r !== threeRank);
      for (const pairRank of otherRanks) {
        const countOfPairRank = rankCounts[pairRank] || 0;
        if (countOfPairRank + remainingJokers >= 2) {
          return { isMatch: true, ranks: [threeRank, pairRank].sort((a,b)=>b-a) };
        }
      }
      // If no other actual card can form a pair, check if remaining jokers can form a pair
      // The pair must be of a different rank than 'threeRank'.
      // If only one unique rank exists (e.g. K,K,K,J,J), this is 5 of a kind, not full house.
      // This condition implies we need another rank for the pair.
      if (remainingJokers >= 2 && uniqueSortedRanks.length > 1) {
         // Form a pair with jokers. What rank should it be?
         // It should be the highest possible rank that is NOT 'threeRank'.
         // This is tricky. If otherRanks is empty, it means all actual cards are 'threeRank'.
         // e.g. hand [K,K,J,J,J] -> three Ks (2 jokers), pair of Aces (1 joker + creates Ace)
         // This case should be five of a kind Kings.
         // Full house requires two distinct ranks.
         // If otherRanks is empty, it means all actual cards are of 'threeRank'.
         // e.g. [K,K,K,J,J] - 3Ks (natural), 2 jokers for pair -> pair of Aces. FH KKKAA.
         // e.g. [K,K,J,J,J] - 3Ks (1 joker), 2 jokers for pair -> pair of Aces. FH KKKAA.
         // e.g. [K,J,J,J,J] - 3Ks (2 jokers), 2 jokers for pair -> pair of Aces. FH KKKAA.
        if (otherRanks.length === 0 && countOfThreeRank < 3 ) { // e.g. [K,K, J,J,J] or [K, J,J,J,J]
            // Here, threeRank is the only actual card rank.
            // We used jokers to make it 3 of a kind.
            // If remainingJokers >= 2, we can make a pair of Aces (if threeRank is not Ace)
            // or Kings (if threeRank is Ace)
            const pairRankValue = (threeRank === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
            return { isMatch: true, ranks: [threeRank, pairRankValue].sort((a,b)=>b-a) };
        } else if (otherRanks.length > 0 && remainingJokers >=2) {
            // We made threeRank. We have other actual cards. But none can make a pair even with remainingJokers.
            // So we make a pair of Jokers.
            // Highest possible pair different from threeRank.
            let pairRankValue = getRankValue('A');
            if (pairRankValue === threeRank) pairRankValue = getRankValue('K');
             return { isMatch: true, ranks: [threeRank, pairRankValue].sort((a,b)=>b-a) };
        }
      }
    }
  }
  
  // Case: No actual cards, or only one rank of actual cards (e.g. J,J,J,J,J or K,J,J,J,J)
  // 5 Jokers -> Five of a Kind Aces (handled)
  // 1 card + 4 Jokers (e.g. K, J, J, J, J) -> Five of a Kind Kings (handled)
  // 2 cards same rank + 3 Jokers (e.g. K, K, J, J, J) -> Five of a Kind Kings (handled)
  // 2 cards diff rank + 3 Jokers (e.g. K, Q, J, J, J) -> Three Ks, Pair Qs (or Three Qs, Pair Ks)
  if (numJokers >= 3 && uniqueSortedRanks.length === 2) {
      const rank1 = uniqueSortedRanks[0]; // highest
      const rank2 = uniqueSortedRanks[1]; // second highest
      const count1 = rankCounts[rank1] || 0; // Should be 1
      const count2 = rankCounts[rank2] || 0; // Should be 1

      // Option 1: Three of rank1, Two of rank2
      // Need 3 - count1 jokers for rank1.
      // Need 2 - count2 jokers for rank2.
      if ( (3-count1) + (2-count2) <= numJokers) {
          return {isMatch: true, ranks: [rank1, rank2].sort((a,b)=>b-a)};
      }
      // Option 2: Three of rank2, Two of rank1 (This would be covered if we iterate for pairRank first or consider both ways)
      // Logic above iterates threeRank first, then pairRank.
      // It should find the highest three of a kind first.
  }
  // Case: 3 cards of two ranks + 2 Jokers (e.g. K,K,Q,J,J) -> Three Ks, Pair Qs
  if (numJokers >=2 && uniqueSortedRanks.length === 2) {
      const rank1 = uniqueSortedRanks[0]; // highest
      const rank2 = uniqueSortedRanks[1]; // second highest
      const count1 = rankCounts[rank1] || 0; 
      const count2 = rankCounts[rank2] || 0;

      // K K Q J J. rank1=K (c1=2), rank2=Q (c2=1). numJokers=2
      // Try rank1 as three: needs 1 joker. remainingJokers=1.
      // Try rank2 as pair: needs 1 joker. remainingJokers=0. Total jokers = 1+1=2. Yes.
      if (count1 === 2 && count2 === 1 && numJokers >= ( (3-2) + (2-1)) ) {
           return {isMatch: true, ranks: [rank1, rank2].sort((a,b)=>b-a)};
      }
      // Q Q K J J. rank1=Q (c1=2), rank2=K (c2=1).
      // This is implicitly handled by iterating `threeRank` over uniqueSortedRanks.
      // If rank1 is Q, threeRank=Q. jokersForThree=1. remJokers=1.
      // pairRank=K. countOfPairRank=1. needs 1 joker. Yes. {Q,K}
  }
  // Case: 1 Joker. Hand K K Q Q J. -> Full House K K Q Q J (Joker as K or Q)
  // Covered by main loop: threeRank=K, needs 1 joker. remJokers=0. pairRank=Q (count=2). Yes.
  // Or threeRank=Q, needs 1 joker. remJokers=0. pairRank=K (count=2). Yes.
  // The loop picks the higher threeRank first.

  return null;
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkFourOfAKind(hand) {
  const rankCounts = {};
  let numJokers = 0;
  const actualCardRanks = [];

  for (const card of hand) {
    if (card.isWild) {
      numJokers++;
    } else {
      const rankValue = getRankValue(card.rank);
      rankCounts[rankValue] = (rankCounts[rankValue] || 0) + 1;
      actualCardRanks.push(rankValue);
    }
  }

  // Sort unique actual card ranks to check from highest for 4 of a kind
  const uniqueSortedRanks = [...new Set(actualCardRanks)].sort((a, b) => b - a);

  for (const rankValue of uniqueSortedRanks) {
    if ((rankCounts[rankValue] || 0) + numJokers >= 4) {
      // Found four of a kind of rankValue
      const fourOfAKindRank = rankValue;
      // Determine kicker: highest card not part of the four of a kind
      let kickerRank = 0;
      const cardsNotInFourOfAKind = actualCardRanks.filter(r => r !== fourOfAKindRank);
      
      // We need to account for jokers used for the 4-of-a-kind
      const jokersUsedForFourOfAKind = 4 - (rankCounts[fourOfAKindRank] || 0);
      const remainingJokers = numJokers - jokersUsedForFourOfAKind;

      if (cardsNotInFourOfAKind.length > 0) {
        kickerRank = Math.max(...cardsNotInFourOfAKind);
      } else if (remainingJokers > 0) {
        // All actual cards formed the 4 of a kind, or only jokers left for kicker
        // Kicker should be highest possible if formed by a joker (Ace)
        // unless the 4 of a kind is Aces, then King
        kickerRank = (fourOfAKindRank === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
      } else {
         // This case implies 4 cards of one rank and one joker, or 5 cards of one rank.
         // The kicker has to be different from the 4 of a kind.
         // If all 5 cards are the same rank (e.g. K,K,K,K,K or K,K,K,K,Joker as K), this is Five of a Kind.
         // This function assumes Five of a Kind was checked first.
         // If it was K,K,K,K,Q -> Kicker is Q.
         // If it was K,K,K,K,Joker -> Kicker is A (Joker becomes Ace)
         // This is covered by "cardsNotInFourOfAKind" if that list isn't empty.
         // If actualCardRanks only contained 'fourOfAKindRank', and numJokers was 1, kicker is Ace.
         if (actualCardRanks.every(r => r === fourOfAKindRank) && numJokers === 1){
            kickerRank = (fourOfAKindRank === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
         } else if (actualCardRanks.length === 0 && numJokers ===5) {
            // Hand is 5 jokers. This is Five of a Kind (Aces)
            // This function should not be reached.
            return null; // Or handle as error
         } else if (actualCardRanks.length > 0 && (rankCounts[fourOfAKindRank] || 0) === actualCardRanks.length && numJokers + actualCardRanks.length === 5) {
            // e.g., [K,K,K,J,J] -> Four Kings, Kicker Ace (one J for K, one J for A)
            // e.g., [K,K,J,J,J] -> Four Kings, Kicker Ace
             kickerRank = (fourOfAKindRank === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
         } else {
             // Default kicker if no other card is present - this implies a very specific scenario
             // like 4 Aces + Joker (which would be 5 Aces) or 3 Aces + 2 Jokers (5 Aces)
             // This path should ideally be covered by 5 of a kind check.
             // If we are here, it means we have 4 of a kind, and the 5th card is a joker used as a kicker.
             if (remainingJokers > 0) {
                kickerRank = (fourOfAKindRank === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
             } else {
                 // This case should not be hit if logic is correct.
                 // It means we couldn't determine a kicker.
                 // For example hand: [A,A,A,A,Joker] -> 5 of a kind, not 4.
                 // hand [A,A,A,Joker, Joker] -> 5 of a kind, not 4.
                 // hand [K,K,K,K, Joker] -> 4K + A kicker. jokersUsedForFourOfAKind = 0, remainingJokers=1.
                 // This should have been caught by previous if (remainingJokers > 0)
             }
         }
      }
      return { isMatch: true, ranks: [fourOfAKindRank, kickerRank].sort((a,b) => b-a) };
    }
  }
  
  // Case: All cards are jokers or form 4 of a kind with jokers (e.g. Joker, Joker, Joker, Joker, K)
  if (numJokers >= 4 && actualCardRanks.length <=1) {
      const fourOfAKindRank = actualCardRanks.length === 1 ? actualCardRanks[0] : getRankValue('A');
      let kickerRank = 0;
      if (actualCardRanks.length === 1 && actualCardRanks[0] !== fourOfAKindRank) {
          // This should not happen if fourOfAKindRank is derived from actualCardRanks[0]
          kickerRank = actualCardRanks[0];
      } else if (actualCardRanks.length === 1 && actualCardRanks[0] === fourOfAKindRank) {
          // The single card is part of the 4 of a kind, kicker is highest possible (Ace or King if 4 of a kind is Ace)
          kickerRank = (fourOfAKindRank === getRankValue('A')) ? getRankValue('K') : getRankValue('A');
      } else if (actualCardRanks.length === 0) { // All 5 jokers, or 4 jokers + 1 card made into 4 of kind
          // If 5 jokers, it's 5 of a kind Aces.
          // If 4 jokers + 1 card (e.g. K), it's 4 Aces + K kicker (J,J,J,J,K)
          // or 4 Kings + A kicker (if we decide to make the 4 jokers match the K)
          // The loop for uniqueSortedRanks should handle (K, J, J, J, J) as four Ks + A.
          // If it's 5 jokers, this will be caught by five of a kind.
          // If it's 4 jokers and 1 card, it's four of a kind of that card, with Ace kicker (or K if card is A)
          // OR four Aces with that card as kicker. The former is generally better unless card is Ace.
          // The current logic tries to make the 4 of a kind from existing cards first.
          // If only jokers, 4 Aces + King kicker (as 5th joker acts as King)
           kickerRank = getRankValue('K'); // Assuming 4 of a kind is Ace
           return {isMatch: true, ranks: [getRankValue('A'), kickerRank].sort((a,b) => b-a) };
      }
       return { isMatch: true, ranks: [fourOfAKindRank, kickerRank].sort((a,b) => b-a) };
  }

  return null;
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkRoyalFlush(hand) {
  // Check for Straight Flush first, then if it's Royal.
  const sfResult = checkStraightFlush(hand);

  if (sfResult && sfResult.isMatch) {
    // Check if the straight flush is A, K, Q, J, 10
    // sfResult.ranks will be sorted [14, 13, 12, 11, 10] for a royal flush
    if (sfResult.ranks[0] === getRankValue('A')) {
      return { isMatch: true, ranks: sfResult.ranks };
    }
  }
  return null;
}

/**
 * @param {Card[]} hand
 * @returns {{ isMatch: boolean, ranks: number[] } | null}
 */
function checkStraightFlush(hand) {
  let numJokers = hand.filter(c => c.isWild).length;
  const actualCards = hand.filter(c => !c.isWild);

  if (actualCards.length + numJokers < 5) return null; // Not enough cards

  const suits = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
  for (const suit of suits) {
    const suitCards = actualCards.filter(c => c.suit === suit);
    const suitCardRanks = suitCards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
    
    if (suitCardRanks.length + numJokers < 5) continue;

    // Try to form a straight flush of this suit
    const result = findStraight(suitCardRanks, numJokers);
    if (result) {
      return { isMatch: true, ranks: result.ranks };
    }
  }
  return null;
}

/**
 * Helper to find a straight given sorted unique ranks and number of jokers.
 * @param {number[]} uniqueSortedRanks - Sorted unique ranks (e.g., [14, 10, 5])
 * @param {number} numJokersAvailable
 * @returns {{ ranks: number[] } | null} - The ranks forming the straight, or null
 */
function findStraight(uniqueSortedRanks, numJokersAvailable) {
    // Handle A-5 straight (Ace as 1)
    // If Ace is present, temporarily add 1 to the list of ranks to check for A-5
    const ranksToCheck = [...uniqueSortedRanks];
    if (uniqueSortedRanks.includes(14)) { // Ace
        ranksToCheck.push(1); // Add Ace as low for A-5 check
        ranksToCheck.sort((a, b) => b - a); // Re-sort
    }
    
    // Iterate through all possible start ranks for a straight
    // Max possible rank value is 14 (Ace). A straight is 5 cards.
    // So, a straight can start from A (high), K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2, A (low)
    // We check from highest possible straight (A-K-Q-J-10) down to A-2-3-4-5
    for (let i = 0; i < ranksToCheck.length; i++) {
        const potentialStartRank = ranksToCheck[i];
        // Try to build a straight downwards from potentialStartRank
        let currentStraight = [potentialStartRank];
        let jokersUsed = 0;
        let nextExpectedRank = potentialStartRank - 1;

        // Build straight downwards
        for (let k = 1; k < 5; k++) { // Need 4 more cards
            if (ranksToCheck.includes(nextExpectedRank)) {
                currentStraight.push(nextExpectedRank);
            } else if (jokersUsed < numJokersAvailable) {
                currentStraight.push(nextExpectedRank); // Use joker
                jokersUsed++;
            } else {
                break; // Cannot form straight here
            }
            nextExpectedRank--;
        }

        if (currentStraight.length === 5) {
            return { ranks: currentStraight.sort((a,b) => b-a) };
        }

        // Special check for A-5 straight if current rank is 5 (2-3-4-5-A)
        if (potentialStartRank === 5) {
            currentStraight = [5, 4, 3, 2]; // Potential 5,4,3,2
            jokersUsed = 0;
            let currentStraightRanks = [5];

            for(let rank of [4,3,2]) {
                if(ranksToCheck.includes(rank)) currentStraightRanks.push(rank);
                else if (jokersUsed < numJokersAvailable) {
                    currentStraightRanks.push(rank); // Use joker
                    jokersUsed++;
                } else break;
            }
            // Check for Ace (rank 1 or 14)
            if (currentStraightRanks.length === 4) {
                 if (ranksToCheck.includes(14)) currentStraightRanks.push(14); // Ace high
                 else if (jokersUsed < numJokersAvailable) {
                     currentStraightRanks.push(14); // Use joker for Ace
                     jokersUsed++;
                 }
            }
            if (currentStraightRanks.length === 5) {
                return { ranks: currentStraightRanks.sort((a, b) => b - a).map(r => r === 1 ? 14 : r) }; // Ensure Ace is 14
            }
        }
    }
    return null;
}


// Player and GameState Structures
/**
 * @typedef {object} Player
 * @property {string} id
 * @property {string} name
 * @property {Card[]} hand
 * @property {number} score
 * @property {string} socketId
 */

/**
 * @typedef {object} GameState
 * @property {Player[]} players
 * @property {Card[]} deck
 * @property {Card[]} discardPile
 * @property {number} currentPlayerTurnIndex
 * @property {number} currentRound
 * @property {number} maxRounds
 * @property {string} gamePhase // 'WaitingForPlayers', 'Dealing', 'PlayerTurn', 'Scoring', 'GameOver'
 */

module.exports = {
  createDeck,
  shuffleDeck,
  dealInitialHands,
  HAND_TYPES,
  HAND_SCORES,
  evaluateHand,
  getRankValue, // getRankValue is used internally but good to export if tests need it
  performPlayerDraw,
  // Individual check functions can also be exported if needed for testing/modularity
  // checkFiveOfAKind, checkRoyalFlush, etc.
  // Types and interfaces are implicitly available via JSDoc for now.
  // If explicit export is needed for TypeScript or similar, that's a different setup.
};
