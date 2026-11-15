import React from 'react';
import {
  Activity,
  Atom,
  Bot,
  Code,
  Compass,
  Cpu,
  Gamepad2,
  Globe,
  HardDrive,
  Landmark,
  Leaf,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { ThematicArea } from '../types/academic';

/** Returns the standard discipline icon for a given thematic area. */
export function renderAreaIcon(
  area: ThematicArea,
  className: string = 'w-3.5 h-3.5'
): React.ReactElement {
  switch (area) {
    case 'tecnologia':
      return <Cpu className={className} />;
    case 'ia':
      return <Bot className={className} />;
    case 'saude':
      return <Activity className={className} />;
    case 'arte':
      return <Palette className={className} />;
    case 'games':
      return <Gamepad2 className={className} />;
    case 'software':
      return <Code className={className} />;
    case 'hardware':
      return <HardDrive className={className} />;
    case 'ciencias-exatas':
      return <Atom className={className} />;
    case 'biociencias':
      return <Leaf className={className} />;
    case 'geociencias':
      return <Compass className={className} />;
    case 'economia-politicas':
      return <Landmark className={className} />;
    case 'patentes-normas':
      return <ShieldCheck className={className} />;
    case 'multidisciplinar':
    default:
      return <Globe className={className} />;
  }
}
