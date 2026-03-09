import { memo, useMemo } from 'react';
import { OntimeEvent } from 'ontime-types';
import { sanitiseCue } from 'ontime-utils';

import * as Editor from '../../../../common/components/editor-utils/EditorUtils';
import SwatchSelect from '../../../../common/components/input/colour-input/SwatchSelect';
import Input from '../../../../common/components/input/input/Input';
import Switch from '../../../../common/components/switch/Switch';
import { useEntryActionsContext } from '../../../../common/context/EntryActionsContext';
import { booleanTally, isIndeterminate, mergeField, switchLabel } from '../multi-edit/multiEditUtils';

import EventTextArea from './EventTextArea';
import EntryEditorTextInput from './EventTextInput';

import style from '../EntryEditor.module.scss';

interface EventEditorTitlesProps {
  eventId: string;
  cue: string;
  flag: boolean;
  title: string;
  note: string;
  colour: string;
  onSubmit?: (field: string, value: string | boolean) => void;
  selectedEvents?: OntimeEvent[];
}

export default memo(EventEditorTitles);
function EventEditorTitles({
  eventId,
  cue,
  flag,
  title,
  note,
  colour,
  onSubmit: onSubmitProp,
  selectedEvents,
}: EventEditorTitlesProps) {
  const { updateEntry } = useEntryActionsContext();

  const isMulti = selectedEvents != null && selectedEvents.length > 1;

  const merged = useMemo(() => {
    if (!isMulti) return null;
    return {
      title: mergeField(selectedEvents, 'title'),
      note: mergeField(selectedEvents, 'note'),
      colour: mergeField(selectedEvents, 'colour'),
      flag: mergeField(selectedEvents, 'flag'),
      flagTally: booleanTally(selectedEvents, 'flag'),
    };
  }, [isMulti, selectedEvents]);

  const flagIndeterminate = merged ? isIndeterminate(merged.flag) : false;
  const colourIndeterminate = merged ? isIndeterminate(merged.colour) : false;
  const titleIndeterminate = merged ? isIndeterminate(merged.title) : false;
  const noteIndeterminate = merged ? isIndeterminate(merged.note) : false;

  const displayTitle = titleIndeterminate ? '' : title;
  const titlePlaceholder = titleIndeterminate ? 'multiple' : undefined;
  const displayNote = noteIndeterminate ? '' : note;
  const notePlaceholder = noteIndeterminate ? 'multiple' : undefined;
  const displayColour = colourIndeterminate ? '' : colour;
  const displayFlag = flagIndeterminate && merged ? merged.flagTally.majority : flag;

  const submit = (field: string, value: string | boolean) => {
    if (onSubmitProp) {
      onSubmitProp(field, value);
    } else {
      updateEntry({ id: eventId, [field]: value });
    }
  };

  const cueSubmitHandler = (_field: string, newValue: string) => {
    if (onSubmitProp) {
      onSubmitProp('cue', sanitiseCue(newValue));
    } else {
      updateEntry({ id: eventId, cue: sanitiseCue(newValue) });
    }
  };

  const flagSubmitHandler = (newValue: boolean) => {
    if (flagIndeterminate && merged) {
      submit('flag', merged.flagTally.majority);
    } else {
      submit('flag', newValue);
    }
  };

  return (
    <div className={style.column}>
      <Editor.Title>Event Data</Editor.Title>
      <div className={style.splitThree}>
        <div>
          <Editor.Label htmlFor='eventId'>Event ID (read only)</Editor.Label>
          <Input id='eventId' data-testid='input-textfield' value={isMulti ? '' : eventId} readOnly disabled={isMulti} fluid />
        </div>
        {isMulti ? (
          <div>
            <Editor.Label htmlFor='cue'>Cue</Editor.Label>
            <Input id='cue' data-testid='input-textfield' value='' readOnly disabled fluid />
          </div>
        ) : (
          <EntryEditorTextInput
            field='cue'
            label='Cue'
            initialValue={cue}
            submitHandler={cueSubmitHandler}
            maxLength={10}
          />
        )}
        <div>
          <Editor.Label htmlFor='flag'>Flag</Editor.Label>
          <Editor.Label className={style.switchLabel}>
            <Switch
              id='flag'
              checked={displayFlag}
              onCheckedChange={flagSubmitHandler}
              indeterminate={flagIndeterminate}
            />
            {merged
              ? switchLabel(merged.flagTally, flagIndeterminate, displayFlag)
              : displayFlag
                ? 'On'
                : 'Off'}
          </Editor.Label>
        </div>
      </div>
      <div>
        <Editor.Label>Colour {colourIndeterminate && <span className={style.hint}>(multiple selected)</span>}</Editor.Label>
        <SwatchSelect name='colour' value={displayColour} handleChange={submit} />
      </div>
      <EntryEditorTextInput field='title' label='Title' initialValue={displayTitle} placeholder={titlePlaceholder} submitHandler={submit} />
      <EventTextArea field='note' label='Note' initialValue={displayNote} placeholder={notePlaceholder} submitHandler={submit} />
    </div>
  );
}
