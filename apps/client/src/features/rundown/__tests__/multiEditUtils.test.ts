import { OntimeEvent, RundownEntries, SupportedEntry, TimeStrategy } from 'ontime-types';

import {
  booleanTally,
  deriveAllLockDuration,
  deriveAllLockEnd,
  filterSelectedEvents,
  findFirstRundownEventId,
  INDETERMINATE,
  mergeCustomFields,
  mergeField,
  mergeLinkStart,
} from '../entry-editor/multi-edit/multiEditUtils';

function makeEvent(overrides: Partial<OntimeEvent> & { id: string }): OntimeEvent {
  return {
    type: SupportedEntry.Event,
    cue: '',
    title: '',
    note: '',
    colour: '',
    flag: false,
    countToEnd: false,
    linkStart: false,
    skip: false,
    endAction: 'none',
    timerType: 'count-down',
    timeStrategy: TimeStrategy.LockDuration,
    timeStart: 0,
    timeEnd: 0,
    duration: 0,
    timeWarning: 0,
    timeDanger: 0,
    custom: {},
    triggers: [],
    parent: null,
    revision: 0,
    delay: 0,
    dayOffset: 0,
    gap: 0,
    ...overrides,
  } as OntimeEvent;
}

describe('mergeField()', () => {
  it('returns shared string value', () => {
    const events = [makeEvent({ id: '1', title: 'Hello' }), makeEvent({ id: '2', title: 'Hello' })];
    expect(mergeField(events, 'title')).toBe('Hello');
  });

  it('returns INDETERMINATE for differing strings', () => {
    const events = [makeEvent({ id: '1', title: 'A' }), makeEvent({ id: '2', title: 'B' })];
    expect(mergeField(events, 'title')).toBe(INDETERMINATE);
  });

  it('returns shared number value', () => {
    const events = [makeEvent({ id: '1', duration: 1000 }), makeEvent({ id: '2', duration: 1000 })];
    expect(mergeField(events, 'duration')).toBe(1000);
  });

  it('returns INDETERMINATE for differing enums', () => {
    const events = [
      makeEvent({ id: '1', timeStrategy: TimeStrategy.LockEnd }),
      makeEvent({ id: '2', timeStrategy: TimeStrategy.LockDuration }),
    ];
    expect(mergeField(events, 'timeStrategy')).toBe(INDETERMINATE);
  });

  it('returns shared boolean value', () => {
    const events = [makeEvent({ id: '1', flag: true }), makeEvent({ id: '2', flag: true })];
    expect(mergeField(events, 'flag')).toBe(true);
  });
});

describe('mergeLinkStart()', () => {
  it('returns shared value after excluding first rundown event', () => {
    const events = [
      makeEvent({ id: 'first', linkStart: false }),
      makeEvent({ id: '2', linkStart: true }),
      makeEvent({ id: '3', linkStart: true }),
    ];
    expect(mergeLinkStart(events, 'first')).toBe(true);
  });

  it('returns INDETERMINATE when remaining events differ', () => {
    const events = [makeEvent({ id: '1', linkStart: true }), makeEvent({ id: '2', linkStart: false })];
    expect(mergeLinkStart(events, undefined)).toBe(INDETERMINATE);
  });

  it('returns false when all events are the first rundown event', () => {
    const events = [makeEvent({ id: 'first', linkStart: true })];
    expect(mergeLinkStart(events, 'first')).toBe(false);
  });
});

