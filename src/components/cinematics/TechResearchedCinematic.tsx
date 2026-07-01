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

export const TechResearchedCinematic: React.FC<Props> = ({ event, onFinished }) => {
  useEffect(() => {
    const timeout = setTimeout(onFinished, 1800);
    return () => clearTimeout(timeout);
  }, [onFinished]);

  const civ = event.primaryCiv;

  return (
    <div className="fixed inset-x-0 bottom-24 pointer-events-none flex items-center justify-center z-40 animate-cinematic">
      <div className="p-4 rounded-xl bg-zinc-950/95 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-center min-w-[300px] pointer-events-auto flex items-center gap-4 max-w-md">
        <div 
          className="w-12 h-12 rounded-lg border-2 flex items-center justify-center bg-zinc-900 shadow-md shrink-0"
          style={{ borderColor: civ?.color || "#06b6d4" }}
        >
          <span className="text-2xl">⚗️</span>
        </div>
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold">Scientific Breakthrough</div>
          <div className="text-sm font-bold text-white uppercase tracking-wider">{event.headline}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{event.summary}</div>
        </div>
      </div>
    </div>
  );
};
