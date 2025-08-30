import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'compact';
}

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className,
  variant = 'default' 
}) => {
  const { t } = useTranslation();
  const { language, changeLanguage, isRTL } = useLanguage();

  const handleLanguageChange = (newLanguage: Language) => {
    changeLanguage(newLanguage);
  };

  const currentLanguage = languages.find(lang => lang.code === language);

  if (variant === 'compact') {
    return (
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger 
          className={cn(
            "w-[120px] bg-background border-border hover:bg-muted transition-colors",
            className
          )}
        >
          <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent 
          className="bg-background border-border"
          align={isRTL ? "end" : "start"}
        >
          {languages.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              className="hover:bg-muted focus:bg-muted transition-colors"
            >
              <span className="font-medium">{lang.nativeName}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Globe className="w-4 h-4 text-muted-foreground" />
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger 
          className="w-[160px] bg-background border-border hover:bg-muted transition-colors"
        >
          <SelectValue placeholder={t('language.switchLanguage')} />
        </SelectTrigger>
        <SelectContent 
          className="bg-background border-border"
          align={isRTL ? "end" : "start"}
        >
          {languages.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              className="hover:bg-muted focus:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">({lang.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