describe('booleanTally()', () => {
  it('all true', () => {
    const events = [makeEvent({ id: '1', flag: true }), makeEvent({ id: '2', flag: true })];
    expect(booleanTally(events, 'flag')).toEqual({ onCount: 2, offCount: 0, majority: true });
  });

  it('all false', () => {
    const events = [makeEvent({ id: '1', flag: false }), makeEvent({ id: '2', flag: false })];
    expect(booleanTally(events, 'flag')).toEqual({ onCount: 0, offCount: 2, majority: false });
  });

  it('tied defaults to majority true', () => {
    const events = [makeEvent({ id: '1', flag: true }), makeEvent({ id: '2', flag: false })];
    expect(booleanTally(events, 'flag')).toEqual({ onCount: 1, offCount: 1, majority: true });
  });

  it('more off than on', () => {
    const events = [makeEvent({ id: '1', flag: true }), makeEvent({ id: '2', flag: false }), makeEvent({ id: '3', flag: false })];
    expect(booleanTally(events, 'flag')).toEqual({ onCount: 1, offCount: 2, majority: false });
  });
});

describe('deriveAllLockDuration()', () => {
  it('true for LockDuration', () => expect(deriveAllLockDuration(TimeStrategy.LockDuration)).toBe(true));
  it('false for LockEnd', () => expect(deriveAllLockDuration(TimeStrategy.LockEnd)).toBe(false));
  it('false for INDETERMINATE', () => expect(deriveAllLockDuration(INDETERMINATE)).toBe(false));
});

describe('deriveAllLockEnd()', () => {
  it('true for LockEnd', () => expect(deriveAllLockEnd(TimeStrategy.LockEnd)).toBe(true));
  it('false for LockDuration', () => expect(deriveAllLockEnd(TimeStrategy.LockDuration)).toBe(false));
  it('false for INDETERMINATE', () => expect(deriveAllLockEnd(INDETERMINATE)).toBe(false));
});

describe('mergeCustomFields()', () => {
  it('returns shared values', () => {
    const events = [
      makeEvent({ id: '1', custom: { color: 'red', size: 'large' } }),
      makeEvent({ id: '2', custom: { color: 'red', size: 'large' } }),
    ];
    expect(mergeCustomFields(events)).toEqual({ color: 'red', size: 'large' });
  });

  it('marks differing keys as INDETERMINATE', () => {
    const events = [
      makeEvent({ id: '1', custom: { color: 'red', size: 'large' } }),
      makeEvent({ id: '2', custom: { color: 'blue', size: 'large' } }),
    ];
    const result = mergeCustomFields(events);
    expect(result.color).toBe(INDETERMINATE);
    expect(result.size).toBe('large');
  });

  it('marks missing keys as INDETERMINATE', () => {
    const events = [makeEvent({ id: '1', custom: { color: 'red' } }), makeEvent({ id: '2', custom: {} })];
    expect(mergeCustomFields(events).color).toBe(INDETERMINATE);
  });
});

describe('filterSelectedEvents()', () => {
  it('returns only OntimeEvents, skipping delays', () => {
    const entries: RundownEntries = {
      '1': makeEvent({ id: '1' }),
      '2': makeEvent({ id: '2' }),
      delay: { type: SupportedEntry.Delay, id: 'delay', duration: 0, parent: null },
    };
    const result = filterSelectedEvents(entries, new Set(['1', '2', 'delay']));
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['1', '2']);
  });

  it('skips IDs not found in entries', () => {
    const entries: RundownEntries = { '1': makeEvent({ id: '1' }) };
    expect(filterSelectedEvents(entries, new Set(['1', 'missing']))).toHaveLength(1);
  });
});

describe('findFirstRundownEventId()', () => {
  it('skips non-events and returns first event ID', () => {
    const entries: RundownEntries = {
      delay: { type: SupportedEntry.Delay, id: 'delay', duration: 0, parent: null },
      '1': makeEvent({ id: '1' }),
      '2': makeEvent({ id: '2' }),
    };
    expect(findFirstRundownEventId(entries, ['delay', '1', '2'])).toBe('1');
  });

  it('returns undefined when no events exist', () => {
    const entries: RundownEntries = {
      delay: { type: SupportedEntry.Delay, id: 'delay', duration: 0, parent: null },
    };
    expect(findFirstRundownEventId(entries, ['delay'])).toBeUndefined();
  });
});

