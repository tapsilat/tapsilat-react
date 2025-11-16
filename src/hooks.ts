import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { OrderCreateRequest, OrderCreateResponse, OrderStatusResponse, TapsilatSDK } from '@tapsilat/tapsilat-js';

import { TapsilatContext, type TapsilatContextValue } from './context';
import { toError } from './utils';

export const useTapsilat = (): TapsilatContextValue => {
  const context = useContext(TapsilatContext);

  if (!context) {
    throw new Error('useTapsilat must be used inside a <TapsilatProvider>.');
  }

  return context;
};

export const useTapsilatClient = () => useTapsilat().client;

interface AsyncResult<T> {
  data?: T;
  loading: boolean;
  error?: Error;
}

export interface UseTapsilatOrderResult {
  order: AsyncResult<OrderCreateResponse>;
  status: AsyncResult<OrderStatusResponse>;
  createOrder: (payload: OrderCreateRequest) => Promise<OrderCreateResponse>;
  fetchOrderStatus: (referenceId: string) => Promise<OrderStatusResponse>;
}

export const useTapsilatOrder = (): UseTapsilatOrderResult => {
  const { client } = useTapsilat();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [orderResult, setOrderResult] = useState<AsyncResult<OrderCreateResponse>>({ loading: false });
  const [statusResult, setStatusResult] = useState<AsyncResult<OrderStatusResponse>>({ loading: false });

  const createOrder = useCallback<UseTapsilatOrderResult['createOrder']>(
    async (payload) => {
      setOrderResult({ loading: true });
      try {
        const response = await client.createOrder(payload);
        if (mountedRef.current) {
          setOrderResult({ loading: false, data: response });
        }
        return response;
      } catch (error) {
        const err = toError(error, 'Failed to create Tapsilat order.');
        if (mountedRef.current) {
          setOrderResult({ loading: false, error: err });
        }
        throw err;
      }
    },
    [client]
  );

  const fetchOrderStatus = useCallback<UseTapsilatOrderResult['fetchOrderStatus']>(
    async (referenceId) => {
      setStatusResult({ loading: true });
      try {
        const response = await client.getOrderStatus(referenceId);
        if (mountedRef.current) {
          setStatusResult({ loading: false, data: response });
        }
        return response;
      } catch (error) {
        const err = toError(error, 'Failed to fetch Tapsilat order status.');
        if (mountedRef.current) {
          setStatusResult({ loading: false, error: err });
        }
        throw err;
      }
    },
    [client]
  );

  return {
    order: orderResult,
    status: statusResult,
    createOrder,
    fetchOrderStatus,
  };
};

export interface WebhookVerificationInput {
  payload: string;
  signature: string;
  secret: string;
}

export interface UseTapsilatWebhookResult {
  verifyWebhook: (input: WebhookVerificationInput) => Promise<boolean>;
  lastVerification?: {
    isValid: boolean;
    payload: WebhookVerificationInput;
  };
  error?: Error;
}

export const useTapsilatWebhook = (): UseTapsilatWebhookResult => {
  const { client } = useTapsilat();
  const [verification, setVerification] = useState<UseTapsilatWebhookResult['lastVerification']>();
  const [error, setError] = useState<Error>();

  const verifyWebhook = useCallback<UseTapsilatWebhookResult['verifyWebhook']>(
    async (input) => {
      try {
        if (typeof client.verifyWebhook !== 'function') {
          throw new Error('verifyWebhook is unavailable in the installed @tapsilat/tapsilat-js version.');
        }

        const isValid = await client.verifyWebhook(input.payload, input.signature, input.secret);
        setVerification({ isValid: Boolean(isValid), payload: input });
        setError(undefined);
        return Boolean(isValid);
      } catch (err) {
        const errorObject = toError(err, 'Failed to verify Tapsilat webhook payload.');
        setError(errorObject);
        throw errorObject;
      }
    },
    [client]
  );

  return { verifyWebhook, lastVerification: verification, error };
};

type HealthCheckResult = Awaited<ReturnType<TapsilatSDK['healthCheck']>>;

export interface UseTapsilatHealthResult {
  checkHealth: () => Promise<HealthCheckResult>;
  result?: HealthCheckResult;
  loading: boolean;
  error?: Error;
}

export const useTapsilatHealth = (): UseTapsilatHealthResult => {
  const { client } = useTapsilat();
  const [result, setResult] = useState<UseTapsilatHealthResult['result']>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkHealth = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
    }
    try {
      if (typeof client.healthCheck !== 'function') {
        throw new Error('healthCheck is unavailable in the installed @tapsilat/tapsilat-js version.');
      }

      const response = await client.healthCheck();
      if (mountedRef.current) {
        setResult(response);
        setError(undefined);
      }
      return response;
    } catch (err) {
      const errorObject = toError(err, 'Failed to call Tapsilat health check.');
      if (mountedRef.current) {
        setError(errorObject);
      }
      throw errorObject;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [client]);

  return { checkHealth, result, loading, error };
};