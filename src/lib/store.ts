import type { WorkedDay } from '../types';
import { writable } from 'svelte/store';

export const daysOBS = writable<WorkedDay[]>([]);
export const editingDay = writable<WorkedDay | null>(null);
