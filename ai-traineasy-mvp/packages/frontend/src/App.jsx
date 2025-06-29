import { useEffect, useState } from 'react';
import { pingServer, createProject, fetchProjects, saveSchema, fetchSystemInfo } from './api';
import DatasetBuilder from './components/DatasetBuilder';
import LabelingTool from './components/LabelingTool';
import TrainingWizard from './components/TrainingWizard';
import PredictionUI from './components/PredictionUI';
import TrainingFeedback from './components/TrainingFeedback';
import HuggingFaceModelDownloader from './components/HuggingFaceModelDownloader';

export default function App() {
  const [status, setStatus] = useState('Connecting...');
  const [projectName, setProjectName] = useState('');
  const [project, setProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [dataset, setDataset] = useState([]);
  const [sysInfo, setSysInfo] = useState(null);

  useEffect(() => {
    pingServer().then(setStatus);
    loadProjects();
    fetchSystemInfo().then(setSysInfo);
  }, []);

  const loadProjects = async () => {
    const list = await fetchProjects();
    setAllProjects(list);
  };

  const handleCreateProject = async () => {
    if (!projectName) return alert('Enter a project name');
    const result = await createProject(projectName);
    if (result?.success) {
      setProject(result.project);
      setProjectName('');
      loadProjects(); // refresh list
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100">
      {/* Branded Header */}
      <header className="w-full py-6 bg-white/80 shadow-lg mb-8 rounded-b-3xl flex flex-col items-center">
        <h1 className="text-3xl font-bold tracking-tight text-blue-700 flex items-center gap-2">
          <svg width="32" height="32" fill="none" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#6366f1"/><path d="M10 22l6-12 6 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          AI TrainEasy <span className="text-base font-semibold text-blue-400 ml-2">MVP</span>
        </h1>
        <p className="text-sm mt-2 text-gray-600">Backend status: <span className="font-mono text-blue-700">{status}</span></p>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-12">
        {/* System Info Panel */}
        {sysInfo && (
          <div className="card flex items-center gap-4 text-sm mb-6">
            <span className="inline-flex items-center gap-1"><strong>CPU:</strong> {sysInfo.cpu_count} cores <span className="text-xs text-gray-400">({sysInfo.cpu_percent}% used)</span></span>
            <span className="inline-flex items-center gap-1"><strong>RAM:</strong> {sysInfo.total_ram_gb} GB <span className="text-xs text-gray-400">({sysInfo.ram_percent}% used)</span></span>
            <span className="inline-flex items-center gap-1"><strong>GPU:</strong> {sysInfo.gpu_available ? `${sysInfo.gpu_count}× ${sysInfo.gpu_names.join(', ')}` : 'None'}</span>
          </div>
        )}

        {/* New Project Form */}
        <div className="card flex flex-col md:flex-row items-center gap-2 mb-8">
          <input
            type="text"
            className="border border-blue-200 px-3 py-2 flex-grow text-lg focus:ring-2 focus:ring-blue-200"
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <button
            onClick={handleCreateProject}
            className="ml-0 md:ml-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-lg shadow hover:from-blue-700 hover:to-indigo-600"
          >
            + New Project
          </button>
        </div>

        {/* Created Project */}
        {project && (
          <>
            <div className="card bg-blue-50 border border-blue-100">
              <h2 className="text-xl font-semibold mb-2 text-blue-700">Project Details</h2>
              <pre className="bg-blue-100/60 p-2 rounded text-sm text-blue-900">{JSON.stringify(project, null, 2)}</pre>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 text-blue-700">Upload Dataset</h2>
              <DatasetBuilder project={project} onDataLoaded={setDataset} />
              {/* Hugging Face Model Downloader */}
              <HuggingFaceModelDownloader projectId={project.id} />
              {dataset.length > 0 && (
                <LabelingTool data={dataset} onSchemaSave={(schema) => {
                  saveSchema(project.id, schema).then(response => {
                    if (response?.success) {
                      console.log('Schema saved successfully');
                    } else {
                      alert('Failed to save schema');
                    }
                  });
                }} />
              )}
              {/* Training, Prediction, Feedback */}
              {project && dataset.length > 0 && schema && (
                <>
                  <TrainingWizard projectId={project.id} schema={schema} />
                  <PredictionUI projectId={project.id} schema={schema} />
                  <TrainingFeedback projectId={project.id} />
                </>
              )}
            </div>
          </>
        )}

        {/* All Projects List */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-2 text-blue-700">All Projects</h2>
          {allProjects.length === 0 ? (
            <p className="text-gray-400">No projects yet.</p>
          ) : (
            <ul className="list-disc list-inside mt-2">
              {allProjects.map((p) => (
                <li key={p.id} className="mb-1">
                  <span className="font-medium text-blue-900">{p.name}</span>
                  <span className="text-gray-500 text-sm"> (created: {new Date(p.created_at).toLocaleString()})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-gray-400 text-xs mt-8">
        &copy; {new Date().getFullYear()} AI TrainEasy MVP &mdash; Crafted with <span className="text-pink-400">♥</span>
      </footer>
    </div>
  );
}