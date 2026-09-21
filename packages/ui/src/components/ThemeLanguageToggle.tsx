import { Moon, Sun, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";

export function ThemeLanguageToggle() {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const toggleLanguage = () => {
    const newLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
        title="Toggle Language"
      >
        <Globe className="w-4 h-4" />
        {i18n.language === "vi" ? "VI" : "EN"}
      </button>
      <button
        onClick={toggleTheme}
        className="p-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
        title="Toggle Theme"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  );
}
