import { create } from 'zustand';

import type {
  ProjectRecord,
  ProjectWithScenarios,
  ScenarioPatch,
  ScenarioRecord,
} from '../db/repos/projects';
import { projectRepo } from '../db/repos/projects';
import type { DesignResult, LoadItem } from '../core/types';
import { getDbService } from './dbService';
interface ProjectState {
  projects: ProjectRecord[];
  activeProject: ProjectWithScenarios | null;
  activeScenario: ScenarioRecord | null;
  loading: boolean;

  refresh: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  create: (input: {
    name: string;
    clientName?: string;
    notes?: string;
    scenarioName?: string;
    systemType?: 'on-grid' | 'off-grid' | 'hybrid';
    loads?: LoadItem[];
  }) => Promise<ProjectWithScenarios>;
  duplicate: (id: string) => Promise<void>;
  rename: (
    id: string,
    patch: Partial<Pick<ProjectRecord, 'name' | 'clientName' | 'notes'>>,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
  importProject: (backup: import('../reports/jsonIO').ProjectExport) => Promise<void>;

  setActiveScenario: (scenarioId: string) => Promise<void>;
  addScenario: (patch?: ScenarioPatch) => Promise<void>;
  updateScenario: (scenarioId: string, patch: ScenarioPatch) => Promise<void>;
  deleteScenario: (scenarioId: string) => Promise<void>;
  saveDesignResult: (scenarioId: string, result: DesignResult) => Promise<void>;
}

function repo() {
  return projectRepo(getDbService());
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  activeScenario: null,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const projects = await repo().listProjects();
      set({ projects });
    } finally {
      set({ loading: false });
    }
  },

  loadProject: async (id) => {
    const activeProject = await repo().getProject(id);
    const activeScenario =
      activeProject?.scenarios.find((s) => s.isActive) ?? activeProject?.scenarios[0] ?? null;
    set({ activeProject, activeScenario });
  },

  create: async (input) => {
    const project = await repo().createProject({
      name: input.name,
      clientName: input.clientName,
      notes: input.notes,
      scenario: input.scenarioName
        ? {
            name: input.scenarioName,
            systemType: input.systemType,
            loads: input.loads,
          }
        : undefined,
    });
    await get().refresh();
    return project;
  },

  duplicate: async (id) => {
    await repo().duplicateProject(id);
    await get().refresh();
  },

  rename: async (id, patch) => {
    await repo().updateProject(id, patch);
    await get().refresh();
    if (get().activeProject?.id === id) await get().loadProject(id);
  },

  remove: async (id) => {
    await repo().deleteProject(id);
    if (get().activeProject?.id === id) set({ activeProject: null, activeScenario: null });
    await get().refresh();
  },

  importProject: async (backup) => {
    await repo().importProject(backup);
    await get().refresh();
  },

  setActiveScenario: async (scenarioId) => {
    const project = get().activeProject;
    if (!project) return;
    await repo().setActiveScenario(project.id, scenarioId);
    await get().loadProject(project.id);
  },

  addScenario: async (patch) => {
    const project = get().activeProject;
    if (!project) return;
    await repo().addScenario(project.id, patch);
    await get().loadProject(project.id);
  },

  updateScenario: async (scenarioId, patch) => {
    await repo().updateScenario(scenarioId, patch);
    const project = get().activeProject;
    if (project) await get().loadProject(project.id);
  },

  deleteScenario: async (scenarioId) => {
    await repo().deleteScenario(scenarioId);
    const project = get().activeProject;
    if (project) await get().loadProject(project.id);
  },

  saveDesignResult: async (scenarioId, result) => {
    await repo().saveDesignResult(scenarioId, result);
    const project = get().activeProject;
    if (project) await get().loadProject(project.id);
  },
}));
