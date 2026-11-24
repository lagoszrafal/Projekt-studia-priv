import { shouldAutoLock } from '../AutoLockService';

describe('shouldAutoLock', () => {
  it('blokuje natychmiast dla limitu zero', () => {
    expect(shouldAutoLock(1_000, 1_000, 0)).toBe(true);
  });

  it('blokuje dopiero po upływie limitu', () => {
    expect(shouldAutoLock(1_000, 30_999, 30)).toBe(false);
    expect(shouldAutoLock(1_000, 31_000, 30)).toBe(true);
  });
});
