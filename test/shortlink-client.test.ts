import { describe, it, expect } from 'vitest';
import { manageUrl, parseManageHash } from '../src/app/shortlink';

/**
 * The management link is the only key to a printed site, so parsing it has to
 * be strict about what it accepts and quiet about what it does not.
 */

describe('parseManageHash', () => {
  it('reads a management link', () => {
    expect(parseManageHash('#m=a7fq2m9k3p.AbCdEfGhIjKlMnOpQrStUv')).toEqual({
      id: 'a7fq2m9k3p',
      secret: 'AbCdEfGhIjKlMnOpQrStUv',
    });
  });

  it('works without the leading hash', () => {
    expect(parseManageHash('m=a7fq2m9k3p.AbCdEfGhIjKlMnOpQrStUv')?.id).toBe('a7fq2m9k3p');
  });

  it('ignores an ordinary site link', () => {
    expect(parseManageHash('#v1.abcdef')).toBeNull();
    expect(parseManageHash('')).toBeNull();
    expect(parseManageHash('#')).toBeNull();
  });

  it('ignores anything malformed rather than throwing', () => {
    expect(parseManageHash('#m=')).toBeNull();
    expect(parseManageHash('#m=onlyanid')).toBeNull();
    expect(parseManageHash('#m=SHORT.secret')).toBeNull();
    expect(parseManageHash('#m=a7fq2m9k3p.')).toBeNull();
    expect(parseManageHash('#m=a7fq2m9k3p.has spaces')).toBeNull();
  });
});

describe('manageUrl', () => {
  it('is an editor link carrying the key', () => {
    expect(manageUrl({ id: 'a7fq2m9k3p', secret: 'sEcReT' }, 'https://urlite.app')).toBe(
      'https://urlite.app/app#m=a7fq2m9k3p.sEcReT',
    );
  });

  it('round-trips through the parser', () => {
    const key = { id: 'a7fq2m9k3p', secret: 'AbCdEfGhIjKlMnOpQrStUv' };
    const url = manageUrl(key, 'https://urlite.app');
    expect(parseManageHash(url.slice(url.indexOf('#')))).toEqual(key);
  });
});
