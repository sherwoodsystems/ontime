import { useMemo } from 'react';

import useRundown from '../../../../common/hooks-query/useRundown';
import { useEventSelection } from '../../useEventSelection';

import { filterSelectedEvents } from './multiEditUtils';

export function useSelectedEvents() {
  const selectedEventIds = useEventSelection((state) => state.selectedEvents);
  const { data } = useRundown();

  const selectedEvents = useMemo(
    () => filterSelectedEvents(data.entries, selectedEventIds),
    [data.entries, selectedEventIds],
  );

  const selectedIds = useMemo(() => Array.from(selectedEventIds), [selectedEventIds]);

  return { selectedEvents, selectedIds, isMultiSelect: selectedEventIds.size > 1 };
}
