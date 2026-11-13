import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalGameController } from '../local-game';

const HUMAN_ID = 'local-human';

function makeController(seed: number, turnTimerSeconds = 1) {
  return new LocalGameController({
    nickname: 'Tester',
    botCount: 2,
    seed,
    // Park the bots far in the future so a failure is attributable to the
    // human timeout rather than a chained bot move.
    botDelayMs: 60_000,
    rules: { turnTimerSeconds },
  });
}

/** Finds a seed where the human opens the game, optionally with a playable card. */
function findHumanOpening(hasPlayable: boolean) {
  for (let seed = 1; seed <= 600; seed += 1) {
    const controller = makeController(seed);
    const snapshot = controller.getSnapshot();
    if (
      snapshot.publicState.currentPlayerId === HUMAN_ID &&
      snapshot.publicState.phase === 'ACTIVE_TURN' &&
      snapshot.privateState.hand.some((card) => card.isPlayable) === hasPlayable
    ) {
      return { controller, seed };
    }
    controller.destroy();
  }
  return null;
}

describe('local game timeout authority', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays one legal card when the human clock expires', () => {
    const found = findHumanOpening(true);
    expect(found).not.toBeNull();
    const { controller } = found!;

    controller.start();
    const before = controller.getSnapshot();
    // The local clock must expose the same deadline the table renders.
    expect(before.publicState.turnDeadline).toBeTypeOf('number');

    vi.advanceTimersByTime(990);
    expect(controller.getSnapshot().publicState.version).toBe(
      before.publicState.version
    );

    vi.advanceTimersByTime(10);
    const after = controller.getSnapshot();

    expect(after.publicState.version).toBe(before.publicState.version + 1);
    expect(after.publicState.lastAction?.playerId).toBe(HUMAN_ID);
    expect(after.publicState.lastAction?.type).toBe('CARD_PLAYED');
    expect(after.publicState.lastAction?.card?.id).toBe(
      after.publicState.topDiscard.id
    );
    expect(controller.getLastError()).toBeNull();

    // No second action fires from the same expired deadline.
    vi.advanceTimersByTime(8);
    expect(controller.getSnapshot().publicState.version).toBe(
      before.publicState.version + 1
    );

    controller.destroy();
  });

  it('draws instead of inventing a play when nothing is playable', () => {
    const found = findHumanOpening(false);
    expect(found).not.toBeNull();
    const { controller } = found!;

    controller.start();
    const before = controller.getSnapshot();

    vi.advanceTimersByTime(1_000);
    const after = controller.getSnapshot();

    expect(after.publicState.version).toBe(before.publicState.version + 1);
    expect(after.publicState.lastAction?.playerId).toBe(HUMAN_ID);
    expect(after.publicState.lastAction?.type).toBe('CARD_DRAWN');
    expect(after.privateState.hand.length).toBe(
      before.privateState.hand.length + 1
    );
    expect(controller.getLastError()).toBeNull();

    controller.destroy();
  });

  it('never ticks when the room disables the turn timer', () => {
    let controller: LocalGameController | null = null;
    for (let seed = 1; seed <= 600; seed += 1) {
      const candidate = makeController(seed, 0);
      if (
        candidate.getSnapshot().publicState.currentPlayerId === HUMAN_ID
      ) {
        controller = candidate;
        break;
      }
      candidate.destroy();
    }
    expect(controller).not.toBeNull();

    const before = controller!.getSnapshot();
    controller!.start();

    vi.advanceTimersByTime(120_000);

    expect(controller!.getSnapshot().publicState.version).toBe(
      before.publicState.version
    );
    controller!.destroy();
  });
});
