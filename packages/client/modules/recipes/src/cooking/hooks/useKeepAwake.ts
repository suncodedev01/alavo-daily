import { usePlatform, type PlatformServices } from '@alavo-daily/common';
import { useEffect, useState } from 'react';

import type { AwakeState } from '../types';

export function useKeepAwake(): AwakeState {
  const platform = usePlatform();
  const supported = platform.capabilities.keepAwake;
  const [state, setState] = useState<AwakeState>(supported ? 'pending' : 'off');

  useEffect(() => {
    if (!supported) return;
    return holdWakeLock(platform, (held) => setState(held ? 'on' : 'off'));
  }, [platform, supported]);

  return supported ? state : 'off';
}

function holdWakeLock(platform: PlatformServices, report: (held: boolean) => void): () => void {
  let active = true;
  let release: (() => void) | null = null;
  const acquire = () =>
    platform.keepAwake().then(
      (next) => {
        if (!active) return next();
        release?.();
        release = next;
        report(true);
      },
      () => active && report(false),
    );
  const reacquireWhenVisible = () => {
    if (document.visibilityState === 'visible') void acquire();
  };
  void acquire();
  document.addEventListener('visibilitychange', reacquireWhenVisible);
  return () => {
    active = false;
    release?.();
    document.removeEventListener('visibilitychange', reacquireWhenVisible);
  };
}
