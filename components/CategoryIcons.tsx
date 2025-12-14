
import React from 'react';
import { 
  ShoppingCart, Car, Home, HeartPulse, Gamepad2, Shirt, Zap, HelpCircle, 
  Plane, GraduationCap, Gift, Wifi, Smartphone, Coffee, Utensils, 
  Briefcase, Wrench, Baby, PawPrint, Music, Film, Book
} from 'lucide-react';

export const AVAILABLE_ICONS = [
  { name: 'shopping-cart', icon: ShoppingCart },
  { name: 'car', icon: Car },
  { name: 'home', icon: Home },
  { name: 'heart-pulse', icon: HeartPulse },
  { name: 'gamepad-2', icon: Gamepad2 },
  { name: 'shirt', icon: Shirt },
  { name: 'zap', icon: Zap },
  { name: 'help-circle', icon: HelpCircle },
  { name: 'plane', icon: Plane },
  { name: 'graduation-cap', icon: GraduationCap },
  { name: 'gift', icon: Gift },
  { name: 'wifi', icon: Wifi },
  { name: 'smartphone', icon: Smartphone },
  { name: 'coffee', icon: Coffee },
  { name: 'utensils', icon: Utensils },
  { name: 'briefcase', icon: Briefcase },
  { name: 'wrench', icon: Wrench },
  { name: 'baby', icon: Baby },
  { name: 'paw-print', icon: PawPrint },
  { name: 'music', icon: Music },
  { name: 'film', icon: Film },
  { name: 'book', icon: Book },
];

interface CategoryIconProps {
  iconName: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ iconName, className }) => {
  const IconComponent = AVAILABLE_ICONS.find(i => i.name === iconName)?.icon || HelpCircle;
  return <IconComponent className={className} />;
};
