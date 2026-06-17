import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RotateCcw,
  Sparkles,
  Info,
  Play,
} from "lucide-react";
import Scoreboard from "./components/Scoreboard";
import Goalkeeper from "./components/Goalkeeper";
import {
  playKickSound,
  playSaveSound,
  playGoalSound,
  playWhistleSound,
  playPostSound,
  playCrowdDisappointment,
} from "./utils/audio";

// Type definitions
type Direction = "left" | "center" | "right";
type Elevation = "top" | "medium" | "bottom";
type Sector = `${Direction}-${Elevation}`;
type Outcome = "goal" | "save" | "post" | "out";

interface Particle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
  duration: number;
}

export default function App() {
  // Game states
  const [goals, setGoals] = useState(0);
  const [saves, setSaves] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const [shotsHistory, setShotsHistory] = useState<Array<"goal" | "save" | "post" | "out" | null>>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Ball & Keeper status
  const [gameState, setGameState] = useState<"idle" | "shooting" | "round_end" | "game_over">("idle");
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [selectedElevation, setSelectedElevation] = useState<Elevation | null>(null);
  const [hoveredDirection, setHoveredDirection] = useState<Direction | null>(null);
  const [hoveredSector, setHoveredSector] = useState<Sector | null>(null);

  // Physics coordinates expressed in % of parent Arena container
  // Spot position (the penalty kick spot in the foreground)
  const spotX = 50;
  const spotY = 90;

  const [ballX, setBallX] = useState(spotX);
  const [ballY, setBallY] = useState(spotY);
  const [ballScale, setBallScale] = useState(1.1);
  const [ballRotation, setBallRotation] = useState(0);
  const [ballState, setBallState] = useState<"spot" | "flying" | "goal" | "saved" | "post_bounce">("spot");

  // Goalkeeper coordinates (Centered starting coords)
  const idleKeeperX = 50;
  const idleKeeperY = 56;
  const [keeperX, setKeeperX] = useState(idleKeeperX);
  const [keeperY, setKeeperY] = useState(idleKeeperY);
  const [keeperState, setKeeperState] = useState<"idle" | "diving" | "glory_save" | "disappointed">("idle");
  const [diveDirection, setDiveDirection] = useState<Direction | null>(null);
  const [diveElevation, setDiveElevation] = useState<Elevation | null>(null);

  // GUI Feedback overlay text
  const [feedback, setFeedback] = useState("CHOOSE YOUR ANGLE");
  const [subFeedback, setSubFeedback] = useState("Click on any sector in the net or use the kicker buttons!");
  const [showGoalFlash, setShowGoalFlash] = useState(false);
  const [netBulging, setNetBulging] = useState(false);

  // Particles state
  const [particles, setParticles] = useState<Particle[]>([]);

  // Sound play handler that respects mute toggle
  const triggerSound = (fn: () => void) => {
    if (soundEnabled) {
      fn();
    }
  };

  // Kick sound at initial interaction if context suspended
  useEffect(() => {
    // Play initial whitle sound on startup to welcome user
    const timer = setTimeout(() => {
      triggerSound(playWhistleSound);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Utility to launch graphics particles in % metrics
  const spawnParticles = (x: number, y: number, colorPreset: "gold" | "neon" | "glove" | "woodwork") => {
    const newParticles: Particle[] = [];
    const count = 35;
    const colors =
      colorPreset === "gold"
        ? ["#f59e0b", "#fbbf24", "#fcd34d", "#10b981", "#34d399"] // Gold and green starburst
        : colorPreset === "glove"
        ? ["#14b8a6", "#2dd4bf", "#06b6d4", "#ffffff"] // Turquoise blocks
        : colorPreset === "woodwork"
        ? ["#e2e8f0", "#94a3b8", "#64748b", "#cbd5e1"] // Silver sparks
        : ["#ec4899", "#f43f5e", "#d946ef", "#ffffff"]; // Neon pink magenta

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spreadDistX = (Math.random() * 20 + 8) * (Math.random() > 0.5 ? 1 : -1);
      const spreadDistY = (Math.random() * 15 + 5) * -1; // bias upwards

      newParticles.push({
        id: Date.now() + i + Math.random(),
        startX: x,
        startY: y,
        endX: x + spreadDistX,
        endY: y + spreadDistY,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        duration: Math.random() * 0.5 + 0.5,
      });
    }
    setParticles(newParticles);
  };

  // Handle difficulty setup
  const handleDifficultyChange = (diff: "easy" | "normal" | "hard") => {
    setDifficulty(diff);
  };

  // Reset core series
  const restartTournament = () => {
    setGoals(0);
    setSaves(0);
    setMisses(0);
    setStreak(0);
    setActiveShotIndex(0);
    setShotsHistory([null, null, null, null, null]);
    setGameState("idle");
    setFeedback("AIM YOUR SHOT!");
    setSubFeedback("Take a penalty in rookies, pro or champion series!");
    resetBallAndKeeper();
    triggerSound(playWhistleSound);
  };

  // Prepare next attempt
  const nextRound = () => {
    if (activeShotIndex >= 4) {
      setGameState("game_over");
      return;
    }
    setActiveShotIndex((prev) => prev + 1);
    setGameState("idle");
    setFeedback("TAKE YOUR AIM!");
    setSubFeedback("Click on Left, Center, or Right to take the penalty!");
    resetBallAndKeeper();
  };

  const resetBallAndKeeper = () => {
    // Ball on spot
    setBallX(spotX);
    setBallY(spotY);
    setBallScale(1.1);
    setBallRotation(0);
    setBallState("spot");

    // Goalkeeper centered
    setKeeperX(idleKeeperX);
    setKeeperY(idleKeeperY);
    setKeeperState("idle");
    setDiveDirection(null);
    setDiveElevation(null);

    setSelectedDirection(null);
    setSelectedElevation(null);
    setNetBulging(false);
    setShowGoalFlash(false);
  };

  // CORE SHOOT FUNCTION
  const shoot = (dir: Direction, elevParam?: Elevation) => {
    if (gameState !== "idle") return;

    setGameState("shooting");
    setSelectedDirection(dir);

    // Roll random elevation if not explicitly provided (e.g. from buttons)
    const rolledElev: Elevation = elevParam || (["top", "medium", "bottom"][Math.floor(Math.random() * 3)] as Elevation);
    setSelectedElevation(rolledElev);

    // Play referee kick whistle and foot kick thump
    triggerSound(playKickSound);

    // Coordinate randomness offset inside target sector boundaries
    // Goal boundaries in Arena: Left Post X ~ 15%, Right Post X ~ 85%, Crossbar Y ~ 30%, Ground Y ~ 65%
    let targetX = 50;
    let targetY = 48;

    // Direction setups
    if (dir === "left") {
      targetX = Math.random() * 14 + 18; // 18% to 32%
    } else if (dir === "center") {
      targetX = Math.random() * 10 + 45; // 45% to 55%
    } else if (dir === "right") {
      targetX = Math.random() * 14 + 68; // 68% to 82%
    }

    // Elevation setups
    if (rolledElev === "top") {
      targetY = Math.random() * 7 + 33; // 33% to 40% (high upper corners)
    } else if (rolledElev === "medium") {
      targetY = Math.random() * 7 + 45; // 45% to 52% (mid altitude)
    } else if (rolledElev === "bottom") {
      targetY = Math.random() * 5 + 57; // 57% to 62% (close to grass line)
    }

    // Goalkeeper AI decision making
    // Determine the direction keeper dives
    let gkDir: Direction = "center";
    let gkElev: Elevation = "medium";

    // Establish saving probabilities depending on selected game difficulty
    // Rookie: Goalie usually guesses wrong side
    // Normal: Goalie is balanced random guesser
    // Champion: Goalie anticipates side very well
    const sideRand = Math.random();
    let guessedCorrectSide = false;

    if (difficulty === "easy") {
      guessedCorrectSide = sideRand < 0.22; // 22% correct side guess
    } else if (difficulty === "normal") {
      guessedCorrectSide = sideRand < 0.40; // 40% correct side guess
    } else {
      guessedCorrectSide = sideRand < 0.62; // 62% of time guesses your side!
    }

    if (guessedCorrectSide) {
      gkDir = dir;
      // High chance of guessing correct elevation too when guessed correct side
      gkElev = Math.random() < 0.7 ? rolledElev : (["top", "medium", "bottom"][Math.floor(Math.random() * 3)] as Elevation);
    } else {
      // Divert keeper to a wrong zone. Select randomly from other zones
      const otherDirs = (["left", "center", "right"] as const).filter((d) => d !== dir);
      gkDir = otherDirs[Math.floor(Math.random() * otherDirs.length)];
      gkElev = ["top", "medium", "bottom"][Math.floor(Math.random() * 3)] as Elevation;
    }

    setDiveDirection(gkDir);
    setDiveElevation(gkElev);

    // Determine numerical anchor points of the AI goalkeeper
    let gkTargetX = idleKeeperX;
    let gkTargetY = idleKeeperY;

    if (gkDir === "left") {
      gkTargetX = gkElev === "bottom" ? 23 : 26;
      gkTargetY = gkElev === "top" ? 36 : gkElev === "medium" ? 48 : 59;
    } else if (gkDir === "center") {
      gkTargetX = 50;
      gkTargetY = gkElev === "top" ? 35 : gkElev === "medium" ? 50 : 59;
    } else if (gkDir === "right") {
      gkTargetX = gkElev === "bottom" ? 77 : 74;
      gkTargetY = gkElev === "top" ? 36 : gkElev === "medium" ? 48 : 59;
    }

    // Introduce woodworks luck - very rare chance of hitting crossbar or posts
    // If target rolls are right near boundaries (X ~ 15% or 85%, or Y ~ 30%)
    let outcome: Outcome = "goal";
    
    const nearLeftPost = Math.abs(targetX - 15) < 2.5;
    const nearRightPost = Math.abs(targetX - 85) < 2.5;
    const nearCrossbar = Math.abs(targetY - 30) < 2.2;
    const woodworkChance = Math.random() < 0.08; // 8% woodwork chance in outer regions

    const hittingWoodwork = woodworkChance && (nearLeftPost || nearRightPost || nearCrossbar);

    // Compute actual Cartesian distance between the ball's final center and the keeper's hands/body
    const distanceToKeeper = Math.sqrt(Math.pow(targetX - gkTargetX, 2) + Math.pow(targetY - gkTargetY, 2));

    // GK saving reach radius in percentage
    const reachRadius = difficulty === "easy" ? 9.5 : difficulty === "normal" ? 11.5 : 13.5;

    // Calculate match outcomes
    if (hittingWoodwork) {
      outcome = "post";
    } else if (distanceToKeeper <= reachRadius) {
      outcome = "save";
    } else {
      outcome = "goal";
    }

    // Sequence the animations using staggered timers
    // Phase 1: Keepers dive fast and the ball flies to the selected target
    setKeeperState("diving");
    setKeeperX(gkTargetX);
    setKeeperY(gkTargetY);

    setBallState("flying");
    setBallX(targetX);
    setBallY(targetY);
    setBallScale(0.38); // shrinks to create perspective depth
    setBallRotation(Math.random() * 720 + 360); // fast continuous spin

    // Phase 2: Ball reaches goalie line / net (600ms transition time)
    setTimeout(() => {
      if (outcome === "save") {
        // SAVED!
        setKeeperState("glory_save");
        setBallState("saved");
        triggerSound(playSaveSound);
        spawnParticles(targetX, targetY, "glove");

        // Ball rebound physics: bounces back onto grass
        const reboundX = targetX + (Math.random() * 8 - 4) + (gkDir === "left" ? 6 : gkDir === "right" ? -6 : 0);
        const reboundY = 68 + Math.random() * 4;
        setBallX(reboundX);
        setBallY(reboundY);
        setBallScale(0.55);
        setBallRotation(ballRotation + 180);

        // Update scores
        setSaves((prev) => prev + 1);
        setStreak(0); // break streak
        setFeedback("WHAT A SAVE!");
        
        // Choose descriptive goalkeeper glove text
        const saveMsgs = [
          "The keeper guesses correctly and pulls off an amazing stretch!",
          "Unbelievable dynamic reflexes from the net minder!",
          "Safe hands! Goalkeeper intercepts with pristine technique.",
        ];
        setSubFeedback(saveMsgs[Math.floor(Math.random() * saveMsgs.length)]);
        triggerSound(playCrowdDisappointment);

      } else if (outcome === "post") {
        // HIT WOODWORK!
        setBallState("post_bounce");
        triggerSound(playPostSound);
        spawnParticles(targetX, targetY, "woodwork");

        // Shaking physical reaction of goal frame
        setNetBulging(true);

        // Heavy deflection physics
        let reboundX = targetX;
        let reboundY = 74;
        if (targetX < 30) {
          reboundX = 8 + Math.random() * 5; // ricochet wide left
        } else if (targetX > 70) {
          reboundX = 92 - Math.random() * 5; // ricochet wide right
        } else {
          reboundY = 48 + Math.random() * 8; // high bounce back
          reboundX = targetX + (Math.random() * 12 - 6);
        }

        setBallX(reboundX);
        setBallY(reboundY);
        setBallScale(0.6);
        setBallRotation(ballRotation + 240);

        setMisses((prev) => prev + 1);
        setStreak(0);
        setFeedback("CLANG! THE POST!");
        setSubFeedback("Stunning shot, but denied by the woodwork!");
        triggerSound(playCrowdDisappointment);

      } else {
        // GOOAAALLL!!!
        setKeeperState("disappointed");
        setBallState("goal");
        setNetBulging(true);
        setShowGoalFlash(true);
        triggerSound(playGoalSound);
        spawnParticles(targetX, targetY, "gold");

        // Ball drops heavily inside the net
        setTimeout(() => {
          setBallY((prev) => prev + 6); // drops down to floor
          setBallScale(0.35);
        }, 150);

        setGoals((prev) => prev + 1);
        setStreak((prev) => prev + 1);
        setFeedback("GOOOAAALLL!!!");

        // Random descriptive goal texts based on target location
        let goalMsg = "Beautiful penalty kick!";
        if (rolledElev === "top") {
          goalMsg = "Sensational strike into the absolute top shelf!";
        } else if (dir === "center") {
          goalMsg = "Punched right down the throat of the goal net!";
        } else {
          goalMsg = "Clinical, driven penalty right on the carpet.";
        }
        setSubFeedback(goalMsg);
      }

      // Record the result index
      const updatedHistory = [...shotsHistory];
      updatedHistory[activeShotIndex] = outcome;
      setShotsHistory(updatedHistory);

      // Phase 3: Settle the round and transition states
      setTimeout(() => {
        if (activeShotIndex >= 4) {
          setGameState("game_over");
          setFeedback("SERIES COMPLETED!");
          
          // Generate final performance rating
          const scored = updatedHistory.filter((x) => x === "goal").length;
          if (scored === 5) {
            setSubFeedback("PEAK CRISTIANO! 5/5 shots scored. World Champion status!");
          } else if (scored >= 3) {
            setSubFeedback(`VICTORY! Scored ${scored}/5 goals. You won the shootout series!`);
          } else {
            setSubFeedback(`DEFEAT! Only scored ${scored}/5. The goalkeeper dominated the series.`);
          }
        } else {
          setGameState("round_end");
        }
      }, 1200);

    }, 600);
  };

  // Helper rating display for the game_over trophy banner
  const getRatingTier = () => {
    if (goals === 5) return { title: "Golden Boot Pundit", color: "text-[#3D5A32]" };
    if (goals >= 3) return { title: "Clinical Finisher", color: "text-[#8B5E3C]" };
    return { title: "Subbed Off!", color: "text-[#E58F65]" };
  };

  return (
    <div className="w-full min-h-screen bg-[#223322] flex flex-col items-center justify-start p-3 sm:p-6 select-none font-sans relative overflow-hidden">
      
      {/* Immersive Stadium Ambient background lights - Soft Warm Natural light */}
      <div className="absolute top-0 left-0 right-0 h-[380px] bg-gradient-to-b from-[#3D5A32]/20 via-transparent to-transparent pointer-events-none" />

      {/* Main Container Layout */}
      <div className="w-full max-w-2xl flex flex-col items-center relative z-10">
        
        {/* Score Board Dashboard component */}
        <Scoreboard
          goals={goals}
          saves={saves}
          misses={misses}
          streak={streak}
          activeShotIndex={activeShotIndex}
          shotsHistory={shotsHistory}
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          gameState={gameState}
        />

        {/* Dynamic Visual Arena Box */}
        <div
          id="stadium-arena"
          className={`w-full aspect-[1.3/1] rounded-2xl relative shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden border border-[#bfae96] bg-[#1A2E1A] transition-all duration-300 ${
            showGoalFlash ? "ring-4 ring-[#3D5A32]/40" : ""
          }`}
        >
          {/* Night Stadium background scene */}
          <div className="absolute inset-0 pitch-gradient" />

          {/* Glowing Floodlights / Warm sun/moon spots on the horizon */}
          <div className="absolute top-0 inset-x-0 h-20 flex justify-between px-16 pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-[#f4ebd0]/10 blur-xl animate-pulse" />
            <div className="w-20 h-20 rounded-full bg-[#C2B280]/5 blur-2xl" />
            <div className="w-14 h-14 rounded-full bg-[#f4ebd0]/10 blur-xl animate-pulse" />
          </div>

          {/* Goal Line & Grass Separation */}
          <div className="absolute top-[32%] inset-x-0 h-[1.5px] bg-white/15 whitespace-normal" />

          {/* Emerald Green Grass Field Pitch with alternate perspective stripe strips */}
          <div className="absolute top-[32%] bottom-0 left-0 right-0 overflow-hidden bg-gradient-to-t from-[#1A2E1A] via-[#2A4422] to-[#3D5A32]">
            {/* Perspective turf stripes */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.12)_24px,transparent_0px)] bg-repeat-y origin-top transform scale-y-110" />
            <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            
            {/* White Goal Line painted on grass */}
            <div className="absolute top-[1.5px] left-[15%] right-[15%] h-[1.5px] bg-slate-100/30" />

            {/* White D penalty box arcs painted */}
            <div className="absolute bottom-[20%] left-[25%] right-[25%] h-[2px] border-t-2 border-white/10 rounded-t-[50%] opacity-25 pointer-events-none" />

            {/* Penalty Spot */}
            <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-4 h-2.5 bg-white/70 rounded-full blur-[1px] opacity-85 shadow-md">
              <div className="w-full h-full bg-white/30 border border-[#1A2E1A] rounded-full animate-ping opacity-20" />
            </div>
          </div>

          {/* -------------------- SVG GOAL CONTENT -------------------- */}
          {/* Goal lies from X=15% to 85% and Y=30% to 65% of Arena container height */}
          <div className="absolute top-[12%] left-[12%] right-[12%] h-[53%] select-none z-0">
            
            {/* Goal Netting lines drawn via stylish CSS grid with Framer motion bulge bulge */}
            <motion.div
              id="goal-netting"
              animate={netBulging ? { scaleY: [1, 1.05, 0.98, 1], scaleX: [1, 1.02, 0.99, 1] } : {}}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className={`absolute inset-[10px] bg-[#1A2E1A]/40 border border-[#bfae96]/20 rounded-md backdrop-blur-[0.5px] transition-all duration-300 goal-net ${
                netBulging ? "bg-[#3D5A32]/10 border-white/30" : ""
              }`}
            />

            {/* White Steel Goalposts */}
            {/* Crossbar */}
            <div className="absolute top-[10px] left-[10px] right-[10px] h-2.5 bg-slate-100 border-b border-slate-300 rounded-sm shadow-md flex justify-between items-center z-10">
              <div className="w-1 h-2 bg-slate-400/40" />
              <div className="w-1 h-2 bg-slate-400/40" />
            </div>
            {/* Left Post */}
            <div className="absolute top-[10px] bottom-0 left-[10px] w-2.5 bg-gradient-to-r from-slate-100 to-slate-200 border-r border-slate-300 z-10" />
            {/* Right Post */}
            <div className="absolute top-[10px] bottom-0 right-[10px] w-2.5 bg-gradient-to-l from-slate-100 to-slate-200 border-l border-slate-300 z-10" />
            
            {/* Inner shadows for posts to give 3D feel */}
            <div className="absolute top-[10px] bottom-0 left-[12.5px] w-[1px] bg-black/15 z-10" />
            <div className="absolute top-[10px] bottom-0 right-[12.5px] w-[1px] bg-black/15 z-10" />

            {/* Goal line grass area inside net */}
            <div className="absolute bottom-0 left-[10px] right-[10px] h-[6px] bg-emerald-950/20 blur-[1.5px]" />
          </div>

          {/* Goalkeeper character overlay */}
          <Goalkeeper
            state={keeperState}
            targetX={keeperX}
            targetY={keeperY}
            diveDirection={diveDirection}
            diveElevation={diveElevation}
          />

          {/* Direct Shoot Interactive Grid: 9 sectors inside goal */}
          {/* Lies exactly on X=15% (inside Left Post) to 85% (inside Right Post) and Y=30% to 65% */}
          {gameState === "idle" && (
            <div
              id="goal-mouth-grid"
              className="absolute top-[15%] bottom-[35%] left-[15%] right-[15%] grid grid-cols-3 grid-rows-3 z-20 gap-1 p-1"
            >
              {(["top", "medium", "bottom"] as elevation[]).map((elev) => {
                return (["left", "center", "right"] as direction[]).map((dir) => {
                  const sectorName: Sector = `${dir}-${elev}`;
                  const isHovered = hoveredSector === sectorName;
                  
                  return (
                    <button
                      key={sectorName}
                      id={`grid-cell-${sectorName}`}
                      onMouseEnter={() => {
                        setHoveredSector(sectorName);
                        setHoveredDirection(dir);
                      }}
                      onMouseLeave={() => {
                        setHoveredSector(null);
                        setHoveredDirection(null);
                      }}
                      onClick={() => shoot(dir, elev)}
                      className="group relative flex items-center justify-center rounded transition-all duration-300 overflow-hidden cursor-pointer bg-transparent hover:bg-[#E58F65]/5 border border-transparent hover:border-[#E58F65]/35 shadow-sm"
                      title={`Shoot targets: ${dir.toUpperCase()} - ${elev.toUpperCase()}`}
                    >
                      {/* Cool Neon Corner crosshair targets on hover */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-1 border border-[#E58F65]/40 rounded flex items-center justify-center pointer-events-none"
                          >
                            {/* Reticle brackets */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#E58F65]" />
                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#E58F65]" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#E58F65]" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#E58F65]" />
                            
                            {/* Aim Text */}
                            <motion.span
                              animate={{ opacity: [0.6, 1, 0.6] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              className="text-[9px] font-display font-extrabold uppercase text-[#E58F65] tracking-wider bg-[#223322]/90 px-1 py-0.5 rounded shadow"
                            >
                              AIM
                            </motion.span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                });
              })}
            </div>
          )}

          {/* -------------------- PLAYING BALL OBJECT -------------------- */}
          {/* Physically simulated ball */}
          <motion.div
            id="soccer-ball"
            className="absolute z-30 pointer-events-none origin-center"
            animate={{
              left: `${ballX}%`,
              top: `${ballY}%`,
              scale: ballScale,
              rotate: ballRotation,
              x: "-50%",
              y: "-50%",
            }}
            transition={{
              type: "tween",
              duration: ballState === "flying" ? 0.6 : 0.45,
              ease: "easeOut",
            }}
            style={{
              width: "48px",
              height: "48px",
            }}
          >
            {/* Sphere vector shadows of soccer ball */}
            <div className="w-full h-full relative select-none">
              
              {/* Ball shadow following on the pitch grass under the ball (Only during spot and low flight) */}
              {ballState === "spot" && (
                <div className="absolute top-[80%] left-[-4px] right-[-4px] h-[10px] bg-black/40 rounded-full blur-[2px] pointer-events-none z-[-1]" />
              )}

              {/* Soccer ball skin pattern */}
              <svg viewBox="0 0 100 100" className="w-[100%] h-[100%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                {/* Outer sphere shading */}
                <defs>
                  <radialGradient id="ballShade" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="60%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#64748b" />
                  </radialGradient>
                </defs>
                
                {/* Ball Round Base */}
                <circle cx="50" cy="50" r="48" fill="url(#ballShade)" stroke="#27272a" strokeWidth="2.5" />
                
                {/* Traditional Hexagonal leather templates */}
                {/* Center Hexagon */}
                <polygon points="50,32 65,43 59,60 41,60 35,43" fill="#18181b" stroke="#18181b" strokeWidth="1" />
                
                {/* Spreading line connectors to edge */}
                <line x1="50" y1="32" x2="50" y2="2" stroke="#27272a" strokeWidth="3" />
                <line x1="65" y1="43" x2="93" y2="35" stroke="#27272a" strokeWidth="3" />
                <line x1="59" y1="60" x2="80" y2="88" stroke="#27272a" strokeWidth="3" />
                <line x1="41" y1="60" x2="20" y2="88" stroke="#27272a" strokeWidth="3" />
                <line x1="35" y1="43" x2="7" y2="35" stroke="#27272a" strokeWidth="3" />

                {/* Sub hex panels on outer rim */}
                <polygon points="50,2 66,10 50,32 34,10" fill="none" stroke="#27272a" strokeWidth="2" />
                <polygon points="93,35 98,54 65,43" fill="none" stroke="#27272a" strokeWidth="2" />
                <polygon points="80,88 62,98 59,60" fill="none" stroke="#27272a" strokeWidth="2" />
                <polygon points="20,88 38,98 41,60" fill="none" stroke="#27272a" strokeWidth="2" />
                <polygon points="7,35 2,54 35,43" fill="none" stroke="#27272a" strokeWidth="2" />
              </svg>
            </div>
          </motion.div>

          {/* Particle Effects layers */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none z-40 shadow-sm"
              style={{
                backgroundColor: p.color,
                width: `${p.size}px`,
                height: `${p.size}px`,
                boxShadow: `0 0 10px ${p.color}`,
              }}
              initial={{ left: `${p.startX}%`, top: `${p.startY}%`, opacity: 1, scale: 1 }}
              animate={{ left: `${p.endX}%`, top: `${p.endY}%`, opacity: 0, scale: 0 }}
              transition={{ duration: p.duration, ease: "easeOut" }}
            />
          ))}

          {/* Goal highlight column overlays on footer-button mouse hovering */}
          {hoveredDirection && (
            <div
              className="absolute top-[13%] bottom-[32%] pointer-events-none z-10 transition-all duration-300 border-x border-dashed border-[#3D5A32]/35 bg-[#3D5A32]/10 animate-pulse"
              style={{
                left: hoveredDirection === "left" ? "15%" : hoveredDirection === "center" ? "38%" : "61%",
                width: "24%",
              }}
            />
          )}

          {/* Goal post flashing overlay screen */}
          <AnimatePresence>
            {showGoalFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-[#3D5A32] pointer-events-none z-20"
              />
            )}
          </AnimatePresence>

          {/* Post game summary scorecard popup board */}
          <AnimatePresence>
            {gameState === "game_over" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-[#FDFBF7]/98 border border-[#d6cfb3] flex flex-col items-center justify-center p-6 z-40 text-center shadow-2xl"
              >
                {/* Confetti or Trophy icon */}
                <motion.div
                  initial={{ rotate: -15, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1.1 }}
                  transition={{ delay: 0.1, duration: 0.8, type: "spring", bounce: 0.4 }}
                  className="w-16 h-16 bg-[#3D5A32] rounded-2xl flex items-center justify-center shadow-md mb-4"
                >
                  <Sparkles className="w-8 h-8 text-[#FDFBF7]" />
                </motion.div>

                <h2 className="font-serif font-black text-2xl md:text-3xl text-[#223322] italic tracking-tight leading-none">
                  Series Completed
                </h2>
                
                {/* Rating tier */}
                <p className={`font-sans text-xs md:text-sm font-black uppercase mt-1 tracking-wider ${getRatingTier().color}`}>
                  {getRatingTier().title}
                </p>

                {/* Score results row */}
                <div className="grid grid-cols-3 gap-4 min-w-[280px] bg-[#f4ebd0]/55 border border-[#d6cfb3] p-4 rounded-xl mt-4 mb-5">
                  <div className="flex flex-col">
                    <span className="text-3xs uppercase font-extrabold text-[#8B5E3C] tracking-wider">Scored</span>
                    <span className="text-2xl font-mono font-black text-[#3D5A32]">{goals}</span>
                    <span className="text-[10px] text-[#5D3E28] font-semibold">Goals</span>
                  </div>
                  <div className="flex flex-col border-x border-[#d6cfb3]">
                    <span className="text-3xs uppercase font-extrabold text-[#8B5E3C] tracking-wider">Saved</span>
                    <span className="text-2xl font-mono font-black text-[#8B5E3C]">{saves}</span>
                    <span className="text-[10px] text-[#5D3E28] font-semibold font-semibold">Blocks</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xs uppercase font-extrabold text-[#8B5E3C] tracking-wider">Missed</span>
                    <span className="text-2xl font-mono font-black text-[#5D3E28]">{misses}</span>
                    <span className="text-[10px] text-[#5D3E28] font-semibold">Off Post</span>
                  </div>
                </div>

                <p className="text-xs text-[#5D3E28] font-medium max-w-sm leading-relaxed mb-6">
                  {subFeedback} Play another round with different difficulty configurations to hone your striker skills!
                </p>

                {/* Restart clickers */}
                <button
                  id="reset-game-btn"
                  onClick={restartTournament}
                  className="flex items-center gap-2 py-3 px-8 btn-nature text-[#FDFBF7] font-sans font-bold text-sm rounded-xl uppercase shadow-md hover:scale-105 active:scale-95 transition-all pointer-events-auto cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-[#FDFBF7]" />
                  <span>PLAY AGAIN</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* -------------------- KICKER CONTROL CONSOLE -------------------- */}
        {/* Dynamic status comments display box */}
        <div id="commentary-box" className="w-full text-center py-3 px-4 my-2.5">
          <motion.div
            key={feedback}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center"
          >
            <h3 className="text-xs uppercase font-sans font-black text-[#E58F65] tracking-widest leading-none">
              {feedback}
            </h3>
            <p className="text-[11px] sm:text-xs text-[#FDFBF7]/80 font-medium mt-1 leading-snug">
              {subFeedback}
            </p>
          </motion.div>
        </div>

        {/* Action button rows for kicking */}
        <div className="w-full grid grid-cols-3 gap-3 md:gap-4 p-1">
          {(["left", "center", "right"] as direction[]).map((dir) => {
            let directIcon = "←";
            if (dir === "center") directIcon = "↑";
            if (dir === "right") directIcon = "→";

            return (
              <button
                key={dir}
                id={`shoot-btn-${dir}`}
                disabled={gameState === "shooting" || gameState === "game_over"}
                onMouseEnter={() => setHoveredDirection(dir)}
                onMouseLeave={() => setHoveredDirection(null)}
                onClick={() => shoot(dir)}
                className={`py-3.5 px-3 md:py-4 rounded-xl font-sans font-black text-xs md:text-sm tracking-widest uppercase flex flex-col items-center justify-center gap-1.5 transition-all outline-none border ${
                  gameState === "shooting"
                    ? "bg-[#FDFBF7]/20 border-transparent text-stone-500 cursor-not-allowed"
                    : "bg-[#FDFBF7] border-[#d6cfb3] text-[#223322] hover:text-[#3D5A32] hover:border-[#3D5A32] hover:bg-[#f4ebd0]/40 active:translate-y-[2px] active:scale-95 cursor-pointer transform shadow-sm"
                }`}
              >
                <span className="text-lg md:text-xl font-semibold leading-none">{directIcon}</span>
                <span className="text-3xs sm:text-2xs font-extrabold leading-none select-none tracking-widest">
                  SHOOT {dir}
                </span>
              </button>
            );
          })}
        </div>

        {/* Visual progress buttons after rounds settle */}
        <div className="mt-4 flex flex-col items-center">
          {gameState === "round_end" && (
            <motion.button
              id="continue-button"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={nextRound}
              className="py-2.5 px-6 rounded-lg bg-[#3D5A32] hover:bg-[#3D5A32]/85 active:scale-95 text-[#FDFBF7] font-sans font-bold text-xs tracking-wider uppercase shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>{activeShotIndex >= 4 ? "VIEW RESULTS" : "NEXT SHOT"}</span>
              <Play className="w-3.5 h-3.5 fill-[#FDFBF7] text-[#FDFBF7]" strokeWidth={3} />
            </motion.button>
          )}

          {/* Quick instructions / tips banner footer */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[#C2B280]/80 text-3xs sm:text-2xs text-center max-w-sm">
            <Info className="w-3.5 h-3.5 text-[#C2B280] shrink-0" />
            <span>
              <strong className="text-[#FDFBF7]">Pro-Tip:</strong> You can click on the sectors directly inside the goal mouth to aim for corners with precision!
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

// Map typings
type direction = Direction;
type elevation = Elevation;
