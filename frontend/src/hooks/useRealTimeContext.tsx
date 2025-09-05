import { createContext, useContext, ReactNode } from 'react';
import { useRealTime, UseRealTimeProps } from './useRealTime';

interface RealTimeContextType {
  realTime: ReturnType<typeof useRealTime>;
}

const RealTimeContext = createContext<RealTimeContextType | null>(null);

export const RealTimeProvider = ({ 
  children, 
  ...props 
}: { children: ReactNode } & UseRealTimeProps) => {
  const realTime = useRealTime(props);

  return (
    <RealTimeContext.Provider value={{ realTime }}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTimeContext = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTimeContext must be used within a RealTimeProvider');
  }
  return context.realTime;
};
