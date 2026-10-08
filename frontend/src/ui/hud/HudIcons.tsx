import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  glow?: string;
}

/**
 * Leviathan Axe Icon — Sleek frosted cyan battleaxe
 */
export function AxeIcon({ size = 16, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 4px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      {/* Axe Handle */}
      <line x1="4" y1="20" x2="16" y2="8" />
      {/* Double-Crescent Axe Blade */}
      <path d="M14 6 C16 3, 20 3, 21 6 C21 9, 18 11, 15 10" fill={color} fillOpacity="0.25" />
      <path d="M11 9 C9 12, 9 16, 12 17 C15 17, 17 14, 16 12" fill={color} fillOpacity="0.25" />
      <circle cx="15" cy="9" r="1.5" fill={color} />
    </svg>
  );
}

/**
 * Celestial Dragon Crest Icon — Elegant golden wyrm
 */
export function DragonIcon({ size = 16, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 4px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      {/* Serpentine Horned Head & Neck Arc */}
      <path d="M4 18 C7 17, 9 14, 10 11 C11 7, 14 5, 18 5 C20 5, 21 6.5, 20 8 C18 10, 15 11, 13 14 C11 17, 8 20, 4 20" />
      {/* Dragon Horns & Crest */}
      <path d="M17 5 L20 2 M18 7 L22 5" />
      {/* Dragon Whisker / Jaw */}
      <path d="M19 8 C17 9, 16 11, 17 12" />
      {/* Qi Pearl */}
      <circle cx="7" cy="17" r="1.5" fill={color} />
    </svg>
  );
}

/**
 * Minimalist Gamepad / Controls Icon
 */
export function GamepadIcon({ size = 15, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15.5" cy="10.5" r="0.75" fill={color} />
      <circle cx="17.5" cy="13.5" r="0.75" fill={color} />
    </svg>
  );
}

/**
 * Cloud Save Icon
 */
export function CloudIcon({ size = 15, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}

/**
 * Save Floppy Disk Icon
 */
export function SaveIcon({ size = 14, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

/**
 * Eye Icon — For Minimalist / Immersion mode toggle
 */
export function EyeIcon({ size = 15, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Eye Slash Icon — When Immersion mode is active
 */
export function EyeOffIcon({ size = 15, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

/**
 * Download / Install Icon
 */
export function DownloadIcon({ size = 14, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/**
 * Settings / Sliders Cog Icon
 */
export function SettingsIcon({ size = 14, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * Volume / Sound Wave Icon
 */
export function VolumeIcon({ size = 14, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

/**
 * Celestial Sun Icon
 */
export function SunIcon({ size = 14, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

/**
 * Celestial Moon Icon
 */
export function MoonIcon({ size = 14, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

/**
 * Keyboard Switch Icon — For PC Controls
 */
export function KeyboardIcon({ size = 15, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <line x1="6" y1="8" x2="6" y2="8" strokeWidth="2.5" />
      <line x1="10" y1="8" x2="10" y2="8" strokeWidth="2.5" />
      <line x1="14" y1="8" x2="14" y2="8" strokeWidth="2.5" />
      <line x1="18" y1="8" x2="18" y2="8" strokeWidth="2.5" />
      <line x1="6" y1="12" x2="6" y2="12" strokeWidth="2.5" />
      <line x1="10" y1="12" x2="10" y2="12" strokeWidth="2.5" />
      <line x1="14" y1="12" x2="14" y2="12" strokeWidth="2.5" />
      <line x1="18" y1="12" x2="18" y2="12" strokeWidth="2.5" />
      <line x1="8" y1="16" x2="16" y2="16" strokeWidth="2" />
    </svg>
  );
}

/**
 * Smartphone / Mobile Device Icon — For Mobile HUD Layout
 */
export function SmartphoneIcon({ size = 15, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
      <line x1="10" y1="5" x2="14" y2="5" />
    </svg>
  );
}

/**
 * Shield Icon — For Dauntless Parry / Block
 */
export function ShieldIcon({ size = 16, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 7v8" />
      <path d="M9 11h6" />
    </svg>
  );
}

/**
 * Wing / Celestial Leap Icon — For Jump / Air Glide
 */
export function WingLeapIcon({ size = 16, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
      <path d="M5 18l7-7 7 7" />
    </svg>
  );
}

/**
 * Qi Dash / High-Speed Sprint Icon — For Sprint / Evade
 */
export function QiDashIcon({ size = 16, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

/**
 * Sword Slash Icon — For Attack / Combat
 */
export function SwordSlashIcon({ size = 16, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l2 2 4-4-2-2" />
      <line x1="19" y1="5" x2="21" y2="7" />
      <line x1="16" y1="8" x2="18" y2="10" />
    </svg>
  );
}

/**
 * Move / Drag Handle Icon — For repositioning HUD elements
 */
export function MoveIcon({ size = 15, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <polyline points="5 9 2 12 5 15" />
      <polyline points="9 5 12 2 15 5" />
      <polyline points="15 19 12 22 9 19" />
      <polyline points="19 9 22 12 19 15" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  );
}

/**
 * Refresh / Reset Defaults Icon
 */
export function RefreshIcon({ size = 14, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

/**
 * Checkmark Icon
 */
export function CheckIcon({ size = 14, color = "currentColor", glow, style, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
        ...style,
      }}
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
