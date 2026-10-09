import type { UseMutationOptions} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeError } from '../errors/normalizeError';

export const createMutationHook = <TData, TError, TVariables, TContext>(
  domain: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>
) => {
  return () => {
    const queryClient = useQueryClient();
    
    return useMutation<TData, TError, TVariables, TContext>({
      mutationFn,
      ...options,
      onError: (error, variables, context) => {
        const normalized = normalizeError(error, domain);
        if (options?.onError) {
          return options.onError(normalized as TError, variables, context, {} as any);
        }
        throw normalized;
      },
    });
  };
};
