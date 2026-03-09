import { useCallback, useMemo, useState } from 'react';
import { OntimeEvent, TimeStrategy } from 'ontime-types';
import { parseUserTime } from 'ontime-utils';

import Button from '../../../common/components/buttons/Button';
import Dialog from '../../../common/components/dialog/Dialog';
import * as Editor from '../../../common/components/editor-utils/EditorUtils';
import Info from '../../../common/components/info/Info';
import AppLink from '../../../common/components/link/app-link/AppLink';
import { useEntryActionsContext } from '../../../common/context/EntryActionsContext';
import useCustomFields from '../../../common/hooks-query/useCustomFields';

import EntryEditorCustomFields from './composite/EventEditorCustomFields';
import EventEditorTimes from './composite/EventEditorTimes';
import EventEditorTitles from './composite/EventEditorTitles';
import EventEditorTriggers from './composite/EventEditorTriggers';

import style from './EntryEditor.module.scss';

// any of the titles + colour + custom field labels
export type EventEditorUpdateFields = 'cue' | 'title' | 'note' | 'colour' | string;

interface EventEditorProps {
  event: OntimeEvent;
  selectedEvents?: OntimeEvent[];
  selectedIds?: string[];
  firstRundownEventId?: string;
}

export default function EventEditor({ event, selectedEvents, selectedIds, firstRundownEventId }: EventEditorProps) {
  const { data: customFields } = useCustomFields();
  const { updateEntry, batchUpdateEvents } = useEntryActionsContext();
  const [pendingStrategy, setPendingStrategy] = useState<TimeStrategy | null>(null);

  const isEditor = window.location.pathname.includes('editor');
  const isMulti = selectedEvents != null && selectedEvents.length > 1;

  // Single-event handleSubmit (used when no multiEdit)
  const singleHandleSubmit = useCallback(
    (field: EventEditorUpdateFields, value: string) => {
      if (field.startsWith('custom-')) {
        const fieldLabel = field.split('custom-')[1];
        updateEntry({ id: event.id, custom: { [fieldLabel]: value } });
      } else {
        updateEntry({ id: event.id, [field]: value });
      }
    },
    [event.id, updateEntry],
  );

  // Multi-event handleSubmit
  const multiHandleSubmit = useCallback(
    (field: string, value: string | boolean) => {
      if (!selectedIds) return;
      if (field.startsWith('custom-')) {
        const fieldKey = field.split('custom-')[1];
        batchUpdateEvents({ custom: { [fieldKey]: value } } as Partial<OntimeEvent>, selectedIds);
      } else if (field === 'duration' || field === 'timeWarning' || field === 'timeDanger') {
        const ms = parseUserTime(value as string);
        batchUpdateEvents({ [field]: ms } as Partial<OntimeEvent>, selectedIds);
      } else {
        batchUpdateEvents({ [field]: value } as Partial<OntimeEvent>, selectedIds);
      }
    },
    [batchUpdateEvents, selectedIds],
  );

  const handleConfirmStrategy = useCallback(() => {
    if (pendingStrategy && selectedIds) {
      batchUpdateEvents({ timeStrategy: pendingStrategy }, selectedIds);
    }
    setPendingStrategy(null);
  }, [batchUpdateEvents, selectedIds, pendingStrategy]);

  const handleSubmit = isMulti ? multiHandleSubmit : singleHandleSubmit;

  // Derive resolved values for single-event display
  const resolvedDuration = useMemo(() => {
    if (!isMulti) return event.duration;
    // For multi-edit, duration merging happens in TimeInputFlow
    return event.duration;
  }, [isMulti, event.duration]);

  return (
    <div className={style.content}>
      <EventEditorTimes
        key={`${event.id}-times`}
        eventId={event.id}
        timeStart={event.timeStart}
        timeEnd={event.timeEnd}
        duration={resolvedDuration}
        timeStrategy={event.timeStrategy}
        linkStart={event.linkStart}
        countToEnd={event.countToEnd}
        breakRoll={event.breakRoll ?? false}
        delay={event.delay}
        endAction={event.endAction}
        timerType={event.timerType}
        timeWarning={event.timeWarning}
        timeDanger={event.timeDanger}
        onSubmit={isMulti ? multiHandleSubmit : undefined}
        selectedEvents={selectedEvents}
        firstRundownEventId={firstRundownEventId}
        onStrategyChange={isMulti ? setPendingStrategy : undefined}
      />
      <EventEditorTitles
        key={`${event.id}-titles`}
        eventId={event.id}
        cue={event.cue}
        flag={event.flag}
        title={event.title}
        note={event.note}
        colour={event.colour}
        onSubmit={isMulti ? multiHandleSubmit : undefined}
        selectedEvents={selectedEvents}
      />
      <div className={style.column}>
        <Editor.Title>
          Custom Fields
          {isEditor && <AppLink search='settings=manage__custom'>Manage Custom Fields</AppLink>}
        </Editor.Title>
        <EntryEditorCustomFields
          fields={customFields}
          handleSubmit={handleSubmit}
          entry={event}
          selectedEvents={selectedEvents}
        />
      </div>
      <div className={style.column}>
        <Editor.Title>
          Automations
          {isEditor && !isMulti && <AppLink search='settings=automation'>Manage Automations</AppLink>}
        </Editor.Title>
        {isMulti ? (
          <Info type='info'>Not available when editing multiple events</Info>
        ) : (
          <EventEditorTriggers triggers={event.triggers} eventId={event.id} />
        )}
      </div>
      {isMulti && (
        <Dialog
          isOpen={pendingStrategy !== null}
          onClose={() => setPendingStrategy(null)}
          title='Warning!'
          showBackdrop
          showCloseButton
          bodyElements={
            pendingStrategy === TimeStrategy.LockDuration
              ? "This will set duration lock for all selected events and may significantly impact this rundown's total duration."
              : 'This will set end lock for all selected events and may cause the rundown to behave unexpectedly.'
          }
          footerElements={
            <>
              <Button variant='ghosted-white' size='large' onClick={() => setPendingStrategy(null)}>
                No
              </Button>
              <Button variant='destructive' size='large' onClick={handleConfirmStrategy}>
                Yes
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
