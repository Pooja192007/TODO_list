import { supabase } from '../lib/supabase';
import type { Todo } from '../types/todo';

function getClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }
  return supabase;
}

export async function fetchTodos(): Promise<Todo[]> {
  const client = getClient();
  const { data, error } = await client
    .from('todos')
    .select('id, task, completed, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createTodo(task: string): Promise<Todo> {
  const client = getClient();
  const { data, error } = await client
    .from('todos')
    .insert([{ task, completed: false }])
    .select('id, task, completed, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateTodoTask(id: number, task: string): Promise<Todo> {
  const client = getClient();
  const { data, error } = await client
    .from('todos')
    .update({ task })
    .eq('id', id)
    .select('id, task, completed, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function toggleTodoCompleted(
  id: number,
  completed: boolean
): Promise<Todo> {
  const client = getClient();
  const { data, error } = await client
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .select('id, task, completed, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteTodo(id: number): Promise<void> {
  const client = getClient();
  const { error } = await client.from('todos').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
