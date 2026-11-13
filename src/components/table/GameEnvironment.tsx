import React from 'react';

/**
 * Decorative only. The table remains the interactive surface; a soft haze and
 * a few drifting motes give the room depth without painted scenery.
 */
export const GameEnvironment: React.FC = () => {
  return (
    <div className="game-environment" aria-hidden="true">
      <span className="env-haze" />
      <span className="env-mote env-mote-a" />
      <span className="env-mote env-mote-b" />
      <span className="env-mote env-mote-c" />
      <span className="env-mote env-mote-d" />
      <span className="env-mote env-mote-e" />
    </div>
  );
};
