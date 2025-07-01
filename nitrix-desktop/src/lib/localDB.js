/**
 * AI TrainEasy - Local Database & Storage
 * Privacy-First: Everything stays on user's device
 * No cloud dependencies, complete user control
 */

// IndexedDB wrapper for local data persistence
class LocalDatabase {
  constructor() {
    this.dbName = 'AITrainEasy';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('created', 'created', { unique: false });
        }

        // Files store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('projectId', 'projectId', { unique: false });
          fileStore.createIndex('name', 'name', { unique: false });
        }

        // Models store
        if (!db.objectStoreNames.contains('models')) {
          const modelStore = db.createObjectStore('models', { keyPath: 'id' });
          modelStore.createIndex('projectId', 'projectId', { unique: false });
          modelStore.createIndex('name', 'name', { unique: false });
        }

        // Training sessions store
        if (!db.objectStoreNames.contains('training')) {
          const trainingStore = db.createObjectStore('training', { keyPath: 'id' });
          trainingStore.createIndex('projectId', 'projectId', { unique: false });
          trainingStore.createIndex('status', 'status', { unique: false });
        }

        // Local settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Generic CRUD operations
  async add(storeName, data) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.add({ ...data, id: data.id || this.generateId() });
  }

  async get(storeName, id) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return store.get(id);
  }

  async getAll(storeName) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return store.getAll();
  }

  async update(storeName, data) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.put(data);
  }

  async delete(storeName, id) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.delete(id);
  }

  async getByIndex(storeName, indexName, value) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    return index.getAll(value);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Local File System using File System Access API (modern browsers)
class LocalFileSystem {
  constructor() {
    this.supported = 'showDirectoryPicker' in window;
    this.projectsDir = null;
  }

  async requestStorageAccess() {
    if (!this.supported) {
      throw new Error('File System Access API not supported. Please use a modern browser.');
    }

    try {
      this.projectsDir = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      
      // Store the directory handle for future use
      localStorage.setItem('aitraineasy_storage_granted', 'true');
      return true;
    } catch (error) {
      console.error('Storage access denied:', error);
      return false;
    }
  }

  async saveFile(projectId, fileName, data) {
    if (!this.projectsDir) {
      throw new Error('No storage access. Please grant file access first.');
    }

    try {
      // Create project directory if it doesn't exist
      const projectDir = await this.getOrCreateDir(this.projectsDir, projectId);
      
      // Create file
      const fileHandle = await projectDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      
      await writable.write(data);
      await writable.close();
      
      return { success: true, path: `${projectId}/${fileName}` };
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  }

  async loadFile(projectId, fileName) {
    if (!this.projectsDir) {
      throw new Error('No storage access');
    }

    try {
      const projectDir = await this.projectsDir.getDirectoryHandle(projectId);
      const fileHandle = await projectDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      
      return file;
    } catch (error) {
      console.error('Failed to load file:', error);
      throw error;
    }
  }

  async getOrCreateDir(parentDir, dirName) {
    try {
      return await parentDir.getDirectoryHandle(dirName);
    } catch {
      return await parentDir.getDirectoryHandle(dirName, { create: true });
    }
  }

  // Fallback: Use browser's download/upload for file operations
  async saveFileAsFallback(fileName, data) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Local ML Training (using TensorFlow.js)
class LocalMLTrainer {
  constructor() {
    this.tf = null;
    this.models = new Map();
  }

  async init() {
    // Dynamically import TensorFlow.js to avoid bundle bloat
    try {
      this.tf = await import('@tensorflow/tfjs');
      console.log('🧠 TensorFlow.js loaded for local ML training');
      return true;
    } catch (error) {
      console.error('Failed to load TensorFlow.js:', error);
      return false;
    }
  }

  async trainModel(config, data, onProgress) {
    if (!this.tf) {
      throw new Error('TensorFlow.js not loaded');
    }

    const { features, labels, modelType } = config;
    
    try {
      // Create model based on type
      let model;
      if (modelType === 'classification') {
        model = this.createClassificationModel(features.length, labels.length);
      } else if (modelType === 'regression') {
        model = this.createRegressionModel(features.length);
      } else {
        throw new Error(`Unsupported model type: ${modelType}`);
      }

      // Prepare data
      const xs = this.tf.tensor2d(data.features);
      const ys = this.tf.tensor2d(data.labels);

      // Train model with progress callbacks
      const history = await model.fit(xs, ys, {
        epochs: config.epochs || 100,
        batchSize: config.batchSize || 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progress = ((epoch + 1) / (config.epochs || 100)) * 100;
            onProgress({
              epoch: epoch + 1,
              progress: Math.round(progress),
              loss: logs.loss,
              accuracy: logs.acc || logs.val_acc
            });
          }
        }
      });

      // Save model locally
      const modelId = this.generateModelId();
      this.models.set(modelId, model);

      return {
        id: modelId,
        model,
        history: history.history,
        metrics: this.calculateMetrics(model, xs, ys)
      };

    } catch (error) {
      console.error('Training failed:', error);
      throw error;
    }
  }

