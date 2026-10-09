export interface QueryLike<T> {
  isPending: boolean;
  isError: boolean;
  data: T | undefined;
  error: unknown;
  refetch: () => unknown;
}
