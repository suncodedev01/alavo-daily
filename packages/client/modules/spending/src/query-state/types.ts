export interface QueryLike<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
}
