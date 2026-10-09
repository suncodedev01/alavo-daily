import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { CallArgs, CommandName, CommandPayload, CommandResult } from './commands';
import type { EngineCallError, EngineClient } from './client';

const EngineContext = createContext<EngineClient | null>(null);

export interface EngineProviderProps {
  client: EngineClient;
  children: ReactNode;
}

/**
 * Makes the engine available to every screen. Any command that changes data refreshes every
 * query: the database is local and small, so refetching is cheaper than tracking dependencies.
 */
export function EngineProvider({ client, children }: EngineProviderProps) {
  const [queryClient] = useState(() => createQueryClient());
  useEffect(
    () => client.subscribe(() => void queryClient.invalidateQueries()),
    [client, queryClient],
  );
  return (
    <EngineContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </EngineContext.Provider>
  );
}

export function useEngine(): EngineClient {
  const client = useContext(EngineContext);
  if (!client) throw new Error('useEngine must be used inside <EngineProvider>');
  return client;
}

export function useEngineQuery<K extends CommandName>(
  command: K,
  ...args: CallArgs<K>
): UseQueryResult<CommandResult<K>, EngineCallError> {
  const engine = useEngine();
  return useQuery<CommandResult<K>, EngineCallError>({
    queryKey: [command, args[0] ?? null],
    queryFn: () => engine.call(command, ...args),
  });
}

export function useEngineMutation<K extends CommandName>(
  command: K,
): UseMutationResult<CommandResult<K>, EngineCallError, CommandPayload<K>> {
  const engine = useEngine();
  return useMutation<CommandResult<K>, EngineCallError, CommandPayload<K>>({
    mutationFn: (payload) => engine.call(command, ...([payload] as unknown as CallArgs<K>)),
  });
}

export interface EngineGateProps {
  loading: ReactNode;
  failed: (message: string) => ReactNode;
  children: ReactNode;
}

/** Shows `loading` until the database is open, `failed` when it cannot be opened. */
export function EngineGate({ loading, failed, children }: EngineGateProps) {
  const engine = useEngine();
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'failed'; message: string }>({
    status: 'loading',
    message: '',
  });
  useEffect(() => {
    let active = true;
    engine.ready.then(
      () => active && setState({ status: 'ready', message: '' }),
      (error: unknown) =>
        active &&
        setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      active = false;
    };
  }, [engine]);
  if (state.status === 'ready') return <>{children}</>;
  return <>{state.status === 'loading' ? loading : failed(state.message)}</>;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false },
    },
  });
}
