-- AI TrainEasy MVP - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable Row Level Security
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Projects Table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'created',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Project configuration
  model_type VARCHAR(100),
  target_column VARCHAR(255),
  training_progress INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Project Files Table
CREATE TABLE project_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  filename VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000),
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  -- File analysis
  columns_info JSONB,
  row_count INTEGER,
  
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Models Table
CREATE TABLE trained_models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  model_name VARCHAR(255) NOT NULL,
  model_type VARCHAR(100),
  algorithm VARCHAR(100),
  
  -- Model performance
  accuracy FLOAT,
  precision_score FLOAT,
  recall_score FLOAT,
  f1_score FLOAT,
  
  -- Model configuration
  hyperparameters JSONB DEFAULT '{}'::jsonb,
  feature_columns JSONB DEFAULT '[]'::jsonb,
  target_column VARCHAR(255),
  
  -- Model file storage
  model_path VARCHAR(1000),
  model_size BIGINT,
  
  -- Training info
  training_time INTERVAL,
  trained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  status VARCHAR(50) DEFAULT 'training'
);

-- 4. Training Sessions Table
CREATE TABLE training_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  session_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'running',
  
  -- Progress tracking
  current_step VARCHAR(100),
  total_steps INTEGER,
  completed_steps INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  
  -- Training configuration
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Logs and results
  logs TEXT,
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Time tracking
  estimated_completion TIMESTAMP WITH TIME ZONE
);

-- 5. User Preferences Table
CREATE TABLE user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- UI preferences
  theme VARCHAR(20) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  
  -- ML preferences
  default_model_type VARCHAR(100),
  preferred_algorithms JSONB DEFAULT '[]'::jsonb,
  
  -- Usage tracking
  projects_created INTEGER DEFAULT 0,
  models_trained INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_trained_models_project_id ON trained_models(project_id);
CREATE INDEX idx_training_sessions_project_id ON training_sessions(project_id);
CREATE INDEX idx_training_sessions_status ON training_sessions(status);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE trained_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Projects
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Project Files
CREATE POLICY "Users can view their own project files" ON project_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files to their projects" ON project_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project files" ON project_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project files" ON project_files
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Trained Models
CREATE POLICY "Users can view their own models" ON trained_models
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create models for their projects" ON trained_models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models" ON trained_models
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own models" ON trained_models
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Training Sessions
CREATE POLICY "Users can view their own training sessions" ON training_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training sessions" ON training_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training sessions" ON training_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for User Preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamps
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user preferences on signup
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create user preferences when user signs up
CREATE TRIGGER create_user_preferences_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data

-- Sample HuggingFace models reference (for the frontend)
CREATE TABLE huggingface_models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id VARCHAR(255) UNIQUE NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  downloads BIGINT DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  library VARCHAR(100) DEFAULT 'transformers',
  task VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert popular models
INSERT INTO huggingface_models (model_id, model_name, author, downloads, tags, description, task) VALUES
('distilbert-base-uncased', 'DistilBERT Base Uncased', 'HuggingFace', 15000000, '["text-classification", "pytorch", "distilbert"]', 'Fast, lightweight BERT model for classification tasks', 'text-classification'),
('bert-base-uncased', 'BERT Base Uncased', 'HuggingFace', 25000000, '["text-classification", "pytorch", "bert"]', 'Standard BERT model for text classification', 'text-classification'),
('roberta-base', 'RoBERTa Base', 'HuggingFace', 12000000, '["text-classification", "pytorch", "roberta"]', 'RoBERTa: Robustly Optimized BERT Pretraining', 'text-classification'),
('albert-base-v2', 'ALBERT Base v2', 'HuggingFace', 8000000, '["text-classification", "pytorch", "albert"]', 'ALBERT: A Lite BERT for Self-supervised Learning', 'text-classification'),
('t5-small', 'T5 Small', 'HuggingFace', 10000000, '["text2text-generation", "pytorch", "t5"]', 'Small T5 model for text-to-text generation', 'text2text-generation');

-- Make huggingface_models publicly readable
ALTER TABLE huggingface_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view huggingface models" ON huggingface_models
  FOR SELECT USING (true);

COMMENT ON TABLE projects IS 'Main projects table storing ML projects';
COMMENT ON TABLE project_files IS 'Files uploaded to projects';
COMMENT ON TABLE trained_models IS 'Trained ML models and their metadata';
COMMENT ON TABLE training_sessions IS 'Training session progress and logs';
COMMENT ON TABLE user_preferences IS 'User preferences and settings';
COMMENT ON TABLE huggingface_models IS 'Reference table for popular HuggingFace models';