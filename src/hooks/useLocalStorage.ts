import { useState, useEffect, useRef, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const valueRef = useRef(storedValue);
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        const value = JSON.parse(item) as T;
        valueRef.current = value;
        setStoredValue(value);
      }
    } catch (error) { console.warn(`Could not read local preference ${key}`, error); }
  }, [key]);

  const setValue = useCallback((value: T | ((previous: T) => T)) => {
    // Update synchronously so successive functional updates use the latest value,
    // including when React batches several imported projects into one render.
    const next = value instanceof Function ? value(valueRef.current) : value;
    valueRef.current = next;
    setStoredValue(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); }
    catch (error) { console.warn(`Could not save local preference ${key}`, error); }
  }, [key]);
  return [storedValue, setValue];
}
export default useLocalStorage;
