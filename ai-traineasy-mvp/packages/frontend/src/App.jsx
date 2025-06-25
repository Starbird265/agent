import { useEffect, useState } from 'react';
import {
  pingServer,
  createProject,
  fetchProjects,
  saveSchema,
  userSignup,
  loginForToken, // Changed from userLogin
  fetchCurrentUser,
  exportModel
} from './api';
import DatasetBuilder from './components/DatasetBuilder';
import LabelingTool from './components/LabelingTool';
import TrainingWizard from './components/TrainingWizard';
import PredictionUI from './components/PredictionUI';
import TrainingFeedback from './components/TrainingFeedback';
import UpgradeModal from './components/UpgradeModal';

export default function App() {
  const [status, setStatus] = useState('Connecting...');
  const [projectName, setProjectName] = useState('');
  const [project, setProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [dataset, setDataset] = useState([]);
  const [schema, setSchema] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authInviteCode, setAuthInviteCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Attempt to load user on initial app mount from stored token
  useEffect(() => {
    pingServer().then(newStatus => setStatus(newStatus.status || newStatus)); // pingServer might return object or string
    const token = localStorage.getItem('accessToken');
    if (token) {
      // api.js's fetchCurrentUser will use the token from localStorage via getAuthHeaders
      apiFetchCurrentUser();
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Utility function to fetch and set current user, used after login/signup and on mount
  const apiFetchCurrentUser = async () => {
    const user = await fetchCurrentUser();
    if (user && user.id) {
      setCurrentUser(user);
    } else {
      setCurrentUser(null); // Ensure currentUser is null if fetch fails or token is invalid
      localStorage.removeItem('accessToken'); // Clean up invalid token
    }
  };

  // Fetch projects when currentUser state changes (i.e., user logs in)
  useEffect(() => {
    if (currentUser && currentUser.id) { // Ensure currentUser is valid before loading projects
      loadProjects();
    } else {
      setAllProjects([]);
      setProject(null);
    }
  }, [currentUser]);


  const loadProjects = async () => {
    try {
      const list = await fetchProjects(); // This will now send Auth header
      setAllProjects(list || []); // Ensure list is an array
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      // setAuthError might not be appropriate here if user is already logged in.
      // Consider a general app error state or notification system for logged-in users.
      alert(`Could not load projects: ${error.message}`);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail || !authPassword || !authInviteCode) {
      setAuthError("All fields are required for signup."); return;
    }
    try {
      const signupData = await userSignup(authEmail, authPassword, authInviteCode);
      if (signupData && signupData.id) { // Signup returns UserResponse
        // Signup successful, now automatically log them in to get a token
        const tokenData = await loginForToken(authEmail, authPassword);
        if (tokenData && tokenData.access_token) {
          localStorage.setItem('accessToken', tokenData.access_token);
          await apiFetchCurrentUser(); // Fetch full user details with the new token
          setAuthEmail(''); setAuthPassword(''); setAuthInviteCode('');
        } else {
          setAuthError(tokenData.detail || 'Signup succeeded, but auto-login failed. Please try logging in.');
        }
      } else { // Should be caught by handleResponse in api.js and throw
        setAuthError(signupData.detail || signupData.error || 'Signup failed. Please check your details.');
      }
    } catch (error) {
      setAuthError(error.message || 'An error occurred during signup.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError("Email and password are required for login."); return;
    }
    try {
      const tokenData = await loginForToken(authEmail, authPassword); // Calls /auth/token
      if (tokenData && tokenData.access_token) {
        localStorage.setItem('accessToken', tokenData.access_token);
        await apiFetchCurrentUser(); // Fetch user details using the new token
        setAuthEmail(''); setAuthPassword('');
      } else { // Should be caught by handleResponse in api.js
         setAuthError(tokenData.detail || tokenData.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setAuthError(error.message || 'An error occurred during login.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setProject(null);
    setDataset([]);
    setSchema(null);
    localStorage.removeItem('accessToken'); // Remove JWT
    // No need to remove ait_userId as it's not used anymore
  };

  const handleCreateProject = async () => {
    if (!currentUser) { alert("Please log in to create a project."); return; }
    const projectNamePattern = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!projectName) { alert('Enter a project name.'); return; }
    if (!projectNamePattern.test(projectName)) {
      alert('Project name must be 3-30 characters long and can only contain letters, numbers, underscores, and hyphens.'); return;
    }
    try {
      const newProjectData = await createProject(projectName); // createProject now uses JWT
      if (newProjectData && newProjectData.id) {
        setProject(newProjectData);
        setProjectName(''); setDataset([]); setSchema(null);
        loadProjects();
      } else { alert(newProjectData.detail || "Failed to create project."); }
    } catch (error) { alert(error.message || "Error creating project."); }
  };

  const handleExportModel = async () => {
    if (!project || !project.id || !currentUser || !currentUser.id) {
      alert("Project or user information is missing for export."); return;
    }
    try {
      await exportModel(project.id); // API function handles download
      // Refresh user info to get updated credits
      const updatedUserData = await fetchCurrentUser(); // No need to pass ID, token is used
      if (updatedUserData && updatedUserData.id) {
        setCurrentUser(updatedUserData);
      }
    } catch (e) {
      console.error("Export error:", e.message);
      if (e.message.toLowerCase().includes('limit') || e.message.toLowerCase().includes('payment required')) {
        setShowUpgradeModal(true);
      } else {
        alert(`Export failed: ${e.message}`);
      }
    }
  };


  if (!currentUser) {
    // Auth View (Login/Signup)
    return (
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">AI TrainEasy MVP</h1>
        <p className="text-sm text-center mb-4">Backend status: <span className="font-mono">{status}</span></p>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4 text-center">{isLoginView ? 'Login' : 'Sign Up'}</h2>
          {authError && <p className="text-red-500 text-xs italic mb-3">{authError}</p>}
          <form onSubmit={isLoginView ? handleLogin : handleSignup}>
            {/* Email and Password inputs remain the same */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
              <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" id="email" type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
              <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" id="password" type="password" placeholder="******************" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
            </div>
            {!isLoginView && (
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="inviteCode">Invite Code</label>
                <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" id="inviteCode" type="text" placeholder="Invite Code" value={authInviteCode} onChange={(e) => setAuthInviteCode(e.target.value)} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" type="submit">
                {isLoginView ? 'Sign In' : 'Sign Up'}
              </button>
              <a className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800 cursor-pointer" onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }}>
                {isLoginView ? 'Need an account?' : 'Have an account?'}
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Main Application View (Logged In)
  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI TrainEasy MVP</h1>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm">
          Logout
        </button>
      </div>
      <p className="text-sm mt-2">Backend status: <span className="font-mono">{status}</span></p>
      {currentUser && (
        <div className="mt-4 p-3 bg-indigo-100 rounded border border-indigo-300 text-sm">
          <p>Welcome, <strong className="font-semibold">{currentUser.email}</strong>!</p>
          <p>Plan: <strong className="font-semibold capitalize">{currentUser.subscription_type.replace(/_/g, ' ')}</strong></p>
          <p>Export Credits: <strong className="font-semibold">{currentUser.subscription_type === 'unlimited_pro_annual' ? 'Unlimited' : currentUser.export_credits}</strong></p>
          <p>Beta Credit Available: <strong className="font-semibold">{currentUser.beta_credit_available ? 'Yes ($10 Off First Plan)' : 'No'}</strong></p>
          {currentUser.subscription_type !== 'unlimited_pro_annual' && (
            <button onClick={() => setShowUpgradeModal(true)} className="mt-2 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs">
              Upgrade Plan
            </button>
          )}
        </div>
      )}

      <div className="mt-6 flex">
        <input type="text" className="border rounded px-2 py-1 flex-grow" placeholder="New Project Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        <button onClick={handleCreateProject} className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Create Project
        </button>
      </div>

      {project && project.id && (
        <>
          <h2 className="text-xl font-semibold mt-6 mb-2">Current Project: {project.name}</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs">{JSON.stringify(project, null, 2)}</pre>
          <div className="mt-4">
            <h2 className="text-lg font-semibold">Upload Dataset</h2>
            <DatasetBuilder project={project} onDataLoaded={setDataset} />
            {dataset.length > 0 && (
              <LabelingTool data={dataset} onSchemaSave={(currentSchema) => {
                saveSchema(project.id, currentSchema).then(response => {
                  if (response?.success) { console.log('Schema saved'); setSchema(currentSchema); }
                  else { alert('Failed to save schema'); setSchema(null); }
                }).catch(err => { alert(`Schema save error: ${err.message}`); setSchema(null);});
              }} />
            )}
            {project && dataset.length > 0 && schema && (
              <>
                <TrainingWizard projectId={project.id} schema={schema} />
                <PredictionUI projectId={project.id} schema={schema} />
                <TrainingFeedback projectId={project.id} />
                <div className="mt-6">
                  <button
                    onClick={handleExportModel} // Use the new handler
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Export Trained Model
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold">All Projects</h2>
        {allProjects.length === 0 ? (<p className="text-gray-500">No projects yet.</p>) : (
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

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        user={currentUser}
        onUserUpdate={(updatedUser) => { setCurrentUser(updatedUser); }}
      />
    </div>
  );
}