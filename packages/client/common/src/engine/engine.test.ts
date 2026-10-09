import { describe, expect, it, vi } from 'vitest';

import { EngineCallError, toEngineError } from './client';
import { isReadCommand } from './commands';
import { TransportEngineClient } from './TransportEngineClient';

class FakeTransport extends TransportEngineClient {
  readonly ready = Promise.resolve({ deviceId: 'd' });
  readonly sent: { command: string; payload: string }[] = [];

  constructor(private readonly reply: (command: string, payload: string) => Promise<string>) {
    super();
  }

  protected send(command: string, payload: string): Promise<string> {
    this.sent.push({ command, payload });
    return this.reply(command, payload);
  }
}

describe('isReadCommand', () => {
  it.each([
    'hub.get_settings',
    'spending.list_transactions',
    'spending.month_summary',
    'spending.budget_status',
    'sync.status',
    'recipes.get_shopping_list',
    'recipes.parse_json_ld',
    'hub.export_data',
    'hub.device_info',
  ])('treats %s as a read', (command) => {
    expect(isReadCommand(command)).toBe(true);
  });

  it.each([
    'spending.record_transaction',
    'recipes.set_favorite',
    'hub.update_settings',
    'hub.mark_notifications_read',
    'recipes.log_shopping_expense',
    'hub.load_demo_data',
  ])('treats %s as a write', (command) => {
    expect(isReadCommand(command)).toBe(false);
  });

  it('does not mistake a verb that merely starts like a read word for one', () => {
    expect(isReadCommand('recipes.listing_things')).toBe(false);
  });
});

describe('toEngineError', () => {
  it('reads the code and message of an engine error', () => {
    const error = toEngineError('{"code":"not_found","message":"recipe r1 not found"}');
    expect(error).toBeInstanceOf(EngineCallError);
    expect(error.code).toBe('not_found');
    expect(error.message).toBe('recipe r1 not found');
  });

  it('falls back to an internal error for plain text', () => {
    const error = toEngineError(new Error('worker exploded'));
    expect(error.code).toBe('internal');
    expect(error.message).toBe('worker exploded');
  });
});

describe('TransportEngineClient', () => {
  it('sends the payload as JSON and parses the JSON result', async () => {
    const client = new FakeTransport(async () => '{"count":2}');
    const result = await client.call('hub.mark_notifications_read', { ids: ['a'] });
    expect(result).toEqual({ count: 2 });
    expect(client.sent[0]).toEqual({
      command: 'hub.mark_notifications_read',
      payload: '{"ids":["a"]}',
    });
  });

  it('sends an empty payload when none is given', async () => {
    const client = new FakeTransport(async () => '[]');
    await client.call('hub.list_notifications');
    expect(client.sent[0]?.payload).toBe('');
  });

  it('notifies subscribers after a write but not after a read', async () => {
    const client = new FakeTransport(async () => '{}');
    const listener = vi.fn();
    client.subscribe(listener);
    await client.call('hub.get_settings');
    expect(listener).not.toHaveBeenCalled();
    await client.call('hub.update_settings', { theme: 'dark' });
    expect(listener).toHaveBeenCalledWith({ command: 'hub.update_settings' });
  });

  it('does not notify when the write fails, and rejects with a typed error', async () => {
    const client = new FakeTransport(async () => {
      throw '{"code":"validation","message":"bad"}';
    });
    const listener = vi.fn();
    client.subscribe(listener);
    await expect(client.call('hub.update_settings', { theme: 'dark' })).rejects.toMatchObject({
      code: 'validation',
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', async () => {
    const client = new FakeTransport(async () => '{}');
    const listener = vi.fn();
    const unsubscribe = client.subscribe(listener);
    unsubscribe();
    await client.call('hub.update_settings', { theme: 'dark' });
    expect(listener).not.toHaveBeenCalled();
  });
});
