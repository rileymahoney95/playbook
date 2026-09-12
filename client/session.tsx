import { createContext, useContext } from 'react';

export interface SessionValue {
  logout: () => Promise<void>;
  loggingOut: boolean;
}
export const SessionContext = createContext<SessionValue>({
  logout: async () => {},
  loggingOut: false,
});
export const useSession = () => useContext(SessionContext);
