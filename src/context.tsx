import { createContext } from 'react';
import type { TapsilatConfig, TapsilatSDK } from '@tapsilat/tapsilat-js';

export interface TapsilatContextValue {
  client: TapsilatSDK;
  config: TapsilatConfig;
  isReady: boolean;
  lastError?: Error;
  refreshClient: (override?: Partial<TapsilatConfig>) => Promise<TapsilatSDK>;
}

export const TapsilatContext = createContext<TapsilatContextValue | undefined>(undefined);
