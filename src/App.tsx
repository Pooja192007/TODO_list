import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { isSupabaseConfigured } from './lib/supabase';
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  toggleTodoCompleted,
  updateTodoTask,
} from './services/todoService';
import type { Todo } from './types/todo';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
          Todo List
        </h1>

        {!isSupabaseConfigured && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
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
            className="mb-6 flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="shrink-0 text-xs font-medium text-red-700 underline hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleAddTask} className="mb-6 flex gap-3">
          <input
            type="text"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="Enter a task..."
            aria-label="New task"
            disabled={!isSupabaseConfigured || submitting}
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-100 disabled:text-slate-400"
          />
          <button
            type="submit"
            disabled={!isSupabaseConfigured || submitting || !newTask.trim()}
            className="shrink-0 whitespace-nowrap rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Adding...' : 'Add'}
          </button>
        </form>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Loading tasks...
          </p>
        ) : todos.length === 0 ? (
          <p className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
            {isSupabaseConfigured
              ? 'No tasks yet. Add a task above.'
              : 'Connect Supabase to view and manage your tasks.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 border-t border-slate-200">
            {todos.map((todo) => {
              const isEditing = editingId === todo.id;
              const isBusy = busyId === todo.id;

              return (
                <li
                  key={todo.id}
                  className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        onKeyDown={(event) => handleEditKeyDown(event, todo.id)}
                        aria-label="Edit task"
                        autoFocus
                        disabled={isBusy}
                        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(todo.id)}
                        disabled={isBusy || !editingText.trim()}
                        className="shrink-0 whitespace-nowrap rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
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
                          className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-slate-900"
                        />
                        <span
                          className={`break-words text-sm ${
                            todo.completed
                              ? 'text-slate-400 line-through'
                              : 'text-slate-900'
                          }`}
                        >
                          {todo.task}
                        </span>
                      </label>

                      <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(todo)}
                          disabled={isBusy}
                          className="shrink-0 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {todo.completed ? 'Pending' : 'Complete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(todo)}
                          disabled={isBusy}
                          className="shrink-0 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(todo.id)}
                          disabled={isBusy}
                          className="shrink-0 whitespace-nowrap rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
