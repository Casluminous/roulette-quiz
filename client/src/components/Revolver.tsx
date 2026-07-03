import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RevolverProps {
  bulletsFired: number;
  currentPosition: number;
  isSpinning: boolean;
  isFiring: boolean;
  alive: boolean;
  rotationAngle: number;
}

export function Revolver({ bulletsFired, currentPosition, isSpinning, isFiring, alive, rotationAngle }: RevolverProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Gun Container - Parent handles rotation to target */}
      <motion.div 
        animate={{ rotate: rotationAngle }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="w-[400px] h-[275px] relative flex items-center justify-center pointer-events-none select-none"
        style={{
          transformOrigin: 'center center',
          filter: 'drop-shadow(0px 8px 24px var(--cyan-theme-light))'
        }}
      >
        {/* Inner container handles recoil animation locally */}
        <motion.div
          animate={isFiring ? { 
            x: [0, -15, 4, -1, 0], 
            y: [0, -6, 2, -1, 0], 
            rotate: [0, 4, -1, 0] 
          } : {
            x: 0,
            y: 0,
            rotate: 0
          }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="w-full h-full relative flex items-center justify-center"
        >
          <svg className="w-full h-full" viewBox="0 0 320 220" style={{ color: 'var(--cyan-theme)' }}>
            <defs>
              {/* CAD Hatch Pattern for Grip */}
              <pattern id="gripCADHatch" width="6" height="6" patternUnits="userSpaceOnUse">
                <line x1="0" y1="6" x2="6" y2="0" stroke="var(--cyan-theme)" strokeWidth="0.8" opacity="0.3" />
                <line x1="0" y1="0" x2="6" y2="6" stroke="var(--cyan-theme)" strokeWidth="0.8" opacity="0.3" />
              </pattern>
            </defs>

            {/* =======================================================
                CAD BLUEPRINT WEAPON SCHEMATIC (REVOLVER)
                ======================================================= */}
            
            {/* Grid Coordinates markings in background */}
            <line x1="10" y1="110" x2="310" y2="110" stroke="var(--cyan-theme)" strokeWidth="0.5" strokeDasharray="2,8" opacity="0.2" />
            <line x1="160" y1="10" x2="160" y2="210" stroke="var(--cyan-theme)" strokeWidth="0.5" strokeDasharray="2,8" opacity="0.2" />

            {/* 1. Grip (Báng súng) with CAD Hatching */}
            <path 
              d="M 78 126 
                 C 72 140, 62 160, 42 206 
                 C 40 212, 56 214, 68 214 
                 C 84 214, 102 212, 104 202 
                 C 106 188, 100 182, 102 172 
                 C 104 162, 98 156, 100 146 
                 C 102 138, 98 132, 88 126 Z" 
              fill="url(#gripCADHatch)" 
              stroke="var(--cyan-theme)" 
              strokeWidth="1.2" 
            />
            {/* Grip Inner Border */}
            <path 
              d="M 81 133 
                 C 76 145, 68 162, 48 198 
                 C 50 200, 86 200, 90 193 
                 C 92 183, 88 178, 90 170 
                 C 92 160, 86 154, 88 146 
                 C 90 140, 85 136, 81 133 Z" 
              fill="none" 
              stroke="var(--cyan-theme)" 
              strokeWidth="0.8" 
              strokeDasharray="2,2" 
              opacity="0.6"
            />

            {/* 2. Hammer (Búa gõ) */}
            <motion.g
              style={{ transformOrigin: '76px 86px' }}
              animate={{ 
                rotate: isFiring ? [0, 35, -20, 0] : isSpinning ? 35 : 0 
              }}
              transition={{ 
                duration: isFiring ? 0.22 : isSpinning ? 0.15 : 0,
                ease: "easeInOut"
              }}
            >
              <path
                d="M 76 82 
                   Q 62 66 52 70 
                   Q 60 84 72 86 
                   L 85 86 
                   L 85 82 Z"
                fill="var(--bg-surface)"
                stroke="var(--cyan-theme)"
                strokeWidth="1.2"
              />
              <line x1="53" y1="69" x2="57" y2="72" stroke="var(--cyan-theme)" strokeWidth="0.8" />
              <line x1="55" y1="71" x2="59" y2="74" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            </motion.g>

            {/* 3. Main Frame (Thành súng) */}
            <path 
              d="M 72 74 
                 L 145 74 
                 L 145 120 
                 C 118 120, 105 125, 92 128 
                 L 92 135 
                 L 72 120 
                 L 72 105 
                 C 76 95, 76 80, 72 74 Z" 
              fill="var(--bg-surface)" 
              stroke="var(--cyan-theme)" 
              strokeWidth="1.2" 
            />
            {/* Sideplate split seam lines */}
            <path d="M 88 120 C 88 108, 86 104, 76 104" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.6" />
            
            {/* Flat Screws on Frame */}
            <circle cx="138" cy="126" r="2" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <line x1="136.5" y1="126.5" x2="139.5" y2="125.5" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            
            <circle cx="86" cy="85" r="1.5" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <line x1="85" y1="86" x2="87" y2="84" stroke="var(--cyan-theme)" strokeWidth="0.8" />

            {/* 4. Trigger Guard & Trigger */}
            <path d="M 92 124 C 92 158, 142 158, 142 120 Z" fill="none" stroke="var(--cyan-theme)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="132" cy="136" r="1" fill="var(--cyan-theme)" />

            {/* Trigger */}
            <motion.path 
              d="M 116 122 C 116 138, 108 144, 105 144" 
              fill="none" 
              stroke="var(--cyan-theme)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              animate={isFiring ? { rotate: [0, -15, 0] } : {}}
              style={{ transformOrigin: '116px 122px' }}
              transition={{ duration: 0.18 }}
            />

            {/* 5. Cylinder Slot Cutout */}
            <rect x="90" y="76" width="58" height="48" rx="1" fill="var(--bg-surface)" stroke="var(--cyan-theme)" strokeWidth="0.8" strokeDasharray="2,2" />

            {/* 6. Cylinder Assembly (Ổ xoay đạn) — side view */}
            <g>
              {/* Cylinder body */}
              <rect x="92" y="78" width="54" height="44" rx="2" fill="var(--bg-surface)" stroke="var(--cyan-theme)" strokeWidth="1.2" />

              {/* Surface flute lines (static) */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <line key={`flute-${i}`} x1="96" y1={82 + i * 7.5} x2="142" y2={82 + i * 7.5} stroke="var(--cyan-theme)" strokeWidth="0.5" opacity="0.25" />
              ))}

              {/* Lock notches — one bright, rest dim, moves to show position */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <rect
                  key={`notch-${i}`}
                  x="93"
                  y={80 + i * 7.5}
                  width="2.5"
                  height="1.2"
                  fill="var(--cyan-theme)"
                  opacity={i === currentPosition ? 1 : 0.3}
                />
              ))}

              {/* Active position marker — animated dot on right edge */}
              <motion.circle
                cx="147"
                r="1.5"
                fill="var(--red-theme)"
                animate={{ cy: 80 + currentPosition * 7.5 + 0.6 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />

              {/* Axle center line */}
              <line x1="92" y1="100" x2="146" y2="100" stroke="var(--cyan-theme)" strokeWidth="0.6" strokeDasharray="3,3" opacity="0.3" />
            </g>

            {/* 7. Massive flat barrel (Nòng súng) */}
            <path 
              d="M 145 74 
                 L 285 74 
                 L 285 116 
                 L 145 116 Z" 
              fill="var(--bg-surface)" 
              stroke="var(--cyan-theme)" 
              strokeWidth="1.2" 
            />

            {/* Vented Rib Slots (Hollow line drawings) */}
            {[155, 180, 205, 230, 255].map((x) => (
              <rect key={`vent-${x}`} x={x} y="77" width="15" height="3" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            ))}

            {/* Front Sight Blade (CAD flat-style) */}
            <polygon points="272,74 272,69 283,69 285,74" fill="none" stroke="var(--cyan-theme)" strokeWidth="1" />
            <rect x="274" y="70" width="3" height="3" fill="#ef4444" />

            {/* Ejector Rod Slot */}
            <rect x="145" y="106" width="70" height="6" rx="1" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <line x1="150" y1="109" x2="205" y2="109" stroke="var(--cyan-theme)" strokeWidth="1" />

            {/* Mechanical Text Markings */}
            <text x="148" y="126" fill="var(--cyan-theme)" fontSize="4.5" fontFamily="monospace" fontWeight="bold" opacity="0.9">CAL // .44 MAGNUM</text>
            <text x="148" y="131" fill="var(--cyan-theme)" fontSize="3.5" fontFamily="monospace" opacity="0.6">// MULTI-ROOM PROTOCOL // ONLINE</text>

            {/* =======================================================
                DIMENSION LINES & TECHNICAL LABELS (CAD Details)
                ======================================================= */}
            
            {/* 1. Barrel Length Dimension line */}
            <line x1="145" y1="74" x2="145" y2="45" stroke="var(--cyan-theme)" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
            <line x1="285" y1="74" x2="285" y2="45" stroke="var(--cyan-theme)" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
            <line x1="145" y1="48" x2="285" y2="48" stroke="var(--cyan-theme)" strokeWidth="0.8" opacity="0.8" />
            {/* CAD end ticks */}
            <line x1="142" y1="51" x2="148" y2="45" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <line x1="282" y1="51" x2="288" y2="45" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <text x="215" y="43" fill="var(--cyan-theme-light)" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">L: 140.0mm [BARREL_AXIS]</text>

            {/* 2. Cylinder Diameter Dimension line */}
            <line x1="92" y1="120" x2="92" y2="152" stroke="var(--cyan-theme)" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
            <line x1="146" y1="120" x2="146" y2="152" stroke="var(--cyan-theme)" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
            <line x1="92" y1="148" x2="146" y2="148" stroke="var(--cyan-theme)" strokeWidth="0.8" opacity="0.8" />
            {/* CAD ticks */}
            <line x1="89" y1="151" x2="95" y2="145" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <line x1="143" y1="151" x2="149" y2="145" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <text x="119" y="155" fill="var(--cyan-theme-light)" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">Ø: 44.0mm [CYLINDER]</text>

            {/* 3. Height Dimension line */}
            <line x1="285" y1="74" x2="306" y2="74" stroke="var(--cyan-theme)" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
            <line x1="285" y1="116" x2="306" y2="116" stroke="var(--cyan-theme)" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
            <line x1="302" y1="74" x2="302" y2="116" stroke="var(--cyan-theme)" strokeWidth="0.8" opacity="0.8" />
            {/* CAD ticks */}
            <line x1="299" y1="77" x2="305" y2="71" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <line x1="299" y1="119" x2="305" y2="113" stroke="var(--cyan-theme)" strokeWidth="0.8" />
            <text x="309" y="95" fill="var(--cyan-theme-light)" fontSize="6" fontFamily="monospace" transform="rotate(90, 309, 95)" textAnchor="middle" fontWeight="bold">H: 42.0mm</text>

            {/* 4. Trigger Leader Label */}
            <path d="M 112 135 L 132 165 L 175 165" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" opacity="0.8" />
            <circle cx="112" cy="135" r="1.5" fill="var(--cyan-theme)" />
            <text x="178" y="167" fill="var(--cyan-theme-light)" fontSize="6" fontFamily="monospace" textAnchor="start">ACTUATOR // TRIGGER_SYS</text>

            {/* 5. Hammer Leader Label */}
            <path d="M 68 76 L 56 60 L 25 60" fill="none" stroke="var(--cyan-theme)" strokeWidth="0.8" opacity="0.8" />
            <circle cx="68" cy="76" r="1.5" fill="var(--cyan-theme)" />
            <text x="22" y="57" fill="var(--cyan-theme-light)" fontSize="6" fontFamily="monospace" textAnchor="start">HAMMER // COCK_STATUS</text>

          </svg>

          {/* =======================================================
              BRUTALIST MUZZLE FLASH & SPARKS (Flat Drawing)
              ======================================================= */}
          <AnimatePresence>
            {isFiring && !alive && (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 320 220">
                  <motion.g
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0], 
                      scale: [0.7, 1.3, 1.1, 0.5] 
                    }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    style={{ transformOrigin: '285px 95px' }}
                  >
                    {/* Sharp geometric muzzle flash */}
                    <path d="M 285 95 L 340 65 L 320 85 L 380 95 L 320 105 L 340 125 Z" fill="none" stroke="#ff7c1f" strokeWidth="2" />
                    <path d="M 285 95 L 315 80 L 305 95 L 345 95 L 305 95 L 315 110 Z" fill="none" stroke="#ffeb3b" strokeWidth="1.5" />
                    <circle cx="285" cy="95" r="8" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  </motion.g>

                  {/* Sharp mechanical sparks (Vector lines) */}
                  {[...Array(6)].map((_, i) => {
                    const sparkAngle = (Math.random() * 0.6 - 0.3);
                    const sparkDistance = Math.random() * 80 + 40;
                    const tx = Math.cos(sparkAngle) * sparkDistance;
                    const ty = Math.sin(sparkAngle) * sparkDistance;
                    
                    return (
                      <motion.line
                        key={`spark-${i}`}
                        x1="285"
                        y1="95"
                        x2="285"
                        y2="95"
                        animate={{ 
                          x2: 285 + tx, 
                          y2: 95 + ty, 
                          opacity: [1, 0.8, 0] 
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        stroke="#ff9f1a"
                        strokeWidth="1"
                        strokeDasharray="4,2"
                      />
                    );
                  })}
                </svg>
              </div>
            )}
          </AnimatePresence>

          {/* 3. Electric vector discharge on surviving click */}
          <AnimatePresence>
            {isFiring && alive && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 pointer-events-none"
              >
                <svg className="w-full h-full" viewBox="0 0 320 220">
                  <circle cx="92" cy="95" r="2.5" fill="none" stroke="var(--cyan-theme-light)" strokeWidth="1" />
                  {/* Schematic discharge lines */}
                  <line x1="92" y1="95" x2="80" y2="85" stroke="var(--cyan-theme-light)" strokeWidth="0.8" />
                  <line x1="80" y1="85" x2="72" y2="85" stroke="var(--cyan-theme-light)" strokeWidth="0.8" />
                  <line x1="92" y1="95" x2="104" y2="108" stroke="var(--cyan-theme-light)" strokeWidth="0.8" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
