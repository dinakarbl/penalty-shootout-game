import React from "react";
import { motion } from "motion/react";

interface GoalkeeperProps {
  state: "idle" | "diving" | "glory_save" | "disappointed";
  targetX: number; // percentage on parent grid (e.g. 50)
  targetY: number; // percentage on parent grid (e.g. 58)
  diveDirection?: "left" | "center" | "right" | null;
  diveElevation?: "top" | "medium" | "bottom" | null;
}

export default function Goalkeeper({
  state,
  targetX,
  targetY,
  diveDirection,
  diveElevation,
}: GoalkeeperProps) {
  // Determine rotation based on state and direction
  let rotation = 0;
  let scaleY = 1.0;
  let scaleX = 1.0;

  if (state === "diving" || state === "glory_save") {
    if (diveDirection === "left") {
      rotation = diveElevation === "bottom" ? -40 : diveElevation === "top" ? -75 : -60;
    } else if (diveDirection === "right") {
      rotation = diveElevation === "bottom" ? 40 : diveElevation === "top" ? 75 : 60;
    } else {
      // Center jump/squat
      rotation = 0;
      if (diveElevation === "top") {
        scaleY = 1.25; // Stretched tall
      } else if (diveElevation === "bottom") {
        scaleY = 0.8;  // Crouched
      }
    }
  } else if (state === "disappointed") {
    rotation = 0;
    scaleY = 0.85; // slumped
  }

  // Goalkeeper colors: Neon cyber pink and teal outfit
  return (
    <motion.div
      id="goalkeeper-wrapper"
      className="absolute pointer-events-none select-none z-10 origin-bottom"
      animate={{
        left: `${targetX}%`,
        top: `${targetY}%`,
        rotate: rotation,
        scaleY: scaleY,
        scaleX: scaleX,
        y: "-50%",
        x: "-50%",
      }}
      transition={{
        type: state === "idle" ? "spring" : "tween",
        stiffness: 80,
        damping: 15,
        duration: state === "idle" ? 0.6 : 0.28,
        ease: "easeOut",
      }}
      style={{
        width: "90px",
        height: "120px",
      }}
    >
      {/* Idle bounce animation */}
      <motion.div
        id="goalkeeper-body-container"
        className="w-full h-full flex flex-col items-center justify-end"
        animate={
          state === "idle"
            ? {
                y: [0, -4, 0],
                scaleY: [1, 1.03, 0.97, 1],
              }
            : {}
        }
        transition={{
          repeat: Infinity,
          duration: 0.9,
          ease: "easeInOut",
        }}
      >
        <svg
          viewBox="0 0 100 130"
          className="w-full h-full drop-shadow-[0_10px_12px_rgba(0,0,0,0.5)]"
        >
          {/* Shadow on grass (drawn inside goalie so it slants with the dive!) */}
          <ellipse
            cx="50"
            cy="124"
            rx={state === "diving" ? "18" : "32"}
            ry="6"
            fill="rgba(0, 0, 0, 0.35)"
          />

          {/* Body structure of the goalkeeper */}
          <g>
            {/* Left Arm & Glove */}
            <motion.g
              id="left-arm"
              className="origin-[25px_50px]"
              animate={
                state === "idle"
                  ? { rotate: [-10, 10, -10] }
                  : state === "diving" && diveDirection === "left"
                  ? { rotate: -120 }
                  : state === "diving" && diveDirection === "right"
                  ? { rotate: 20 }
                  : state === "disappointed"
                  ? { rotate: 80 }
                  : { rotate: -40 } // default stretch
              }
              transition={{ repeat: state === "idle" ? Infinity : 0, duration: 1 }}
            >
              {/* Sleeve */}
              <path d="M 12 55 L 26 48 L 30 54 L 16 62 Z" fill="#E58F65" />
              {/* Arm Skin */}
              <rect x="6" y="58" width="8" height="12" rx="4" fill="#C2B280" />
              {/* Giant Glove */}
              <circle cx="10" cy="74" r="11" fill="#8B5E3C" />
              <rect x="4" y="68" width="12" height="10" rx="3" fill="#8B5E3C" />
              {/* Glove Accent */}
              <circle cx="10" cy="74" r="5" fill="#FDFBF7" />
            </motion.g>

            {/* Right Arm & Glove */}
            <motion.g
              id="right-arm"
              className="origin-[75px_50px]"
              animate={
                state === "idle"
                  ? { rotate: [10, -10, 10] }
                  : state === "diving" && diveDirection === "right"
                  ? { rotate: 120 }
                  : state === "diving" && diveDirection === "left"
                  ? { rotate: -20 }
                  : state === "disappointed"
                  ? { rotate: -80 }
                  : { rotate: 40 } // default stretch
              }
              transition={{ repeat: state === "idle" ? Infinity : 0, duration: 1 }}
            >
              {/* Sleeve */}
              <path d="M 88 55 L 74 48 L 70 54 L 84 62 Z" fill="#E58F65" />
              {/* Arm Skin */}
              <rect x="86" y="58" width="8" height="12" rx="4" fill="#C2B280" />
              {/* Giant Glove */}
              <circle cx="90" cy="74" r="11" fill="#8B5E3C" />
              <rect x="84" y="68" width="12" height="10" rx="3" fill="#8B5E3C" />
              {/* Glove Accent */}
              <circle cx="90" cy="74" r="5" fill="#FDFBF7" />
            </motion.g>

            {/* Leg Left */}
            <motion.g
              id="leg-left"
              animate={
                state === "diving" && diveDirection === "left"
                  ? { y: -8, x: 5, rotate: -25 }
                  : state === "diving" && diveDirection === "right"
                  ? { y: 2, x: -10, rotate: 15 }
                  : state === "disappointed"
                  ? { y: 2, rotate: 5 }
                  : { y: 0, rotate: 0 }
              }
            >
              {/* Shorts */}
              <rect x="30" y="85" width="16" height="18" fill="#5D3E28" rx="2" />
              {/* Skin */}
              <rect x="34" y="103" width="8" height="12" fill="#C2B280" />
              {/* Natural Sock */}
              <rect x="34" y="112" width="8" height="8" fill="#FDFBF7" />
              {/* Boot */}
              <rect x="30" y="118" width="13" height="6" rx="2" fill="#3D5A32" />
            </motion.g>

            {/* Leg Right */}
            <motion.g
              id="leg-right"
              animate={
                state === "diving" && diveDirection === "right"
                  ? { y: -8, x: -5, rotate: 25 }
                  : state === "diving" && diveDirection === "left"
                  ? { y: 2, x: 10, rotate: -15 }
                  : state === "disappointed"
                  ? { y: 2, rotate: -5 }
                  : { y: 0, rotate: 0 }
              }
            >
              {/* Shorts */}
              <rect x="54" y="85" width="16" height="18" fill="#5D3E28" rx="2" />
              {/* Skin */}
              <rect x="58" y="103" width="8" height="12" fill="#C2B280" />
              {/* Natural Sock */}
              <rect x="58" y="112" width="8" height="8" fill="#FDFBF7" />
              {/* Boot */}
              <rect x="57" y="118" width="13" height="6" rx="2" fill="#3D5A32" />
            </motion.g>

            {/* Torso & Jersey */}
            <path
              d="M 28 54 L 72 54 L 68 88 L 32 88 Z"
              fill="#E58F65" // Terracotta base
            />
            {/* Jersey stripes/decorations */}
            <path d="M 32 54 L 50 88 L 68 54 Z" fill="#5D3E28" opacity="0.8" />
            <path d="M 40 54 L 50 78 L 60 54 Z" fill="#C2B280" opacity="0.9" />
            {/* Number 1 on Jersey */}
            <text
              x="50"
              y="74"
              textAnchor="middle"
              fill="#FDFBF7"
              fontFamily="sans-serif"
              fontWeight="900"
              fontSize="16"
            >
              GK
            </text>

            {/* Head & Face */}
            <g>
              {/* Neck */}
              <rect x="44" y="44" width="12" height="10" fill="#C2B280" />
              {/* Face */}
              <rect x="36" y="24" width="28" height="26" rx="6" fill="#C2B280" />
              
              {/* Hair (Wood brown spikes!) */}
              <path d="M 34 26 L 40 12 L 46 22 L 50 10 L 56 22 L 62 12 L 66 26 Z" fill="#5D3E28" />

              {/* Headband */}
              <rect x="36" y="22" width="28" height="6" fill="#3D5A32" />

              {/* Eyes */}
              {state === "disappointed" ? (
                // Dizzy eyes when conceded
                <g stroke="#ffffff" strokeWidth="2" fill="none">
                  <path d="M 42 32 L 48 38 M 48 32 L 42 38" />
                  <path d="M 52 32 L 58 38 M 58 32 L 52 38" />
                </g>
              ) : state === "glory_save" ? (
                // Happy/confident squinting eyes
                <g stroke="#ffffff" strokeWidth="2.5" fill="none">
                  <path d="M 41 36 Q 45 31 49 36" />
                  <path d="M 51 36 Q 55 31 59 36" />
                </g>
              ) : (
                // Focused goalkeeper eyes with glowing pupils
                <g>
                  <circle cx="45" cy="34" r="3.5" fill="#ffffff" />
                  <circle cx="45" cy="34" r="1.5" fill="#5D3E28" />
                  <circle cx="55" cy="34" r="3.5" fill="#ffffff" />
                  <circle cx="55" cy="34" r="1.5" fill="#5D3E28" />
                </g>
              )}

              {/* Mouth */}
              {state === "disappointed" ? (
                // Sad open mouth
                <path d="M 44 44 Q 50 39 56 44" stroke="#ffffff" strokeWidth="2" fill="none" />
              ) : state === "glory_save" ? (
                // Big smile
                <path d="M 44 41 Q 50 49 56 41" stroke="#ffffff" strokeWidth="2" fill="none" />
              ) : (
                // Neutral focused line
                <line x1="45" y1="43" x2="55" y2="43" stroke="#ffffff" strokeWidth="2" />
              )}
            </g>
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
