import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const LanguageSwitcher = ({ className = '' }) => {
  const { language, changeLanguage } = useLanguage();

  const handleLanguageChange = (e) => {
    changeLanguage(e.target.value);
  };

  return (
    <select 
      value={language} 
      onChange={handleLanguageChange}
      className={`px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${className}`}
    >
      <option value="th">🇹🇭 ไทย</option>
      <option value="en">🇬🇧 English</option>
      <option value="zh">🇨🇳 中文</option>
    </select>
  );
};

export default LanguageSwitcher;
