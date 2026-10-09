export type DueLabel =
  | { kind: 'none' }
  | { kind: 'today' }
  | { kind: 'overdue'; date: string }
  | { kind: 'days'; count: number; date: string }
  | { kind: 'weeks'; count: number; date: string }
  | { kind: 'months'; count: number; date: string };
