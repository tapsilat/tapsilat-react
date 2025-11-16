import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TapsilatSDK, type TapsilatConfig } from '@tapsilat/tapsilat-js';

import { TapsilatContext, type TapsilatContextValue } from './context';

export type TapsilatProviderProps = PropsWithChildren<{
  /**
   * Configuration used to bootstrap the SDK instance. Provide a memoized object
   * or a factory function to avoid unnecessary re-instantiations when the
   * provider re-renders.
   */
  config: TapsilatConfig | (() => TapsilatConfig);
  /**
   * Handler that receives SDK related errors (for logging/alerting).
   */
  onError?: (error: Error) => void;
}>;

interface ProviderState {
  client: TapsilatSDK | null;
  config: TapsilatConfig | null;
  lastError?: Error;
}

const stableHash = (config: TapsilatConfig | null): string => {
  if (!config) {
    return '';
  }

  return Object.keys(config)
    .sort()
    .map((key) => `${key}:${JSON.stringify(config[key as keyof TapsilatConfig])}`)
    .join('|');
};

const resolveConfig = (config: TapsilatProviderProps['config']): TapsilatConfig => {
  const value = typeof config === 'function' ? config() : config;

  if (!value || typeof value !== 'object') {
    throw new Error('TapsilatProvider config must be an object or factory function.');
  }

  if (!value.bearerToken) {
    throw new Error('TapsilatProvider config must include a bearerToken.');
  }

  return { ...value };
};

const instantiateClient = (config: TapsilatConfig): TapsilatSDK => new TapsilatSDK(config);

export const TapsilatProvider = ({ config, onError, children }: TapsilatProviderProps) => {
  const [state, setState] = useState<ProviderState>(() => {
    try {
      const resolved = resolveConfig(config);
      return {
        client: instantiateClient(resolved),
        config: resolved,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to resolve Tapsilat config.');
      onError?.(err);
      throw err;
    }
  });
  const configHashRef = useRef(stableHash(state.config));
  const configRef = useRef<TapsilatConfig | null>(state.config);

  useEffect(() => {
    try {
      const nextConfig = resolveConfig(config);
      const nextHash = stableHash(nextConfig);

      if (nextHash !== configHashRef.current) {
        configHashRef.current = nextHash;
        configRef.current = nextConfig;
        setState({
          client: instantiateClient(nextConfig),
          config: nextConfig,
          lastError: undefined,
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to refresh Tapsilat config.');
      setState((prev) => ({ ...prev, lastError: err }));
      onError?.(err);
    }
  }, [config, onError]);

  const refreshClient = useCallback<Required<TapsilatContextValue>['refreshClient']>(
    async (override) => {
      try {
        const baseConfig = configRef.current ?? resolveConfig(config);
        const nextConfig = {
          ...baseConfig,
          ...override,
        } as TapsilatConfig;
        const nextClient = instantiateClient(nextConfig);
        configHashRef.current = stableHash(nextConfig);
        configRef.current = nextConfig;
        setState({ client: nextClient, config: nextConfig, lastError: undefined });
        return nextClient;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to refresh Tapsilat client.');
        setState((prev) => ({ ...prev, lastError: err }));
        onError?.(err);
        throw err;
      }
    },
    [config, onError]
  );

  const contextValue = useMemo<TapsilatContextValue>(() => {
    if (!state.client || !state.config) {
      throw new Error('TapsilatProvider failed to initialize the SDK client.');
    }

    return {
      client: state.client,
      config: state.config,
      isReady: Boolean(state.client),
      lastError: state.lastError,
      refreshClient,
    };
  }, [state.client, state.config, state.lastError, refreshClient]);

  return <TapsilatContext.Provider value={contextValue}>{children}</TapsilatContext.Provider>;
};
