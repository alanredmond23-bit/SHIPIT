/**
 * useArtifacts - Artifact state management hook
 *
 * Manages artifact state, version history, and selection
 */

import { useState, useCallback, useMemo } from 'react';
import type { ArtifactType, CodeLanguage } from '@/lib/artifacts';

// ============================================================================
// Types
// ============================================================================

export interface ArtifactVersion {
  id: string;
  content: string;
  timestamp: Date;
  changeDescription?: string;
}

export interface Artifact {
  id: string;
  messageId?: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: CodeLanguage;
  versions: ArtifactVersion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtifactState {
  artifacts: Artifact[];
  selectedArtifactId: string | null;
  isPanelOpen: boolean;
  isFullscreen: boolean;
  selectedVersionId: string | null;
}

export interface UseArtifactsOptions {
  initialArtifacts?: Artifact[];
  onArtifactChange?: (artifact: Artifact) => void;
  onPanelToggle?: (isOpen: boolean) => void;
}

export interface UseArtifactsReturn {
  // State
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  selectedVersion: ArtifactVersion | null;
  isPanelOpen: boolean;
  isFullscreen: boolean;

  // Computed
  artifactsByMessage: Map<string, Artifact[]>;
  hasArtifacts: boolean;
  artifactCount: number;

  // Actions
  addArtifact: (artifact: Omit<Artifact, 'id' | 'versions' | 'createdAt' | 'updatedAt'>) => Artifact;
  updateArtifact: (id: string, updates: Partial<Pick<Artifact, 'title' | 'content'>>, changeDescription?: string) => void;
  removeArtifact: (id: string) => void;
  selectArtifact: (id: string) => void;
  closeArtifact: (id: string) => void;
  selectVersion: (versionId: string | null) => void;
  revertToVersion: (artifactId: string, versionId: string) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  toggleFullscreen: () => void;
  clearAll: () => void;
  getArtifactsForMessage: (messageId: string) => Artifact[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useArtifacts(options: UseArtifactsOptions = {}): UseArtifactsReturn {
  const { initialArtifacts = [], onArtifactChange, onPanelToggle } = options;

  // State
  const [state, setState] = useState<ArtifactState>({
    artifacts: initialArtifacts,
    selectedArtifactId: null,
    isPanelOpen: false,
    isFullscreen: false,
    selectedVersionId: null,
  });

  // Generate unique ID
  const generateId = useCallback(() => {
    return `artifact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Get active artifact
  const activeArtifact = useMemo(() => {
    if (!state.selectedArtifactId) return null;
    return state.artifacts.find(a => a.id === state.selectedArtifactId) || null;
  }, [state.artifacts, state.selectedArtifactId]);

  // Get selected version
  const selectedVersion = useMemo(() => {
    if (!activeArtifact || !state.selectedVersionId) return null;
    return activeArtifact.versions.find(v => v.id === state.selectedVersionId) || null;
  }, [activeArtifact, state.selectedVersionId]);

  // Group artifacts by message
  const artifactsByMessage = useMemo(() => {
    const map = new Map<string, Artifact[]>();
    for (const artifact of state.artifacts) {
      if (artifact.messageId) {
        const existing = map.get(artifact.messageId) || [];
        existing.push(artifact);
        map.set(artifact.messageId, existing);
      }
    }
    return map;
  }, [state.artifacts]);

  // Add new artifact
  const addArtifact = useCallback((
    artifactData: Omit<Artifact, 'id' | 'versions' | 'createdAt' | 'updatedAt'>
  ): Artifact => {
    const now = new Date();
    const id = generateId();
    const versionId = `version_${Date.now()}`;

    const artifact: Artifact = {
      ...artifactData,
      id,
      versions: [{
        id: versionId,
        content: artifactData.content,
        timestamp: now,
        changeDescription: 'Initial version',
      }],
      createdAt: now,
      updatedAt: now,
    };

    setState(prev => ({
      ...prev,
      artifacts: [...prev.artifacts, artifact],
      selectedArtifactId: id,
      isPanelOpen: true,
      selectedVersionId: null,
    }));

    onArtifactChange?.(artifact);
    onPanelToggle?.(true);

    return artifact;
  }, [generateId, onArtifactChange, onPanelToggle]);

  // Update existing artifact
  const updateArtifact = useCallback((
    id: string,
    updates: Partial<Pick<Artifact, 'title' | 'content'>>,
    changeDescription?: string
  ) => {
    setState(prev => {
      const artifactIndex = prev.artifacts.findIndex(a => a.id === id);
      if (artifactIndex === -1) return prev;

      const artifact = prev.artifacts[artifactIndex];
      const now = new Date();
      const hasContentChange = updates.content !== undefined && updates.content !== artifact.content;

      const updatedArtifact: Artifact = {
        ...artifact,
        ...updates,
        updatedAt: now,
        versions: hasContentChange
          ? [
              ...artifact.versions,
              {
                id: `version_${Date.now()}`,
                content: updates.content!,
                timestamp: now,
                changeDescription: changeDescription || 'Content updated',
              },
            ]
          : artifact.versions,
      };

      const newArtifacts = [...prev.artifacts];
      newArtifacts[artifactIndex] = updatedArtifact;

      onArtifactChange?.(updatedArtifact);

      return {
        ...prev,
        artifacts: newArtifacts,
        selectedVersionId: null,
      };
    });
  }, [onArtifactChange]);

  // Remove artifact
  const removeArtifact = useCallback((id: string) => {
    setState(prev => {
      const newArtifacts = prev.artifacts.filter(a => a.id !== id);
      const wasSelected = prev.selectedArtifactId === id;

      return {
        ...prev,
        artifacts: newArtifacts,
        selectedArtifactId: wasSelected
          ? (newArtifacts.length > 0 ? newArtifacts[newArtifacts.length - 1].id : null)
          : prev.selectedArtifactId,
        isPanelOpen: wasSelected && newArtifacts.length === 0 ? false : prev.isPanelOpen,
        selectedVersionId: wasSelected ? null : prev.selectedVersionId,
      };
    });
  }, []);

  // Select artifact
  const selectArtifact = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      selectedArtifactId: id,
      isPanelOpen: true,
      selectedVersionId: null,
    }));
    onPanelToggle?.(true);
  }, [onPanelToggle]);

  // Close artifact (deselect without removing)
  const closeArtifact = useCallback((id: string) => {
    setState(prev => {
      // If closing the currently selected artifact, select the next available one
      if (prev.selectedArtifactId === id) {
        const currentIndex = prev.artifacts.findIndex(a => a.id === id);
        const remainingArtifacts = prev.artifacts.filter(a => a.id !== id);

        // Select next artifact if available
        let newSelectedId: string | null = null;
        if (remainingArtifacts.length > 0) {
          newSelectedId = currentIndex > 0
            ? remainingArtifacts[Math.min(currentIndex - 1, remainingArtifacts.length - 1)].id
            : remainingArtifacts[0].id;
        }

        return {
          ...prev,
          selectedArtifactId: newSelectedId,
          selectedVersionId: null,
          isPanelOpen: newSelectedId !== null,
        };
      }
      return prev;
    });
  }, []);

  // Select version
  const selectVersion = useCallback((versionId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedVersionId: versionId,
    }));
  }, []);

  // Revert to a previous version
  const revertToVersion = useCallback((artifactId: string, versionId: string) => {
    setState(prev => {
      const artifactIndex = prev.artifacts.findIndex(a => a.id === artifactId);
      if (artifactIndex === -1) return prev;

      const artifact = prev.artifacts[artifactIndex];
      const version = artifact.versions.find(v => v.id === versionId);
      if (!version) return prev;

      const now = new Date();
      const updatedArtifact: Artifact = {
        ...artifact,
        content: version.content,
        updatedAt: now,
        versions: [
          ...artifact.versions,
          {
            id: `version_${Date.now()}`,
            content: version.content,
            timestamp: now,
            changeDescription: `Reverted to version from ${version.timestamp.toLocaleString()}`,
          },
        ],
      };

      const newArtifacts = [...prev.artifacts];
      newArtifacts[artifactIndex] = updatedArtifact;

      onArtifactChange?.(updatedArtifact);

      return {
        ...prev,
        artifacts: newArtifacts,
        selectedVersionId: null,
      };
    });
  }, [onArtifactChange]);

  // Panel controls
  const openPanel = useCallback(() => {
    setState(prev => ({ ...prev, isPanelOpen: true }));
    onPanelToggle?.(true);
  }, [onPanelToggle]);

  const closePanel = useCallback(() => {
    setState(prev => ({ ...prev, isPanelOpen: false, isFullscreen: false }));
    onPanelToggle?.(false);
  }, [onPanelToggle]);

  const togglePanel = useCallback(() => {
    setState(prev => {
      const newIsOpen = !prev.isPanelOpen;
      onPanelToggle?.(newIsOpen);
      return {
        ...prev,
        isPanelOpen: newIsOpen,
        isFullscreen: newIsOpen ? prev.isFullscreen : false,
      };
    });
  }, [onPanelToggle]);

  const toggleFullscreen = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen,
    }));
  }, []);

  // Clear all artifacts
  const clearAllArtifacts = useCallback(() => {
    setState({
      artifacts: [],
      selectedArtifactId: null,
      isPanelOpen: false,
      isFullscreen: false,
      selectedVersionId: null,
    });
    onPanelToggle?.(false);
  }, [onPanelToggle]);

  // Get artifacts for a specific message
  const getArtifactsForMessage = useCallback((messageId: string): Artifact[] => {
    return state.artifacts.filter(a => a.messageId === messageId);
  }, [state.artifacts]);

  return {
    // State
    artifacts: state.artifacts,
    activeArtifact,
    selectedVersion,
    isPanelOpen: state.isPanelOpen,
    isFullscreen: state.isFullscreen,

    // Computed
    artifactsByMessage,
    hasArtifacts: state.artifacts.length > 0,
    artifactCount: state.artifacts.length,

    // Actions
    addArtifact,
    updateArtifact,
    removeArtifact,
    selectArtifact,
    closeArtifact,
    selectVersion,
    revertToVersion,
    openPanel,
    closePanel,
    togglePanel,
    toggleFullscreen,
    clearAll: clearAllArtifacts,
    getArtifactsForMessage,
  };
}

export default useArtifacts;
