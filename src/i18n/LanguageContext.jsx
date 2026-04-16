import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // เริ่มต้นด้วยภาษาไทย ถ้าไม่มีใน localStorage
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'th';
  });

  // บันทึกการตั้งค่าภาษาลง localStorage เมื่อมีการเปลี่ยนภาษา
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  // ฟังก์ชันแปลภาษา
  const t = useCallback((key, defaultStr) => {
    // ดึงคำแปลตาม key และภาษาปัจจุบัน
    if (translations[language] && translations[language][key] !== undefined) {
      return translations[language][key];
    }
    
    // Fallbacks
    if (translations['en'] && translations['en'][key] !== undefined) return translations['en'][key];
    if (translations['th'] && translations['th'][key] !== undefined) return translations['th'][key];
    
    // ถ้าไม่พบคำแปล ให้คืนค่า defaultStr หรือ key
    return defaultStr !== undefined ? defaultStr : key;
  }, [language]);

  // ฟังก์ชันเปลี่ยนภาษา
  const changeLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    } else {
      console.warn(`Language '${lang}' is not supported yet.`);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, languages: Object.keys(translations) }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook เพื่อนำไปใช้งานใน Component ต่างๆ
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
