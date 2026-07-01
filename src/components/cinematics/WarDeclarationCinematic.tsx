/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { GameEvent } from "../../types";

interface Props {
  event: GameEvent;
  onFinished: () => void;
}

export const WarDeclarationCinematic: React.FC<Props> = ({ event, onFinished }) => {
  useEffect(() => {
    // Cinematic runs for 2.2 seconds then fades
    const timeout = setTimeout(onFinished, 2200);
    return () => clearTimeout(timeout);
  }, [onFinished]);

  const attacker = event.primaryCiv;
  const defender = event.secondaryCiv;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 animate-cinematic">
      {/* Darkened heavy backdrop to focus the eye */}
      <div className="absolute inset-0 bg-radial from-black/75 to-black/95" />

      <div className="relative p-8 md:p-12 rounded-xl bg-gradient-to-br from-[#1a1410] to-[#2b1c12] border-2 border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-center min-w-[320px] md:min-w-[600px] pointer-events-auto">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 border border-red-400 px-6 py-1 rounded-full text-xs font-bold tracking-[0.25em] text-[#fff] shadow-[0_0_15px_rgba(239,68,68,0.5)] uppercase">
          War Declared
        </div>

        <div className="flex items-center justify-center gap-6 md:gap-16 my-4">
          {/* Attacker */}
          {attacker && (
            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 flex items-center justify-center bg-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.8)]"
                style={{ borderColor: attacker.color }}
              >
                <span className="text-3xl md:text-4xl">⚔️</span>
              </div>
              <div className="text-sm md:text-lg font-bold uppercase tracking-wider text-[#f7f0da]" style={{ color: attacker.color }}>
                {attacker.name}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-semibold">Attacker</div>
            </div>
          )}

          <div className="text-2xl md:text-4xl font-extrabold text-amber-500/90 italic tracking-widest font-display px-2">
            VS
          </div>

          {/* Defender */}
          {defender && (
            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 flex items-center justify-center bg-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.8)]"
                style={{ borderColor: defender.color }}
              >
                <span className="text-3xl md:text-4xl">🛡️</span>
              </div>
              <div className="text-sm md:text-lg font-bold uppercase tracking-wider text-[#f7f0da]" style={{ color: defender.color }}>
                {defender.name}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-semibold">Defender</div>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-amber-600/20 pt-4">
          <div className="text-xs md:text-sm font-semibold tracking-wide text-amber-100 font-display italic">
            "{event.headline}"
          </div>
          <div className="text-[11px] md:text-xs text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
            {event.summary}
          </div>
        </div>
      </div>
    </div>
  );
};
