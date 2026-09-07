'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function usePersistentCollection<T extends { id: string }>(
  resource: string,
  fallback: T[],
): [T[], Dispatch<SetStateAction<T[]>>, boolean] {
  const [items, setItems] = useState<T[]>(fallback);
  const [loading, setLoading] = useState(true);
  const hydrated = useRef(false);
  const lastSaved = useRef('');

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/resources/${resource}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || 'Unable to load data');
        return response.json();
      })
      .then(({ items: serverItems }) => {
        if (!active) return;
        const next = Array.isArray(serverItems) ? serverItems : [];
        lastSaved.current = JSON.stringify(next);
        setItems(next);
        hydrated.current = true;
      })
      .catch((error) => toast.error(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [resource]);

  useEffect(() => {
    if (!hydrated.current) return;
    const serialized = JSON.stringify(items);
    if (serialized === lastSaved.current) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/resources/${resource}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Unable to save changes');
        lastSaved.current = serialized;
        const label = resource.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
        toast.success(`${label} changes saved`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to save changes');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [items, resource]);

  return [items, setItems, loading];
}

export function usePersistentSingleton<T extends object>(
  key: string,
  fallback: T,
): [T, Dispatch<SetStateAction<T>>, boolean, () => Promise<void>] {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/settings/${key}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || 'Unable to load settings');
        return response.json();
      })
      .then(({ data: serverData }) => {
        if (active && serverData && typeof serverData === 'object') {
          setData((current) => ({ ...current, ...serverData }));
        }
      })
      .catch((error) => toast.error(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [key]);

  const save = async () => {
    const response = await fetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Unable to save settings');
  };

  return [data, setData, loading, save];
}

export function useCurrentUser() {
  const [user, setUser] = useState({ name: 'MBGA Administrator', email: '', role: 'Super Admin', avatar: 'MA' });
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then(({ user: value }) => {
        if (!value) return;
        setUser({ ...value, avatar: value.name.split(/\s+/).map((word: string) => word[0]).join('').slice(0, 2).toUpperCase() });
      });
  }, []);
  return user;
}
