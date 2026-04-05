import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  changeLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored as Language) || 'en';
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = direction === 'rtl';

  const changeLanguage = async (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    await i18n.changeLanguage(lang);
  };

  useEffect(() => {
    // Set initial language
    i18n.changeLanguage(language);
  }, [i18n, language]);

  useEffect(() => {
    // Update HTML attributes for RTL/LTR support
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    
    // Update body class for styling
    document.body.classList.toggle('rtl', isRTL);
    document.body.classList.toggle('ltr', !isRTL);
  }, [language, direction, isRTL]);

  const value: LanguageContextType = {
    language,
    direction,
    isRTL,
    changeLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
