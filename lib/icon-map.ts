import {
  Building2,
  TrendingUp,
  Factory,
  Flame,
  Smartphone,
  Gauge,
  Route,
  Recycle,
  MonitorSmartphone,
  Award,
  Truck,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Building2,
  TrendingUp,
  Factory,
  Flame,
  Smartphone,
  Gauge,
  Route,
  Recycle,
  MonitorSmartphone,
  Award,
  Truck,
  ShieldCheck,
  Users,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? Building2;
}
