import React from "react";
import { Flame, Volume2, VolumeX } from "lucide-react";

export default function Scoreboard({
  goals,
  saves,
  misses,
  streak,
  activeShotIndex,
  shotsHistory,
  difficulty,
  onDifficultyChange,
  soundEnabled,
  onToggleSound,
  gameState,
}) {
  // Let's declare our typings clearly
  return (
    <div
      id="scoreboard-panel"
      className="w-full max-w-2xl bg-[#FDFBF7] border border-[#d6cfb3] rounded-2xl p-4 md:p-6 mb-4 shadow-[0_12px_24px_rgba(0,0,0,0.15)] relative"
    >
      {/* Decorative top natural moss gradient line */}
      <div className="absolute top-0 left-10 right-10 h-[2.5px] bg-gradient-to-r from-transparent via-[#3D5A32] to-transparent" />

      {/* Main Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Left Side: Brand and Difficulty */}
        <div className="flex flex-row md:flex-col items-center md:items-start justify-between w-full md:w-auto gap-1">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-[#5D3E28] font-black font-sans leading-none mb-1">
              Match Tournament
            </span>
            <h1 className="font-serif font-black text-xl md:text-2xl text-[#223322] italic tracking-tight leading-none">
              Classic Penalty Shootout
            </h1>
          </div>
          
          {/* Difficulty Pickers (Disabled during active kick) */}
          <div className="flex gap-1 bg-[#f4ebd0]/50 p-0.5 rounded-lg border border-[#d6cfb3] mt-1">
            {["easy", "normal", "hard"].map((diff) => (
              <button
                key={diff}
                id={`btn-diff-${diff}`}
                disabled={gameState === "shooting"}
                onClick={() => onDifficultyChange(diff)}
                className={`py-1 px-2.5 text-2xs md:text-xs font-display font-semibold rounded-md transition-all uppercase ${
                  difficulty === diff
                    ? "bg-[#3D5A32] text-[#FDFBF7] shadow-sm"
                    : "text-[#5D3E28] hover:text-[#223322] hover:bg-[#eadebe] disabled:opacity-50"
                }`}
              >
                {diff === "easy" ? "Rookie" : diff === "normal" ? "Pro" : "Champion"}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Digital Scoreboard in Organic Night Pitch color */}
        <div className="flex items-center gap-6 bg-[#223322] py-2.5 px-6 rounded-2xl border border-[#1A2E1A] shadow-lg">
          {/* Goals (User) */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-sans tracking-widest text-[#C2B280] font-bold">Player</span>
            <span className="font-mono font-extrabold text-2xl md:text-3xl text-[#FDFBF7] tracking-widest leading-none">
              {String(goals).padStart(2, "0")}
            </span>
          </div>

          {/* VS colon */}
          <div className="flex flex-col justify-center items-center h-full">
            <span className="text-xl md:text-2xl font-serif text-[#C2B280] font-bold animate-pulse">:</span>
          </div>

          {/* Keeper Saves */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-sans tracking-widest text-[#E58F65] font-bold">GK (AI)</span>
            <span className="font-mono font-extrabold text-2xl md:text-3xl text-[#FDFBF7] tracking-widest leading-none">
              {String(saves).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Right Side: High Streak & Sound Toggle */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
          {/* Active streak */}
          {streak > 0 ? (
            <div className="flex items-center gap-1 bg-[#E58F65]/15 border border-[#E58F65]/35 py-1 px-3 rounded-full text-[#E58F65] text-xs font-bold animate-bounce mt-1">
              <Flame className="w-3.5 h-3.5 fill-[#E58F65] text-[#E58F65]" />
              <span>Streak: {streak}</span>
            </div>
          ) : (
            <div className="text-[#a1997d] text-xs py-1 px-2 font-medium">Shoot to start streak</div>
          )}

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled
                ? "bg-[#eadebe]/50 border-[#d6cfb3] text-[#3D5A32] hover:bg-[#eadebe]"
                : "bg-[#f4ebd0]/30 border-transparent text-slate-400 hover:text-[#5D3E28]"
            }`}
            title={soundEnabled ? "Mute Game" : "Unmute Game"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Bottom Bar: 5-Chances Tracker */}
      <div className="mt-4 pt-3 border-t border-[#d6cfb3]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        
        {/* Active Shot Status */}
        <span className="text-xs font-semibold text-[#5D3E28]">
          {gameState === "game_over" ? (
            <span className="text-[#3D5A32] font-black">Tournament Finished!</span>
          ) : (
            <>
              Attempt <span className="text-[#223322] font-black">{Math.min(activeShotIndex + 1, 5)}</span> of <span className="text-[#223322] font-black">5</span>
            </>
          )}
        </span>

        {/* The 5 round slots filled with moss colors */}
        <div className="flex items-center gap-2.5">
          {Array.from({ length: 5 }).map((_, index) => {
            const history = shotsHistory[index];
            const isActive = index === activeShotIndex && gameState !== "game_over";

            // Determine display styles for the bullet node in Natural Tones style
            let nodeBg = "bg-[#f4ebd0]/30 border-[#d6cfb3]";
            let shadowStyle = "";
            let innerDot = null;

            if (history === "goal") {
              // Smooth Olive goal slot
              nodeBg = "bg-[#3D5A32] border-[#223322]";
              shadowStyle = "shadow-[0_2px_4px_rgba(61,90,50,0.3)]";
              innerDot = <div className="w-2 h-2 rounded-full bg-[#fdfbf7]" />;
            } else if (history === "save" || history === "post" || history === "out") {
              // Classic wood/clay sand color
              nodeBg = "bg-[#8B5E3C] border-[#5D3E28]";
              shadowStyle = "shadow-[x]";
              innerDot = (
                <div className="text-[9px] font-extrabold text-[#FDFBF7] uppercase leading-none select-none">
                  X
                </div>
              );
            } else if (isActive) {
              // Active slot alert
              nodeBg = "bg-[#FDFBF7] border-[#3D5A32] border-2 animate-pulse";
              shadowStyle = "shadow-[0_0_8px_rgba(61,90,50,0.4)]";
              innerDot = <div className="w-1.5 h-1.5 rounded-full bg-[#3D5A32]" />;
            }

            return (
              <div
                key={index}
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 relative ${nodeBg} ${shadowStyle}`}
                title={`Shot ${index + 1}: ${history ? history.toUpperCase() : "Pending"}`}
              >
                {innerDot}
                {/* Visual tooltip */}
                <span className="absolute -top-6 text-[10px] bg-[#223322] text-[#FDFBF7] py-0.5 px-1.5 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Shoot {index + 1}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
