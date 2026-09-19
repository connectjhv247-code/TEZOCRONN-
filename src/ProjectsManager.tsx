import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Project } from './types';
import { Folder, Trash2, Layers, Calendar, Plus, AlertCircle } from 'lucide-react';

interface ProjectsManagerProps {
  userId: string;
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({ userId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Production');

  useEffect(() => {
    const activeUid = auth.currentUser?.uid || userId;
    if (!activeUid || !auth.currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSyncError(null);

    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Project[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Project[];
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProjects(fetched);
        setLoading(false);
      },
      (err) => {
        console.error('Projects sync error:', err);
        setSyncError('Unable to sync projects. Check permissions.');
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'projects');
        } catch {
          // Logged to console
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await addDoc(collection(db, 'projects'), {
        name: name.trim(),
        description: description.trim() || '',
        category: category.trim() || 'General',
        ownerId: userId,
        createdAt: new Date().toISOString()
      });

      setName('');
      setDescription('');
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create project:', err);
      handleFirestoreError(err, OperationType.CREATE, 'projects');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (err) {
      console.error('Failed to delete project:', err);
      handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Active Projects & Modules
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            JMP production workspaces organized under TEZOCRON
          </p>
        </div>
        <button
          type="button"
          id="btn-open-new-project"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? 'Close Form' : 'New Project'}
        </button>
      </div>

      {syncError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Create Real Project Workspace
          </h3>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Project Name
            </label>
            <input
              type="text"
              id="input-project-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Android Core Engine"
              className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Scope / Description
            </label>
            <textarea
              id="input-project-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project goals or scope summary"
              className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Domain / Department
            </label>
            <input
              type="text"
              id="input-project-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Production, Engineering, Design"
              className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              id="btn-cancel-project"
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-project"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
            >
              Create Project
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-16 text-center text-zinc-500 dark:text-zinc-400 text-sm">
          Loading active projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Folder className="w-10 h-10 mx-auto text-zinc-400 mb-2" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No projects registered
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Create a project workspace to track initiatives under JMP (Jaz media parustarta).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              id={`project-card-${proj.id}`}
              className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition relative group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {proj.name}
                    </h3>
                    <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                      {proj.category}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id={`btn-delete-project-${proj.id}`}
                  onClick={() => handleDelete(proj.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  aria-label="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {proj.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3 line-clamp-2">
                  {proj.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(proj.createdAt).toLocaleDateString()}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