  createClassificationModel(inputSize, outputSize) {
    const model = this.tf.sequential({
      layers: [
        this.tf.layers.dense({ inputShape: [inputSize], units: 128, activation: 'relu' }),
        this.tf.layers.dropout({ rate: 0.2 }),
        this.tf.layers.dense({ units: 64, activation: 'relu' }),
        this.tf.layers.dropout({ rate: 0.2 }),
        this.tf.layers.dense({ units: outputSize, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  createRegressionModel(inputSize) {
    const model = this.tf.sequential({
      layers: [
        this.tf.layers.dense({ inputShape: [inputSize], units: 64, activation: 'relu' }),
        this.tf.layers.dense({ units: 32, activation: 'relu' }),
        this.tf.layers.dense({ units: 1 })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  async predict(modelId, inputData) {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    const prediction = model.predict(this.tf.tensor2d([inputData]));
    return prediction.dataSync();
  }

  calculateMetrics(model, xs, ys) {
    // Calculate basic metrics
    const predictions = model.predict(xs);
    const accuracy = this.tf.metrics.categoricalAccuracy(ys, predictions);
    
    return {
      accuracy: accuracy.dataSync()[0],
      // Add more metrics as needed
    };
  }

  generateModelId() {
    return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Main Local Storage Manager
class LocalStorageManager {
  constructor() {
    this.db = new LocalDatabase();
    this.fs = new LocalFileSystem();
    this.ml = new LocalMLTrainer();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      await this.db.init();
      await this.ml.init();
      this.initialized = true;
      console.log('🔒 Local storage initialized - Everything stays on your device!');
    } catch (error) {
      console.error('Failed to initialize local storage:', error);
      throw error;
    }
  }

  // Project operations
  async createProject(projectData) {
    const project = {
      ...projectData,
      id: this.db.generateId(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'created'
    };

    await this.db.add('projects', project);
    return project;
  }

  async getProjects() {
    return await this.db.getAll('projects');
  }

  async updateProject(id, updates) {
    const project = await this.db.get('projects', id);
    if (!project) throw new Error('Project not found');

    const updatedProject = {
      ...project,
      ...updates,
      updated: new Date().toISOString()
    };

    await this.db.update('projects', updatedProject);
    return updatedProject;
  }

  // File operations
  async saveDataset(projectId, file, analysisData) {
    const fileData = {
      id: this.db.generateId(),
      projectId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded: new Date().toISOString(),
      analysis: analysisData
    };

    // Save file content to local storage or File System API
    try {
      if (this.fs.supported && this.fs.projectsDir) {
        await this.fs.saveFile(projectId, file.name, file);
        fileData.location = 'filesystem';
      } else {
        // Fallback: Store in IndexedDB (for smaller files) or offer download
        if (file.size < 50 * 1024 * 1024) { // 50MB limit for IndexedDB
          const arrayBuffer = await file.arrayBuffer();
          fileData.content = arrayBuffer;
          fileData.location = 'indexeddb';
        } else {
          fileData.location = 'download';
          await this.fs.saveFileAsFallback(`${projectId}_${file.name}`, file);
        }
      }
    } catch (error) {
      console.error('File save error:', error);
      fileData.location = 'error';
      fileData.error = error.message;
    }

    await this.db.add('files', fileData);
    return fileData;
  }

  async getProjectFiles(projectId) {
    return await this.db.getByIndex('files', 'projectId', projectId);
  }

  // Training operations
  async startTraining(projectId, config, onProgress) {
    const trainingSession = {
      id: this.db.generateId(),
      projectId,
      status: 'training',
      config,
      started: new Date().toISOString(),
      progress: 0
    };

    await this.db.add('training', trainingSession);

    try {
      // Get project data
      const files = await this.getProjectFiles(projectId);
      const dataset = await this.loadDataset(files[0]); // Assume first file for now

      // Start local training
      const result = await this.ml.trainModel(config, dataset, async (progress) => {
        trainingSession.progress = progress.progress;
        trainingSession.currentLoss = progress.loss;
        trainingSession.currentAccuracy = progress.accuracy;
        await this.db.update('training', trainingSession);
        onProgress(progress);
      });

      // Save completed training
      trainingSession.status = 'completed';
      trainingSession.completed = new Date().toISOString();
      trainingSession.modelId = result.id;
      trainingSession.metrics = result.metrics;
      await this.db.update('training', trainingSession);

      // Save model
      await this.db.add('models', {
        id: result.id,
        projectId,
        name: config.name || 'Trained Model',
        type: config.modelType,
        created: new Date().toISOString(),
        metrics: result.metrics,
        config
      });

      return trainingSession;
    } catch (error) {
      trainingSession.status = 'failed';
      trainingSession.error = error.message;
      await this.db.update('training', trainingSession);
      throw error;
    }
  }

  async loadDataset(fileData) {
    // Load dataset from local storage based on location
    if (fileData.location === 'indexeddb') {
      return this.parseDataset(fileData.content, fileData.type);
    } else if (fileData.location === 'filesystem') {
      const file = await this.fs.loadFile(fileData.projectId, fileData.name);
      return this.parseDataset(await file.arrayBuffer(), file.type);
    } else {
      throw new Error('Dataset not available locally');
    }
  }

  parseDataset(data, type) {
    // Parse CSV or other formats
    if (type === 'text/csv') {
      const text = new TextDecoder().decode(data);
      return this.parseCSV(text);
    }
    throw new Error(`Unsupported file type: ${type}`);
  }

  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => line.split(','));
    
    return {
      headers,
      rows,
      features: rows.map(row => row.slice(0, -1).map(Number)),
      labels: rows.map(row => [Number(row[row.length - 1])])
    };
  }

  // Settings
  async saveSetting(key, value) {
    await this.db.update('settings', { key, value });
  }

  async getSetting(key) {
    const setting = await this.db.get('settings', key);
    return setting?.value;
  }
}

// Export singleton instance
export const localDB = new LocalStorageManager();
export default localDB;