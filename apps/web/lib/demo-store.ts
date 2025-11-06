// In-memory data store for demo purposes
// Replace with real database in production

export interface Project {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  specs: Spec[];
  mocks: Mock[];
  tests: Test[];
}

export interface Spec {
  id: string;
  projectId: string;
  name: string;
  type: 'OPENAPI' | 'ASYNCAPI';
  url?: string;
  content?: any;
  createdAt: Date;
}

export interface Mock {
  id: string;
  projectId: string;
  specId: string;
  name: string;
  status: 'RUNNING' | 'STOPPED';
  port: number;
  requests: number;
  createdAt: Date;
}

export interface Test {
  id: string;
  projectId: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'PENDING';
  passed: number;
  failed: number;
  total: number;
  createdAt: Date;
}

export interface Trace {
  id: string;
  projectId: string;
  method: string;
  path: string;
  statusCode: number;
  latency: number;
  valid: boolean;
  errors: string[];
  createdAt: Date;
}

// In-memory storage
const store = {
  projects: new Map<string, Project>(),
  specs: new Map<string, Spec>(),
  mocks: new Map<string, Mock>(),
  tests: new Map<string, Test>(),
  traces: new Map<string, Trace>(),
};

// Initialize with sample data
export function initializeDemoData() {
  // Sample project
  const project1: Project = {
    id: '1',
    name: 'Stripe Payment Integration',
    status: 'ACTIVE',
    specs: [],
    mocks: [],
    tests: [],
  };
  
  store.projects.set(project1.id, project1);
}

// Project operations
export const projectStore = {
  getAll: () => Array.from(store.projects.values()),
  getById: (id: string) => store.projects.get(id),
  create: (project: Omit<Project, 'id'>) => {
    const id = Date.now().toString();
    const newProject = { ...project, id };
    store.projects.set(id, newProject);
    return newProject;
  },
  update: (id: string, updates: Partial<Project>) => {
    const project = store.projects.get(id);
    if (!project) return null;
    const updated = { ...project, ...updates };
    store.projects.set(id, updated);
    return updated;
  },
};

// Spec operations
export const specStore = {
  getAll: () => Array.from(store.specs.values()),
  getByProjectId: (projectId: string) => 
    Array.from(store.specs.values()).filter(s => s.projectId === projectId),
  getById: (id: string) => store.specs.get(id),
  create: (spec: Omit<Spec, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newSpec = { ...spec, id, createdAt: new Date() };
    store.specs.set(id, newSpec);
    return newSpec;
  },
};

// Mock operations
export const mockStore = {
  getAll: () => Array.from(store.mocks.values()),
  getByProjectId: (projectId: string) => 
    Array.from(store.mocks.values()).filter(m => m.projectId === projectId),
  getById: (id: string) => store.mocks.get(id),
  create: (mock: Omit<Mock, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newMock = { ...mock, id, createdAt: new Date() };
    store.mocks.set(id, newMock);
    return newMock;
  },
  updateStatus: (id: string, status: 'RUNNING' | 'STOPPED') => {
    const mock = store.mocks.get(id);
    if (!mock) return null;
    mock.status = status;
    return mock;
  },
};

// Test operations
export const testStore = {
  getAll: () => Array.from(store.tests.values()),
  getByProjectId: (projectId: string) => 
    Array.from(store.tests.values()).filter(t => t.projectId === projectId),
  getById: (id: string) => store.tests.get(id),
  create: (test: Omit<Test, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newTest = { ...test, id, createdAt: new Date() };
    store.tests.set(id, newTest);
    return newTest;
  },
};

// Trace operations
export const traceStore = {
  getAll: () => Array.from(store.traces.values()),
  getByProjectId: (projectId: string) => 
    Array.from(store.traces.values()).filter(t => t.projectId === projectId),
  create: (trace: Omit<Trace, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newTrace = { ...trace, id, createdAt: new Date() };
    store.traces.set(id, newTrace);
    return newTrace;
  },
};

// Initialize on import
initializeDemoData();
