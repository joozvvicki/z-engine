import { computed, ComputedRef, type Ref } from 'vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

export interface PresentationItem {
  type: 'command' | 'placeholder'
  command?: ZEventCommand
  index: number
  indent: number
}

export const useEventCommands = (
  commandList: Ref<ZEventCommand[]>
): {
  presentationList: ComputedRef<PresentationItem[]>
  deleteCommand: (index: number) => void
  saveCommand: (
    cmdData: { code: number; parameters: unknown[] },
    editingIndex: number | null,
    insertionIndex: number | null,
    selectedIndex: number | null
  ) => void
  getChoiceName: (itemIndex: number, choiceIndex: number) => string
} => {
  /**
   * Build a list for the UI, calculating indentation and adding placeholders
   */
  const presentationList = computed(() => {
    const result: PresentationItem[] = []
    let depth = 0

    const addPlaceholder = (idx: number, d: number): void => {
      result.push({ type: 'placeholder', index: idx, indent: d })
    }

    commandList.value.forEach((cmd, idx) => {
      const isBranchMid = [ZCommandCode.Else, ZCommandCode.When].includes(cmd.code)
      const isBlockEnd = [
        ZCommandCode.EndBranch,
        ZCommandCode.EndChoices,
        ZCommandCode.EndLoop
      ].includes(cmd.code)

      // Placeholder should be at the depth of the content it belongs to
      const placeholderDepth = depth

      if (isBranchMid || isBlockEnd) {
        depth = Math.max(0, depth - 1)
      }

      // Special case: prevent adding commands between ShowChoices and the first When
      const isFirstChoiceBranch =
        cmd.code === ZCommandCode.When &&
        idx > 0 &&
        commandList.value[idx - 1].code === ZCommandCode.ShowChoices

      if (!isFirstChoiceBranch) {
        addPlaceholder(idx, placeholderDepth)
      }

      result.push({ type: 'command', command: cmd, index: idx, indent: depth })

      if (
        [
          ZCommandCode.ConditionalBranch,
          ZCommandCode.Else,
          ZCommandCode.ShowChoices,
          ZCommandCode.When,
          ZCommandCode.Loop
        ].includes(cmd.code)
      ) {
        depth++
      }
    })

    addPlaceholder(commandList.value.length, depth)
    return result
  })

  /**
   * Delete a command, with cascaded deletion for hierarchical blocks
   */
  const deleteCommand = (index: number): void => {
    const cmd = commandList.value[index]
    if (!cmd) return

    // Prevent individual deletion of hierarchical sub-commands
    if (
      [
        ZCommandCode.Else,
        ZCommandCode.EndBranch,
        ZCommandCode.When,
        ZCommandCode.EndChoices,
        ZCommandCode.EndLoop
      ].includes(cmd.code)
    ) {
      return
    }

    // Cascaded deletion for hierarchical blocks
    let count = 1
    if (
      [ZCommandCode.ShowChoices, ZCommandCode.ConditionalBranch, ZCommandCode.Loop].includes(
        cmd.code
      )
    ) {
      let depth = 0
      for (let i = index; i < commandList.value.length; i++) {
        const c = commandList.value[i]
        if (
          [ZCommandCode.ShowChoices, ZCommandCode.ConditionalBranch, ZCommandCode.Loop].includes(
            c.code
          )
        ) {
          depth++
        } else if (
          [ZCommandCode.EndChoices, ZCommandCode.EndBranch, ZCommandCode.EndLoop].includes(c.code)
        ) {
          depth--
          if (depth === 0) {
            count = i - index + 1
            break
          }
        }
      }
    }

    commandList.value.splice(index, count)
  }

  /**
   * Insert or Update a command, with automatic expansion for hierarchical blocks
   */
  const saveCommand = (
    cmdData: { code: number; parameters: unknown[] },
    editingIndex: number | null,
    insertionIndex: number | null,
    selectedIndex: number | null
  ): void => {
    const createCommand = (code: number, params: unknown[] = []): ZEventCommand => ({
      code,
      parameters: params,
      indent: 0
    })

    const commandsToInsert: ZEventCommand[] = [createCommand(cmdData.code, cmdData.parameters)]

    // Expansion logic (only when creating new block commands)
    if (editingIndex === null) {
      if (cmdData.code === ZCommandCode.ShowChoices) {
        const labels = (cmdData.parameters[0] as string[]) || []
        const cancelType = cmdData.parameters[1] as number

        labels.forEach((_, idx) => {
          commandsToInsert.push(createCommand(ZCommandCode.When, [idx]))
        })

        if (cancelType === 1) {
          commandsToInsert.push(createCommand(ZCommandCode.When, [-1]))
        }
        commandsToInsert.push(createCommand(ZCommandCode.EndChoices))
      } else if (cmdData.code === ZCommandCode.ConditionalBranch) {
        const hasElse = cmdData.parameters[3] === 1
        if (hasElse) {
          commandsToInsert.push(createCommand(ZCommandCode.Else))
        }
        commandsToInsert.push(createCommand(ZCommandCode.EndBranch))
      } else if (cmdData.code === ZCommandCode.Loop) {
        commandsToInsert.push(createCommand(ZCommandCode.EndLoop))
      }
    }

    if (editingIndex !== null) {
      commandList.value[editingIndex] = commandsToInsert[0]
    } else {
      let targetIndex = commandList.value.length
      if (insertionIndex !== null) {
        targetIndex = insertionIndex
      } else if (selectedIndex !== null) {
        targetIndex = selectedIndex + 1
      }
      commandList.value.splice(targetIndex, 0, ...commandsToInsert)
    }
  }

  /**
   * Helper to find the choice label for a 'When' branch
   */
  const getChoiceName = (itemIndex: number, choiceIndex: number): string => {
    if (choiceIndex === -1) return 'Cancel'

    for (let i = itemIndex - 1; i >= 0; i--) {
      const cmd = commandList.value[i]
      if (cmd.code === ZCommandCode.ShowChoices) {
        const labels = (cmd.parameters[0] as string[]) || []
        return labels[choiceIndex] || `Choice ${choiceIndex + 1}`
      }
    }

    return `Choice ${choiceIndex + 1}`
  }

  return {
    presentationList,
    deleteCommand,
    saveCommand,
    getChoiceName
  }
}
