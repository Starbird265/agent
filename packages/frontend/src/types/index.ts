/**
 * Nitrix Platform - TypeScript Type Definitions
 * Comprehensive type safety for the entire platform
 */

// Core Entity Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created: string;
  updated: string;
  type: ProjectType;
  userIntent?: string;
  useCase?: UseCase;
  dataSource?: DataSource;
  targetMetrics?: TargetMetrics;
  template?: PipelineTemplate;
  currentStage?: string;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  apiEndpoint?: string;
  sdkSnippet?: string;
  modelId?: string;
  accuracy?: number;
  error?: string;
}

export type ProjectStatus = 
  | 'created' 
  | 'initialized' 
  | 'training' 
  | 'deployed' 
  | 'failed' 
  | 'paused' 
  | 'completed';

export type ProjectType = 
  | 'automated-pipeline' 
  | 'custom-training' 
  | 'imported-model' 
  | 'template-based';

export type UseCase = 
  | 'text-generation' 
  | 'speech-to-text' 
  | 'image-generation' 
  | 'classification' 
  | 'recommendation' 
  | 'forecasting';

// Intent Capture Types
export interface IntentData {
  description: string;
  useCase: UseCase;
  dataSource: DataSource;
  targetMetrics: TargetMetrics;
  name: string;
}

export interface TargetMetrics {
  accuracy?: string;
  latency?: string;
  cost: CostPreference;
}

export type CostPreference = 'low' | 'medium' | 'high';

export type DataSource = 
  | '' 
  | 'upload' 
  | 'google-drive' 
  | 's3' 
  | 'database' 
  | 'api';

// Pipeline Types
export interface PipelineTemplate {
  model: string;
  preprocessing: string[];
  training: string[];
  deployment: string[];
}

export interface Pipeline {
  id: string;
  userIntent: string;
  useCase: UseCase;
  dataSource: DataSource;
  targetMetrics: TargetMetrics;
  template: PipelineTemplate;
  status: PipelineStatus;
  created: string;
  stages?: PipelineStage[];
  currentStage?: string;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export type PipelineStatus = 
  | 'created' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed';

export interface PipelineStage {
  name: string;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  logs?: string[];
  metrics?: Record<string, any>;
}

// File Types
export interface FileData {
  id: string;
  projectId: string;
  name: string;
  size: number;
  type: string;
  uploaded: string;
  analysis?: DataAnalysis;
  location: FileLocation;
  content?: ArrayBuffer;
  error?: string;
}

export type FileLocation = 
  | 'filesystem' 
  | 'indexeddb' 
  | 'download' 
  | 'error';

export interface DataAnalysis {
  rows: number;
  columns: number;
  features: FeatureInfo[];
  dataTypes: Record<string, DataType>;
  missing: Record<string, number>;
  statistics: Record<string, any>;
  recommendations: string[];
}

export interface FeatureInfo {
  name: string;
  type: DataType;
  unique: number;
  missing: number;
  distribution?: any;
}

export type DataType = 
  | 'numeric' 
  | 'categorical' 
  | 'text' 
  | 'date' 
  | 'boolean' 
  | 'unknown';

// ML Training Types
export interface TrainingConfig {
  modelType: ModelType;
  features: string[];
  labels: string[];
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  validationSplit?: number;
  optimizer?: OptimizerType;
  lossFunction?: LossFunction;
  metrics?: MetricType[];
  callbacks?: TrainingCallback[];
}

export type ModelType = 
  | 'classification' 
  | 'regression' 
  | 'clustering' 
  | 'neural-network' 
  | 'transformer';

export type OptimizerType = 
  | 'adam' 
  | 'sgd' 
  | 'rmsprop' 
  | 'adagrad';

export type LossFunction = 
  | 'categoricalCrossentropy' 
  | 'binaryCrossentropy' 
  | 'meanSquaredError' 
  | 'meanAbsoluteError';

export type MetricType = 
  | 'accuracy' 
  | 'precision' 
  | 'recall' 
  | 'f1Score' 
  | 'mae' 
  | 'mse';

export interface TrainingCallback {
  type: 'onEpochEnd' | 'onBatchEnd' | 'onTrainEnd';
  callback: (epoch: number, logs: any) => void;
}

export interface TrainingSession {
  id: string;
  projectId: string;
  status: TrainingStatus;
  config: TrainingConfig;
  started: string;
  completed?: string;
  progress: number;
  currentEpoch?: number;
  totalEpochs?: number;
  currentLoss?: number;
  currentAccuracy?: number;
  history?: TrainingHistory;
  modelId?: string;
  error?: string;
}

export type TrainingStatus = 
  | 'initialized' 
  | 'training' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface TrainingHistory {
  loss: number[];
  accuracy: number[];
  val_loss: number[];
  val_accuracy: number[];
  epochs: number[];
}

export interface TrainingProgress {
  epoch: number;
  progress: number;
  loss: number;
  accuracy?: number;
  timeRemaining?: number;
}

// Model Types
export interface ModelInfo {
  id: string;
  name: string;
  type: ModelType;
  framework: Framework;
  version: string;
  size: number;
  accuracy?: number;
  created: string;
  updated: string;
  status: ModelStatus;
  projectId?: string;
  trainingId?: string;
  deploymentUrl?: string;
  tags: string[];
  description?: string;
  parameters?: Record<string, any>;
  metrics?: ModelMetrics;
  inputShape?: number[];
  outputShape?: number[];
}

export type ModelStatus = 
  | 'training' 
  | 'ready' 
  | 'deployed' 
  | 'failed' 
  | 'deprecated';

export type Framework = 
  | 'tensorflow' 
  | 'pytorch' 
  | 'huggingface' 
  | 'onnx' 
  | 'custom';

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  loss?: number;
  inferenceTime?: number;
  memoryUsage?: number;
}

