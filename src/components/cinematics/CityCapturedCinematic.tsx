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

export const CityCapturedCinematic: React.FC<Props> = ({ event, onFinished }) => {
  useEffect(() => {
    // Cinematic runs for 2.2 seconds then fades
    const timeout = setTimeout(onFinished, 2200);
    return () => clearTimeout(timeout);
  }, [onFinished]);

  const capturer = event.primaryCiv;
  const loser = event.secondaryCiv;
  const city = event.city;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 animate-cinematic">
      {/* Darkened heavy backdrop */}
      <div className="absolute inset-0 bg-radial from-black/70 to-black/95" />

      <div className="relative p-8 md:p-10 rounded-xl bg-gradient-to-br from-[#121929] to-[#0a0d14] border-2 border-amber-500/80 shadow-[0_0_50px_rgba(245,158,11,0.35)] text-center min-w-[320px] md:min-w-[550px] pointer-events-auto">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 border border-amber-300 px-6 py-1 rounded-full text-xs font-bold tracking-[0.25em] text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] uppercase">
          City Captured
        </div>

        <div className="my-2">
          <div className="text-zinc-500 text-[10px] uppercase tracking-[0.3em]">Fallen Stronghold</div>
          <div className="text-3xl md:text-4xl font-black font-display text-white tracking-wide uppercase drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
            🏢 {city?.name || "Border Outpost"}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 md:gap-16 my-5">
          {/* Winner */}
          {capturer && (
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-14 h-14 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center bg-zinc-900 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                style={{ borderColor: capturer.color }}
              >
                <span className="text-2xl md:text-3xl">🏰</span>
              </div>
              <div className="text-xs md:text-sm font-bold uppercase tracking-wider" style={{ color: capturer.color }}>
                {capturer.name}
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-emerald-400 font-semibold">New Ruler</div>
            </div>
          )}

          <div className="text-zinc-600 font-bold text-sm tracking-wider">ANNEXED FROM</div>

          {/* Loser */}
          {loser && (
            <div className="flex flex-col items-center gap-2 opacity-75">
              <div 
                className="w-14 h-14 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center bg-zinc-900/50 shadow-[0_0_15px_rgba(0,0,0,0.8)] grayscale"
                style={{ borderColor: loser.color }}
              >
                <span className="text-2xl md:text-3xl">🔥</span>
              </div>
              <div className="text-xs md:text-sm font-semibold uppercase tracking-wider" style={{ color: loser.color }}>
                {loser.name}
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-zinc-500">Former Owner</div>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <div className="text-xs md:text-sm font-medium tracking-wide text-zinc-300 italic">
            "{event.headline}"
          </div>
          <div className="text-[10px] md:text-xs text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
            {event.summary}
          </div>
        </div>
      </div>
    </div>
  );
};
