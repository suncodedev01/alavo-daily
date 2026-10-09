export interface Size {
  width: number;
  height: number;
}

export interface EncodeAttempt {
  maxSide: number;
  quality: number;
}

export interface PhotoPicker {
  busy: boolean;
  error: string | null;
  choose: (file: File) => void;
}
