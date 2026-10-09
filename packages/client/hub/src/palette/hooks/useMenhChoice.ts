import { useEffect, useState } from 'react';

import { EMPTY_MENH_CHOICE, withBeforeTet, withMenh, withYearText, type MenhChoice } from '../logic/menhChoice';
import { isMenhId } from '../logic/menhInfo';
import { MENH_BEFORE_TET_KEY, MENH_KEY, MENH_YEAR_KEY, readStored, writeStored } from '../logic/storedChoice';
import type { MenhId } from '../types';

function readStoredChoice(): MenhChoice {
  const menh = readStored(MENH_KEY);
  return {
    menh: isMenhId(menh) ? menh : EMPTY_MENH_CHOICE.menh,
    yearText: readStored(MENH_YEAR_KEY) ?? EMPTY_MENH_CHOICE.yearText,
    beforeTet: readStored(MENH_BEFORE_TET_KEY) === 'true',
  };
}

function writeStoredChoice(choice: MenhChoice): void {
  writeStored(MENH_KEY, choice.menh);
  writeStored(MENH_YEAR_KEY, choice.yearText);
  writeStored(MENH_BEFORE_TET_KEY, choice.beforeTet ? 'true' : null);
}

export function useMenhChoice() {
  const [choice, setChoice] = useState(readStoredChoice);
  useEffect(() => writeStoredChoice(choice), [choice]);
  return {
    choice,
    setYearText: (text: string) => setChoice((current) => withYearText(current, text)),
    setBeforeTet: (value: boolean) => setChoice((current) => withBeforeTet(current, value)),
    chooseMenh: (menh: MenhId) => setChoice((current) => withMenh(current, menh)),
  };
}
