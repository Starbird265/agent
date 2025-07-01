import { createClient } from '@supabase/supabase-js'

// Supabase credentials - CONFIGURED AND READY! 🚀
const supabaseUrl = 'https://haiqtrxaxxvdwfccywrz.supabase.co'
const supabaseAnonKey = 'STZRboEaXm1ayZiZuI556qUI77+0yxzchcV6FdfpAYwAySv07swRmVi2BKD173sJnDUBsVOYC5pUr0hSaqztCA=='

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Authentication helpers
export const auth = {
  // Sign up with email and password
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Listen to auth changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers
export const db = {
  // Projects
  projects: {
    // Get all projects for current user
    getAll: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      return { data, error }
    },

    // Create new project
    create: async (projectData) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
      return { data, error }
    },

    // Get project by ID
    getById: async (id) => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      return { data, error }
    },

    // Update project
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
      return { data, error }
    },

    // Delete project
    delete: async (id) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
      return { error }
    }
  },

  // Project Files
  files: {
    // Get files for a project
    getByProject: async (projectId) => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })
      return { data, error }
    },

    // Upload file metadata (after file is uploaded to storage)
    create: async (fileData) => {
      const { data, error } = await supabase
        .from('project_files')
        .insert([fileData])
        .select()
      return { data, error }
    },

    // Delete file
    delete: async (id) => {
      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('id', id)
      return { error }
    }
  },

  // Trained Models
  models: {
    // Get models for a project
    getByProject: async (projectId) => {
      const { data, error } = await supabase
        .from('trained_models')
        .select('*')
        .eq('project_id', projectId)
        .order('trained_at', { ascending: false })
      return { data, error }
    },

    // Create new model
    create: async (modelData) => {
      const { data, error } = await supabase
        .from('trained_models')
        .insert([modelData])
        .select()
      return { data, error }
    },

    // Update model
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('trained_models')
        .update(updates)
        .eq('id', id)
        .select()
      return { data, error }
    }
  },

  // Training Sessions
  training: {
    // Get training sessions for a project
    getByProject: async (projectId) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false })
      return { data, error }
    },

    // Create training session
    create: async (sessionData) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .insert([sessionData])
        .select()
      return { data, error }
    },

    // Update training session
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .update(updates)
        .eq('id', id)
        .select()
      return { data, error }
    }
  },

  // HuggingFace Models
  huggingfaceModels: {
    // Get all available models
    getAll: async () => {
      const { data, error } = await supabase
        .from('huggingface_models')
        .select('*')
        .order('downloads', { ascending: false })
      return { data, error }
    },

    // Get models by task
    getByTask: async (task) => {
      const { data, error } = await supabase
        .from('huggingface_models')
        .select('*')
        .eq('task', task)
        .order('downloads', { ascending: false })
      return { data, error }
    }
  }
}

// File Storage helpers
export const storage = {
  // Upload file to Supabase Storage
  uploadFile: async (bucket, filePath, file) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)
    return { data, error }
  },

  // Download file from Supabase Storage
  downloadFile: async (bucket, filePath) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath)
    return { data, error }
  },

  // Get public URL for file
  getPublicUrl: (bucket, filePath) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    return data
  },

  // Delete file
  deleteFile: async (bucket, filePath) => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    return { error }
  }
}

// Real-time subscriptions
export const realtime = {
  // Subscribe to training sessions updates
  subscribeToTraining: (projectId, callback) => {
    return supabase
      .channel('training-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'training_sessions',
        filter: `project_id=eq.${projectId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to project updates
  subscribeToProject: (projectId, callback) => {
    return supabase
      .channel('project-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`
      }, callback)
      .subscribe()
  }
}

export default supabase