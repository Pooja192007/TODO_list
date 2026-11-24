import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  ListTodo,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  toggleTodoCompleted,
  updateTodoTask,
} from './services/todoService';
import type { Todo } from './types/todo';

type TaskFilter = 'all' | 'pending' | 'completed';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadTodos() {
      try {
        setErrorMessage(null);
        const data = await fetchTodos();
        if (isMounted) {
          setTodos(data);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Failed to load tasks.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTodos();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newTask.trim();
    if (!trimmed || submitting) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const created = await createTodo(trimmed);
      setTodos((prev) => [created, ...prev]);
      setNewTask('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to add task.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleComplete(todo: Todo) {
    if (busyId !== null) return;

    try {
      setBusyId(todo.id);
      setErrorMessage(null);
      const updated = await toggleTodoCompleted(todo.id, !todo.completed);
      setTodos((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update task status.'
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleStartEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditingText(todo.task);
    setErrorMessage(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditingText('');
  }

  async function handleSaveEdit(id: number) {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setErrorMessage('Task text cannot be empty.');
      return;
    }
    if (busyId !== null) return;

    try {
      setBusyId(id);
      setErrorMessage(null);
      const updated = await updateTodoTask(id, trimmed);
      setTodos((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setEditingId(null);
      setEditingText('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update task.'
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    id: number
  ) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveEdit(id);
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  }

  async function handleDelete(id: number) {
    if (busyId !== null) return;

    try {
      setBusyId(id);
      setErrorMessage(null);
      await deleteTodo(id);
      setTodos((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditingText('');
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to delete task.'
      );
    } finally {
      setBusyId(null);
    }
  }

  const totalTasks = todos.length;
  const completedTasks = todos.filter((todo) => todo.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercentage =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'pending') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  function getEmptyMessage() {
    if (!isSupabaseConfigured) {
      return 'Connect Supabase to view and manage your tasks.';
    }
    if (totalTasks === 0) {
      return 'No tasks yet. Add your first task above.';
    }
    if (filter === 'pending') {
      return 'No pending tasks.';
    }
    if (filter === 'completed') {
      return 'No completed tasks yet.';
    }
    return 'No tasks found.';
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Todo Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Stay organized and get things done.
          </p>
        </header>

        {!isSupabaseConfigured && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            Supabase credentials are missing. Configure{' '}
            <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>{' '}
            in your environment variables to connect to your database.
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="shrink-0 whitespace-nowrap text-xs font-medium text-red-700 underline hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        )}

        <section
          aria-label="Task summary"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tasks</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {totalTasks}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ListTodo className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Pending Tasks
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {pendingTasks}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Completed Tasks
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {completedTasks}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section
          aria-label="Progress Overview"
          className="rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Progress Overview
              </h2>
              <p className="text-xs text-slate-500 tabular-nums">
                {completedTasks} of {totalTasks}{' '}
                {totalTasks === 1 ? 'task' : 'tasks'} completed
              </p>
            </div>
            <span className="text-lg font-bold tabular-nums text-slate-900">
              {completionPercentage}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Task completion progress"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className={`h-full rounded-full ${
                completionPercentage === 100 && totalTasks > 0
                  ? 'bg-emerald-600'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </section>

        <section
          aria-label="My Tasks"
          className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">My Tasks</h2>

            <div
              role="group"
              aria-label="Filter tasks"
              className="inline-flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1"
            >
              <button
                type="button"
                onClick={() => setFilter('all')}
                aria-pressed={filter === 'all'}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Tasks
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                aria-pressed={filter === 'pending'}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  filter === 'pending'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                aria-pressed={filter === 'completed'}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  filter === 'completed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          <form
            onSubmit={handleAddTask}
            className="mb-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="Enter a new task..."
              aria-label="New task"
              disabled={!isSupabaseConfigured || submitting}
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 disabled:bg-slate-100 disabled:text-slate-400"
            />
            <button
              type="submit"
              disabled={!isSupabaseConfigured || submitting || !newTask.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{submitting ? 'Adding...' : 'Add Task'}</span>
            </button>
          </form>

          {loading ? (
            <p className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
              Loading tasks...
            </p>
          ) : filteredTodos.length === 0 ? (
            <p className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
              {getEmptyMessage()}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 border-t border-slate-200">
              {filteredTodos.map((todo) => {
                const isEditing = editingId === todo.id;
                const isBusy = busyId === todo.id;

                return (
                  <li
                    key={todo.id}
                    className={`flex flex-col gap-3 px-2 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                      todo.completed ? 'bg-slate-50/70' : 'bg-white'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(event) =>
                            setEditingText(event.target.value)
                          }
                          onKeyDown={(event) =>
                            handleEditKeyDown(event, todo.id)
                          }
                          aria-label="Edit task"
                          autoFocus
                          disabled={isBusy}
                          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(todo.id)}
                          disabled={isBusy || !editingText.trim()}
                          className="shrink-0 whitespace-nowrap rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isBusy}
                          className="shrink-0 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 sm:items-center">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => handleToggleComplete(todo)}
                            disabled={isBusy}
                            aria-label={
                              todo.completed
                                ? `Mark "${todo.task}" as pending`
                                : `Mark "${todo.task}" as completed`
                            }
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-emerald-600 sm:mt-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className={`block break-words text-sm ${
                                todo.completed
                                  ? 'text-slate-400 line-through'
                                  : 'font-medium text-slate-900'
                              }`}
                            >
                              {todo.task}
                            </span>
                            <span
                              className={`text-xs ${
                                todo.completed
                                  ? 'text-emerald-700'
                                  : 'text-orange-700'
                              }`}
                            >
                              {todo.completed ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        </label>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-7 sm:pl-0">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(todo)}
                            disabled={isBusy}
                            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                              todo.completed
                                ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {todo.completed ? (
                              <>
                                <RotateCcw
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Pending</span>
                              </>
                            ) : (
                              <>
                                <Check
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Complete</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(todo)}
                            disabled={isBusy}
                            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(todo.id)}
                            disabled={isBusy}
                            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
