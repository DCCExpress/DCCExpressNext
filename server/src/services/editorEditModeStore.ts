// server/src/services/editorEditModeStore.ts

class EditorEditModeStore {
  private readonly editingClients =
    new Set<string>();

  setClientEditMode(
    clientUuid: string | null | undefined,
    editMode: boolean
  ): void {
    if (!clientUuid) {
      return;
    }

    if (editMode) {
      this.editingClients.add(clientUuid);
      return;
    }

    this.editingClients.delete(clientUuid);
  }

  removeClient(
    clientUuid: string | null | undefined
  ): void {
    if (!clientUuid) {
      return;
    }

    this.editingClients.delete(clientUuid);
  }

  hasEditingClients(): boolean {
    return this.editingClients.size > 0;
  }

  getEditingClientIds(): string[] {
    return [...this.editingClients];
  }
}

export const editorEditModeStore =
  new EditorEditModeStore();
