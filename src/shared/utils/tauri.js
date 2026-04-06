import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export const selectFiles = async (extensions = []) => {
  try {
    // Le dialog natif filtre au maximum côté système d’exploitation.
    const filters = extensions.length > 0 
      ? [{ name: 'Fichiers', extensions }] 
      : [];
      
    const selected = await open({
      multiple: true,
      filters: filters
    });
    
    if (Array.isArray(selected)) return selected;
    if (selected) return [selected];
    return [];
  } catch (err) {
    console.error("Erreur Tauri Dialog:", err);
    return [];
  }
};

export const runRustCommand = async (command, args = {}) => {
  // Centralise les invocations backend pour garder un point d’entrée unique.
  return await invoke(command, args);
};
