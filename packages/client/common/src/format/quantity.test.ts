import { describe, expect, it } from 'vitest';

import {
  formatAmount,
  formatClock,
  formatMinutes,
  formatQuantity,
  scaleQuantity,
} from './quantity';

describe('formatQuantity', () => {
  it('uses a decimal comma and at most one decimal', () => {
    expect(formatQuantity(0.5)).toBe('0,5');
    expect(formatQuantity(1.26)).toBe('1,3');
    expect(formatQuantity(1500)).toBe('1.500');
  });
});

describe('scaleQuantity', () => {
  it('scales proportionally to the servings', () => {
    expect(scaleQuantity(600, 4, 2)).toBe(300);
    expect(scaleQuantity(0.5, 2, 6)).toBe(1.5);
  });

  it('returns the quantity unchanged when the base servings are zero', () => {
    expect(scaleQuantity(10, 0, 3)).toBe(10);
  });
});

describe('formatAmount', () => {
  it('switches to kg and litres from 1000', () => {
    expect(formatAmount(1200, 'g')).toBe('1,2 kg');
    expect(formatAmount(1000, 'ml')).toBe('1 lít');
  });

  it('keeps small amounts and other units as they are', () => {
    expect(formatAmount(300, 'g')).toBe('300 g');
    expect(formatAmount(1.5, 'củ')).toBe('1,5 củ');
  });
});

describe('formatMinutes', () => {
  it('writes minutes, hours, and hours with minutes', () => {
    expect(formatMinutes(45)).toBe('45 phút');
    expect(formatMinutes(120)).toBe('2 giờ');
    expect(formatMinutes(190)).toBe('3 giờ 10 phút');
  });
});

describe('formatClock', () => {
  it('pads minutes and seconds', () => {
    expect(formatClock(300)).toBe('05:00');
    expect(formatClock(65)).toBe('01:05');
  });

  it('never goes below zero', () => {
    expect(formatClock(-3)).toBe('00:00');
  });
});
