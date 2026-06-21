/**
 * TaskManager — Core data model with CRUD operations and localStorage persistence.
 *
 * API:
 *   addTask(title, priority, dueDate)  → task object
 *   toggleTask(id)                     → updated task | null
 *   deleteTask(id)                     → boolean
 *   getTasks(filter)                   → [ task, ... ]
 *   searchTasks(query, filter)         → [ task, ... ]
 *   getCounts()                        → { total, pending, completed }
 */

class TaskManager {
  /** @type {string} localStorage key */
  static STORAGE_KEY = 'smart-task-manager-tasks';

  /** Priority sort weight (lower = higher priority) */
  static PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 };

  constructor() {
    /** @type {Array<{id: string, title: string, completed: boolean, priority: string, dueDate: string|null, createdAt: number}>} */
    this.tasks = [];
    this._load();
  }

  /* ---- Public API ---- */

  /**
   * Add a new task.
   * @param {string} title — raw user input
   * @param {string} priority — 'high' | 'medium' | 'low'
   * @param {string|null} dueDate — ISO date string (YYYY-MM-DD) or null
   * @returns {Object|null} the created task, or null if input is invalid
   */
  addTask(title, priority = 'medium', dueDate = null) {
    const trimmed = (title || '').trim();
    if (!trimmed) return null;

    const validPriorities = ['high', 'medium', 'low'];
    const safePriority = validPriorities.includes(priority) ? priority : 'medium';

    const task = {
      id: this._generateId(),
      title: trimmed,
      completed: false,
      priority: safePriority,
      dueDate: dueDate || null,
      createdAt: Date.now(),
    };

    this.tasks.unshift(task); // newest first
    this._save();
    return task;
  }

  /**
   * Toggle a task's completed status.
   * @param {string} id
   * @returns {Object|null} the updated task, or null if not found
   */
  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;

    task.completed = !task.completed;
    this._save();
    return task;
  }

  /**
   * Delete a task by id.
   * @param {string} id
   * @returns {boolean} true if deleted, false if not found
   */
  deleteTask(id) {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;

    this.tasks.splice(index, 1);
    this._save();
    return true;
  }

  /**
   * Get tasks filtered by status, sorted by priority (high first).
   * @param {'all'|'pending'|'completed'} filter
   * @returns {Array<Object>}
   */
  getTasks(filter = 'all') {
    let result;
    switch (filter) {
      case 'pending':
        result = this.tasks.filter((t) => !t.completed);
        break;
      case 'completed':
        result = this.tasks.filter((t) => t.completed);
        break;
      default:
        result = [...this.tasks];
    }
    return this._sortByPriority(result);
  }

  /**
   * Search tasks by title substring, with optional status filter.
   * @param {string} query — search string
   * @param {'all'|'pending'|'completed'} filter
   * @returns {Array<Object>}
   */
  searchTasks(query, filter = 'all') {
    const q = (query || '').trim().toLowerCase();
    if (!q) return this.getTasks(filter);

    let pool = this.getTasks(filter);
    return pool.filter((t) => t.title.toLowerCase().includes(q));
  }

  /**
   * Get counts for all task categories.
   * @returns {{ total: number, pending: number, completed: number }}
   */
  getCounts() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    return {
      total,
      pending: total - completed,
      completed,
    };
  }

  /* ---- Private ---- */

  /**
   * Sort tasks array by priority (high → medium → low).
   * Tasks with the same priority keep their original creation order.
   * @param {Array<Object>} tasks
   * @returns {Array<Object>}
   */
  _sortByPriority(tasks) {
    return tasks.sort((a, b) => {
      const wa = TaskManager.PRIORITY_WEIGHT[a.priority] ?? 1;
      const wb = TaskManager.PRIORITY_WEIGHT[b.priority] ?? 1;
      return wa - wb;
    });
  }

  /**
   * Generate a unique id for a task.
   * Uses crypto.randomUUID if available, falls back to timestamp + random.
   * @returns {string}
   */
  _generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  /** Persist current tasks array to localStorage. */
  _save() {
    try {
      localStorage.setItem(TaskManager.STORAGE_KEY, JSON.stringify(this.tasks));
    } catch (e) {
      console.warn('TaskManager: Could not save to localStorage', e);
    }
  }

  /** Load tasks array from localStorage. */
  _load() {
    try {
      const raw = localStorage.getItem(TaskManager.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Migrate legacy tasks that lack priority/dueDate fields
          this.tasks = parsed.map((t) => ({
            priority: 'medium',
            dueDate: null,
            ...t,
          }));
        }
      }
    } catch (e) {
      console.warn('TaskManager: Could not load from localStorage', e);
      this.tasks = [];
    }
  }
}
