import { useState } from 'react'
import {
  View, StyleSheet, TouchableOpacity, Modal, TextInput,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import type { PromptAnswer } from '../api/discover'
import {
  MAX_PROMPT_ANSWERS, MAX_PROMPT_ANSWER_LENGTH, promptLabel, type ProfilePrompt,
} from '../constants/prompts'
import {
  availablePrompts, canAddPrompt, isAnswerValid, remainingChars,
  removeAnswer, upsertAnswer,
} from '../lib/promptAnswers'
import { Colors, Fonts, FontSize, Radius, Spacing } from '../theme'
import { Text } from './Text'

/**
 * Own-profile prompt editor (issue #13).
 *
 * `PromptEditor` is a thin stateful container; the visible pieces
 * (`PromptAnswerList`, `PromptEditorSheet`) are hook-free and exported so unit
 * tests can invoke them as plain functions — same pattern as HingeCard /
 * ProfileDetail.
 */

interface PromptAnswerListProps {
  prompts: PromptAnswer[]
  onAdd: () => void
  onEdit: (prompt: PromptAnswer) => void
  onRemove: (prompt: PromptAnswer) => void
}

/** Answered prompts as cards + an "Add a prompt" CTA while slots remain. */
export function PromptAnswerList({ prompts, onAdd, onEdit, onRemove }: PromptAnswerListProps) {
  return (
    <View style={styles.list}>
      {prompts.map((p) => (
        <View key={p.promptId} style={styles.answerCard} testID={`prompt-answer-${p.promptId}`}>
          <TouchableOpacity
            style={styles.answerBody}
            onPress={() => onEdit(p)}
            activeOpacity={0.8}
            testID={`prompt-edit-${p.promptId}`}
            accessibilityRole="button"
            accessibilityLabel={`Edit answer for ${promptLabel(p.promptId)}`}
          >
            <Text style={styles.answerLabel}>{promptLabel(p.promptId)}</Text>
            <Text preset="heading" style={styles.answerText}>{p.answer}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRemove(p)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={`prompt-remove-${p.promptId}`}
            accessibilityRole="button"
            accessibilityLabel={`Remove answer for ${promptLabel(p.promptId)}`}
          >
            <Feather name="x" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}

      {canAddPrompt(prompts) && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAdd}
          activeOpacity={0.8}
          testID="prompt-add"
          accessibilityRole="button"
          accessibilityLabel="Add a prompt"
        >
          <Feather name="plus" size={16} color={Colors.accent} />
          <Text style={styles.addText}>
            {prompts.length === 0 ? 'Add a prompt — let them hear your voice' : 'Add another prompt'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

interface PromptEditorSheetProps {
  visible: boolean
  /** null while the member is still picking which prompt to answer. */
  promptId: string | null
  answer: string
  /** Catalog entries the picker may offer (unanswered + the one being edited). */
  options: ProfilePrompt[]
  saving?: boolean
  onPickPrompt: (id: string) => void
  onChangeAnswer: (text: string) => void
  onSave: () => void
  onClose: () => void
}

/** Modal sheet: prompt picker first, then the 150-char answer editor. */
export function PromptEditorSheet({
  visible, promptId, answer, options, saving,
  onPickPrompt, onChangeAnswer, onSave, onClose,
}: PromptEditorSheetProps) {
  const picking = promptId === null
  const valid = isAnswerValid(answer)

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet} testID="prompt-sheet">
          <View style={styles.sheetHeader}>
            <Text preset="subheading">{picking ? 'Pick a prompt' : 'Your answer'}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="prompt-sheet-close"
              accessibilityRole="button"
              accessibilityLabel="Close prompt editor"
            >
              <Feather name="x" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {picking ? (
            <View style={styles.pickerList} testID="prompt-picker">
              {options.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pickerRow}
                  onPress={() => onPickPrompt(p.id)}
                  activeOpacity={0.8}
                  testID={`prompt-option-${p.id}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.pickerText}>{p.label}</Text>
                  <Feather name="chevron-right" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.editor} testID="prompt-answer-editor">
              <Text style={styles.answerLabel}>{promptLabel(promptId)}</Text>
              <TextInput
                style={styles.input}
                value={answer}
                onChangeText={onChangeAnswer}
                maxLength={MAX_PROMPT_ANSWER_LENGTH}
                multiline
                autoFocus
                placeholder="Keep it warm. Keep it you."
                placeholderTextColor={Colors.textMuted}
                testID="prompt-answer-input"
                accessibilityLabel="Prompt answer"
              />
              <View style={styles.editorFooter}>
                <Text preset="caption" color={Colors.textMuted} testID="prompt-counter">
                  {`${remainingChars(answer)} left`}
                </Text>
                <TouchableOpacity
                  style={[styles.saveButton, (!valid || saving) && styles.saveButtonDisabled]}
                  onPress={onSave}
                  disabled={!valid || !!saving}
                  activeOpacity={0.85}
                  testID="prompt-save"
                  accessibilityRole="button"
                  accessibilityLabel="Save answer"
                >
                  <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

interface PromptEditorProps {
  prompts?: PromptAnswer[]
  /** Called with the full next array — PATCH replaces wholesale on the service. */
  onSave: (next: PromptAnswer[]) => void
  saving?: boolean
}

interface SheetState {
  promptId: string | null
  answer: string
}

export function PromptEditor({ prompts = [], onSave, saving }: PromptEditorProps) {
  const [sheet, setSheet] = useState<SheetState | null>(null)

  function commit() {
    if (!sheet || sheet.promptId === null) return
    onSave(upsertAnswer(prompts, sheet.promptId, sheet.answer))
    setSheet(null)
  }

  return (
    <View>
      <PromptAnswerList
        prompts={prompts}
        onAdd={() => setSheet({ promptId: null, answer: '' })}
        onEdit={(p) => setSheet({ promptId: p.promptId, answer: p.answer })}
        onRemove={(p) => onSave(removeAnswer(prompts, p.promptId))}
      />
      {sheet !== null && (
        <PromptEditorSheet
          visible
          promptId={sheet.promptId}
          answer={sheet.answer}
          options={availablePrompts(prompts, sheet.promptId)}
          saving={saving}
          onPickPrompt={(id) => setSheet({ promptId: id, answer: sheet.answer })}
          onChangeAnswer={(text) => setSheet({ ...sheet, answer: text })}
          onSave={commit}
          onClose={() => setSheet(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },

  answerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  answerBody: { flex: 1, gap: Spacing.xs },
  answerLabel: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.xs,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  answerText: { fontSize: FontSize.xl, lineHeight: 28 },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accent + '60',
    borderStyle: 'dashed',
  },
  addText: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },

  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  pickerList: { gap: 0 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerText: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },

  editor: { gap: Spacing.sm },
  input: {
    minHeight: 100,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    fontFamily: Fonts.regular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  editorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.sm,
    color: Colors.onAccent,
  },
})
