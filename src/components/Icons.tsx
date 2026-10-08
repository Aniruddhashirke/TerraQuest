import type { ReactNode } from 'react'

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>)

export const HomeIcon = () => <Svg><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></Svg>
export const WalkIcon = () => <Svg><circle cx="13" cy="4.5" r="1.7" /><path d="M12.8 7.5 11.5 14M11.5 14 8.8 21M11.5 14l3.7 3 .6 4M12.5 9.5 9 11.5M12.5 9.5l3.5 2.5 1.5 2.5" /></Svg>
export const CameraIcon = () => <Svg><path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>
export const MapIcon = () => <Svg><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></Svg>
export const BookIcon = () => <Svg><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v18M12.5 8h3M12.5 12h3" /></Svg>
