import type { EncodeAttempt } from '../types';
import { encodeUnderLimit, fitWithin, PhotoUnreadable } from './photoSize';

/** Reads an image file and returns it as a JPEG data URL that fits the engine limit. */
export async function readPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new PhotoUnreadable();
  const image = await loadImage(file);
  return encodeUnderLimit((attempt) => drawAsJpeg(image, attempt));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  return new Promise((resolve, reject) => {
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PhotoUnreadable());
    };
    image.src = url;
  });
}

function drawAsJpeg(image: HTMLImageElement, attempt: EncodeAttempt): string {
  const source = { width: image.naturalWidth, height: image.naturalHeight };
  const size = fitWithin(source, attempt.maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new PhotoUnreadable();
  context.fillStyle = 'white';
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas.toDataURL('image/jpeg', attempt.quality);
}
