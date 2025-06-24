import { useEffect, useState } from 'react';
import { pingServer, createProject, fetchProjects, saveSchema } from './api';
import DatasetBuilder from './components/DatasetBuilder';
import LabelingTool from './components/LabelingTool';
import TrainingWizard from './components/TrainingWizard';
import PredictionUI from './components/PredictionUI';
import TrainingFeedback from './components/TrainingFeedback';

export default function App() {
  const [status, setStatus] = useState('Connecting...');
  const [projectName, setProjectName] = useState('');
  const [project, setProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [dataset, setDataset] = useState([]);

  useEffect(() => {
    pingServer().then(setStatus);
    loadProjects();
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
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">AI TrainEasy MVP</h1>
      <p className="text-sm mt-2">Backend status: <span className="font-mono">{status}</span></p>

      {/* New Project Form */}
      <div className="mt-6 flex">
        <input
          type="text"
          className="border rounded px-2 py-1 flex-grow"
          placeholder="Project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <button
          onClick={handleCreateProject}
          className="ml-2 px-4 py-2 bg-green-600 text-white rounded"
        >
          New Project
        </button>
      </div>

      {/* Created Project */}
      {project && (
        <>
          <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(project, null, 2)}</pre>
          <div className="mt-6">
            <h2 className="text-lg font-semibold">Upload Dataset</h2>
            <DatasetBuilder project={project} onDataLoaded={setDataset} />
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
            // Inside the component's return JSX where project, dataset, and schema are used
            {project && dataset.length > 0 && schema && (
              <>
                <TrainingWizard projectId={project.id} schema={schema} />
                {/* only show PredictionUI after training is done and model.pkl exists */}
                <PredictionUI projectId={project.id} schema={schema} />
                <TrainingFeedback projectId={project.id} />
              </>
            )}
          </div>
        </>
      )}

      {/* All Projects List */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">All Projects</h2>
        {allProjects.length === 0 ? (
          <p className="text-gray-500">No projects yet.</p>
        ) : (
          <ul className="list-disc list-inside mt-2">
            {allProjects.map((p) => (
              <li key={p.id} className="mb-1">
                <span className="font-medium">{p.name}</span>
                <span className="text-gray-500 text-sm"> (created: {new Date(p.created_at).toLocaleString()})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}