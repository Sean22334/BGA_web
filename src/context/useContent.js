import { createContext, useContext } from 'react';

export const ContentContext = createContext(null);

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within a ContentProvider');
  return context;
}
