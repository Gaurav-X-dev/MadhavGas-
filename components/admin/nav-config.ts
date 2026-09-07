import {
  LayoutDashboard,
  FileText,
  Package,
  ClipboardList,
  MessageSquare,
  Star,
  Images,
  Milestone,
  Trophy,
  Leaf,
  QrCode,
  Users,
  Settings,
  Mail,
  MapPinned,
  Home,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Bookings', href: '/admin/bookings', icon: ClipboardList },
      { label: 'Enquiries', href: '/admin/enquiries', icon: MessageSquare },
      { label: 'Feedback', href: '/admin/feedback', icon: Star },
      { label: 'Newsletter', href: '/admin/newsletter', icon: Mail },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Gallery', href: '/admin/gallery', icon: Images },
    ],
  },
  {
    label: 'Brand Story',
    items: [
      { label: 'Journey', href: '/admin/journey', icon: Milestone },
      { label: 'Achievements', href: '/admin/achievements', icon: Trophy },
      { label: 'Sustainability', href: '/admin/sustainability', icon: Leaf },
    ],
  },
  {
    label: 'Website',
    items: [
      { label: 'Home Page', href: '/admin/home-page', icon: Home },
      { label: 'Site Content', href: '/admin/site-content', icon: FileText },
      { label: 'Local LPG Information', href: '/admin/local-information', icon: MapPinned },
      { label: 'QR Settings', href: '/admin/qr-settings', icon: QrCode },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];
