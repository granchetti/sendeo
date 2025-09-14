import { fetchJson } from './utils';

jest.mock('node:https', () => ({
  request: (url: string, cb: any) => {
    const res = {
      on: (event: string, handler: any) => {
        if (event === 'data') {
          handler('{"ok":true}');
        }
        if (event === 'end') {
          handler();
        }
      }
    } as any;
    cb(res);
    return {
      on: () => {},
      end: () => {}
    } as any;
  }
}));

describe('fetchJson', () => {
  it('redacts key parameter in logs', async () => {
    const logs: string[] = [];
    const originalInfo = console.info;
    console.info = (...args: any[]) => {
      logs.push(args.join(' '));
    };

    await fetchJson('https://example.com/path?foo=bar&key=secret123');

    console.info = originalInfo;
    expect(logs[0]).toBe('[fetchJson] GET https://example.com/path?foo=bar&key=REDACTED');
    expect(logs[0]).not.toContain('secret123');
  });
});
