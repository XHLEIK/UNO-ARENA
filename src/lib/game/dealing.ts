// src/lib/game/dealing.ts
//
// Pure description of the opening deal. The animation consumes this; it never
// invents card values. Only the local player's real hand is exposed.
import { PrivatePlayerState, PublicGameState, UnoCard } from '@/types';

export interface DealStep {
  id: string;
  playerId: string;
  nickname: string;
  seatNumber: number;
  cardIndex: number;
  faceDown: boolean;
  card?: UnoCard;
  isLocalPlayer: boolean;
}

export const OPENING_HAND_SIZE = 7;

export function buildDealSequence(
  publicState: PublicGameState,
  privateState: PrivatePlayerState | null | undefined,
  myPlayerId: string,
  handSize: number = OPENING_HAND_SIZE
): DealStep[] {
  const orderedPlayers = [...publicState.players].sort(
    (a, b) => a.seatNumber - b.seatNumber
  );
  const steps: DealStep[] = [];

  for (let cardIndex = 0; cardIndex < handSize; cardIndex++) {
    for (const player of orderedPlayers) {
      const isLocalPlayer = player.id === myPlayerId;
      const realCard = isLocalPlayer ? privateState?.hand[cardIndex] : undefined;
      steps.push({
        id: `${player.id}:${cardIndex}`,
        playerId: player.id,
        nickname: player.nickname,
        seatNumber: player.seatNumber,
        cardIndex,
        faceDown: !realCard,
        card: realCard,
        isLocalPlayer,
      });
    }
  }

  return steps;
}
