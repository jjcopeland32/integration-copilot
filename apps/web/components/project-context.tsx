'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ProjectContextValue = {
  projectId?: string;
  projectName?: string;
  setActiveProject: (project: { id: string; name?: string }) => void;
  clearProject: () => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [projectName, setProjectName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const storedId = window.localStorage.getItem('activeProjectId') ?? undefined;
    const storedName = window.localStorage.getItem('activeProjectName') ?? undefined;
    if (storedId) setProjectId(storedId);
    if (storedName) setProjectName(storedName);
  }, []);

  const setActiveProject = (project: { id: string; name?: string }) => {
    setProjectId(project.id);
    if (project.name) {
      setProjectName(project.name);
      window.localStorage.setItem('activeProjectName', project.name);
    }
    window.localStorage.setItem('activeProjectId', project.id);
  };

  const clearProject = () => {
    setProjectId(undefined);
    setProjectName(undefined);
    window.localStorage.removeItem('activeProjectId');
    window.localStorage.removeItem('activeProjectName');
  };

  const value = useMemo(
    () => ({
      projectId,
      projectName,
      setActiveProject,
      clearProject,
    }),
    [projectId, projectName]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }
  return ctx;
}
