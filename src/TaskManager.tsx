import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Task, TaskStatus, Priority } from './types';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Tag, 
  Calendar,
  Search,
  Inbox,
  AlertCircle
} from 'lucide-react';

interface TaskManagerProps {
  userId: string;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ userId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | TaskStatus>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for creating task
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newCategory, setNewCategory] = useState('General');
  const [newDueDate, setNewDueDate] = useState('');

  // Real-time Firestore sync for user's tasks
  useEffect(() => {
    const activeUid = auth.currentUser?.uid || userId;
    if (!activeUid || !auth.currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSyncError(null);

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTasks: Task[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Task[];
        
        // Sort in memory by createdAt descending
        fetchedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTasks(fetchedTasks);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tasks from Firestore:', error);
        setSyncError('Unable to sync tasks. Check permissions.');
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'tasks');
        } catch {
          // Logged to console
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const taskData = {
        title: newTitle.trim(),
        description: newDescription.trim() || '',
        status: 'todo' as TaskStatus,
        priority: newPriority,
        category: newCategory.trim() || 'General',
        dueDate: newDueDate || '',
        userId: userId,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'tasks'), taskData);

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setNewCategory('General');
      setNewDueDate('');
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create task:', err);
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const matchTitle = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDesc = (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = t.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Work Items & Tasks
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Real-time synchronization across your TEZOCRON workspace
          </p>
        </div>
        <button
          type="button"
          id="btn-open-new-task"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? 'Close Form' : 'New Task'}
        </button>
      </div>

      {syncError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {/* Create Task Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateTask}
          className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Create Real Task
          </h3>
          <div>
            <input
              type="text"
              id="input-task-title"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title or milestone name"
              className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <textarea
              id="input-task-description"
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description or requirements (optional)"
              className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Priority
              </label>
              <select
                id="select-task-priority"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Category
              </label>
              <input
                type="text"
                id="input-task-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Operations, Dev, Marketing"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                id="input-task-duedate"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              id="btn-cancel-task"
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-task"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
            >
              Save to Firestore
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800/80 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            id="input-search-tasks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1 text-xs">
            <button
              type="button"
              id="btn-filter-status-all"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              id="btn-filter-status-todo"
              onClick={() => setFilterStatus('todo')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                filterStatus === 'todo'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Pending ({tasks.filter(t => t.status !== 'completed').length})
            </button>
            <button
              type="button"
              id="btn-filter-status-completed"
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                filterStatus === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Done ({tasks.filter(t => t.status === 'completed').length})
            </button>
          </div>

          <select
            id="select-filter-priority"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 dark:text-zinc-400 text-sm">
          Loading synchronized items from Firestore...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Inbox className="w-10 h-10 mx-auto text-zinc-400 mb-2" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {tasks.length === 0 ? 'No tasks created yet' : 'No items match your filter'}
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {tasks.length === 0
              ? 'Click "New Task" above to add your first real task stored in Firebase Firestore.'
              : 'Try clearing your search query or switching your status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              id={`task-item-${task.id}`}
              className={`group p-4 rounded-xl border transition flex items-start justify-between gap-3 ${
                task.status === 'completed'
                  ? 'bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-75'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  id={`btn-toggle-task-${task.id}`}
                  onClick={() => handleToggleStatus(task)}
                  className="mt-0.5 text-zinc-400 hover:text-blue-600 transition shrink-0 cursor-pointer"
                  aria-label="Toggle task status"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                  ) : (
                    <Circle className="w-5 h-5 hover:text-blue-500" />
                  )}
                </button>
                <div className="min-w-0">
                  <h4
                    className={`text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 ${
                      task.status === 'completed' ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                    }`}
                  >
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {getPriorityBadge(task.priority)}
                    {task.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                        <Tag className="w-3 h-3" />
                        {task.category}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                        <Calendar className="w-3 h-3" />
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  id={`btn-delete-task-${task.id}`}
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
