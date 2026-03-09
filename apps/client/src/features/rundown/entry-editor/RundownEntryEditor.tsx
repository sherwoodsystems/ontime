import { useMemo } from 'react';
import { isOntimeEvent, isOntimeGroup, isOntimeMilestone, OntimeEntry } from 'ontime-types';

import useRundown from '../../../common/hooks-query/useRundown';
import { useEventSelection } from '../useEventSelection';

import EventEditorFooter from './composite/EventEditorFooter';
import { findFirstRundownEventId } from './multi-edit/multiEditUtils';
import { useSelectedEvents } from './multi-edit/useMultiEventMerge';
import EventEditor from './EventEditor';
import EventEditorEmpty from './EventEditorEmpty';
import GroupEditor from './GroupEditor';
import MilestoneEditor from './MilestoneEditor';

import style from './EntryEditor.module.scss';

export default function RundownEntryEditor() {
  const selectedEventIds = useEventSelection((state) => state.selectedEvents);
  const { data } = useRundown();
  const { selectedEvents, selectedIds, isMultiSelect } = useSelectedEvents();

  const entry = useMemo<OntimeEntry | null>(() => {
    if (data.order.length === 0) {
      return null;
    }

    const selectedEventId = Array.from(selectedEventIds).at(0);
    if (!selectedEventId) {
      return null;
    }

    const event = data.entries[selectedEventId];
    return event ?? null;
  }, [data.order.length, data.entries, selectedEventIds]);

  const firstRundownEventId = useMemo(
    () => findFirstRundownEventId(data.entries, data.flatOrder),
    [data.entries, data.flatOrder],
  );

  // Multi-edit: render unified EventEditor with selected events
  if (isMultiSelect && entry && isOntimeEvent(entry)) {
    return (
      <div className={style.rundownEditor} data-testid='editor-container'>
        <EventEditor
          event={entry}
          selectedEvents={selectedEvents}
          selectedIds={selectedIds}
          firstRundownEventId={firstRundownEventId}
        />
        <EventEditorFooter selectedCount={selectedIds.length} />
      </div>
    );
  }

  if (!entry) {
    return <EventEditorEmpty />;
  }

  if (isOntimeEvent(entry)) {
    return (
      <div className={style.rundownEditor} data-testid='editor-container'>
        <EventEditor event={entry} />
        <EventEditorFooter id={entry.id} cue={entry.cue} />
      </div>
    );
  }

  if (isOntimeMilestone(entry)) {
    return (
      <div className={style.rundownEditor} data-testid='editor-container'>
        <MilestoneEditor milestone={entry} />
      </div>
    );
  }

  if (isOntimeGroup(entry)) {
    return (
      <div className={style.rundownEditor} data-testid='editor-container'>
        <GroupEditor group={entry} />
      </div>
    );
  }

  return null;
}
