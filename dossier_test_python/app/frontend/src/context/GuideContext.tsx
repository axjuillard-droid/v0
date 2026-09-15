import React, { createContext, useContext, useState } from 'react';

interface GuideContextType {
  isDemoMode: boolean;
  setIsDemoMode: (active: boolean) => void;
  showDiscoveryTooltips: boolean;
  setShowDiscoveryTooltips: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDiscoveryTooltips: () => void;
  isGuideActive: boolean;
  stopGuide: () => void;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

export const GuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDiscoveryTooltips, setShowDiscoveryTooltips] = useState(true);

  const toggleDiscoveryTooltips = () => {
    setShowDiscoveryTooltips((prev) => !prev);
  };

  const stopGuide = () => {
    setIsDemoMode(false);
  };

  return (
    <GuideContext.Provider
      value={{
        isDemoMode,
        setIsDemoMode,
        showDiscoveryTooltips,
        setShowDiscoveryTooltips,
        toggleDiscoveryTooltips,
        isGuideActive: isDemoMode,
        stopGuide,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = () => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return context;
};
