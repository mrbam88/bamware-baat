import { View, Pressable, StyleSheet } from 'react-native'
import { TAG_CATEGORIES, MAX_SELECTED_TAGS } from '../constants/tags'
import { useToast } from './ToastProvider'
import { Text } from './Text'
import { Colors, Spacing, Radius } from '../theme'

interface Props {
  selected: string[]
  onChange: (tags: string[]) => void
}

export function TagSelector({ selected, onChange }: Props) {
  const { showToast } = useToast()
  const selectedSet = new Set(selected)

  function toggle(tag: string) {
    if (selectedSet.has(tag)) {
      onChange(selected.filter((t) => t !== tag))
    } else {
      if (selected.length >= MAX_SELECTED_TAGS) {
        showToast({ variant: 'info', message: `You can pick up to ${MAX_SELECTED_TAGS} tags.` })
        return
      }
      onChange([...selected, tag])
    }
  }

  return (
    <View style={styles.container}>
      {TAG_CATEGORIES.map((category) => (
        <View key={category.id} style={styles.category}>
          <Text preset="label" weight="semibold" color={Colors.accent} style={styles.categoryLabel}>
            {category.label}
          </Text>
          <View style={styles.chips}>
            {category.tags.map((tag) => {
              const active = selectedSet.has(tag)
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggle(tag)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    preset="caption"
                    weight={active ? 'semibold' : 'regular'}
                    color={active ? Colors.textPrimary : Colors.textSecondary}
                  >
                    {tag}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { gap: Spacing.lg },
  category:      { gap: Spacing.sm },
  categoryLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
})