// HuggingFace Types
export interface HuggingFaceModel {
  id: string;
  author: string;
  downloads: number;
  tags: string[];
  library: string;
  description?: string;
  size?: number;
  lastModified?: string;
  pipeline?: string;
  modelType?: string;
  language?: string[];
  license?: string;
}

export interface HuggingFaceSearchParams {
  query?: string;
  author?: string;
  filter?: string[];
  sort?: 'downloads' | 'lastModified' | 'created';
  direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// System Types
export interface SystemInfo {
  cpu_count: number;
  cpu_percent: number;
  total_ram_gb: number;
  ram_percent: number;
  gpu_available: boolean;
  gpu_count: number;
  gpu_names: string[];
  gpus: GPUInfo[];
  platform: string;
  architecture: string;
  pythonVersion?: string;
  tensorflowVersion?: string;
  torchVersion?: string;
}

export interface GPUInfo {
  id: number;
  name: string;
  driver: string;
  memory_total: number;
  memory_used: number;
  memory_free: number;
  load: number;
  temperature: number;
  uuid: string;
}

// API Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth Types
export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  created: string;
  lastLogin?: string;
  preferences: UserPreferences;
}

export type UserRole = 'admin' | 'user' | 'viewer';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  autoSave: boolean;
  performanceMode: 'high' | 'balanced' | 'power-saving';
}

export interface Session {
  token: string;
  user: User;
  expires: string;
  created: string;
  lastActivity: string;
}

// Event Types
export interface AppEvent {
  type: EventType;
  timestamp: string;
  source: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

export type EventType = 
  | 'project_created' 
  | 'project_updated' 
  | 'training_started' 
  | 'training_completed' 
  | 'training_failed' 
  | 'model_deployed' 
  | 'file_uploaded' 
  | 'prediction_made' 
  | 'error_occurred' 
  | 'user_login' 
  | 'user_logout';

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

export interface IntentCaptureProps extends BaseComponentProps {
  onIntentSubmit: (intent: IntentData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<IntentData>;
  disabled?: boolean;
}

export interface ModelDashboardProps extends BaseComponentProps {
  activeModels: Project[];
  trainingQueue: Project[];
  onCreateNew: () => void;
  onRefresh: () => Promise<void>;
  showOnlyActive?: boolean;
}

export interface PipelineOrchestratorProps extends BaseComponentProps {
  trainingQueue: Project[];
  onRefresh: () => Promise<void>;
  onPause?: (projectId: string) => void;
  onResume?: (projectId: string) => void;
  onCancel?: (projectId: string) => void;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Configuration Types
export interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
  version: string;
  features: FeatureFlags;
  limits: SystemLimits;
  ui: UIConfig;
}

export interface FeatureFlags {
  huggingFaceIntegration: boolean;
  localTraining: boolean;
  fileSystemAccess: boolean;
  advancedMetrics: boolean;
  experimentalFeatures: boolean;
  betaFeatures: boolean;
}

export interface SystemLimits {
  maxFileSize: number;
  maxProjects: number;
  maxTrainingTime: number;
  maxModelSize: number;
  maxConcurrentTraining: number;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'system';
  animations: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
}

// Export everything as a namespace as well
export namespace Nitrix {
  export type ProjectType = Project;
  export type IntentDataType = IntentData;
  export type PipelineType = Pipeline;
  export type ModelInfoType = ModelInfo;
  export type TrainingSessionType = TrainingSession;
  export type SystemInfoType = SystemInfo;
  export type UserType = User;
  export type AppConfigType = AppConfig;
}

// Default export for convenience
export default Nitrix;