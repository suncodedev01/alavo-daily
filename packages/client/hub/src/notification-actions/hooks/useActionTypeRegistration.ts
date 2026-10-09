import { useLanguage, usePlatform, useT } from '@alavo-daily/common';
import { useEffect, useEffectEvent } from 'react';

import { buildActionTypes } from '../logic/actionTypes';

export function useActionTypeRegistration(): void {
  const platform = usePlatform();
  const t = useT();
  const language = useLanguage();
  const supported = platform.capabilities.notificationActions;
  const register = useEffectEvent(() => platform.registerNotificationActions(buildActionTypes(t)));
  useEffect(() => {
    if (supported) void register().catch(() => undefined);
  }, [supported, language]);
}
