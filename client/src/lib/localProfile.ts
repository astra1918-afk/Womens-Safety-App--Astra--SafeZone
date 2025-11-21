// Local profile management for immediate persistence
import type { UpsertUser, User } from "@shared/schema";

const PROFILE_KEY = 'sakhi_user_profile';

export class LocalProfile {
  static save(profile: UpsertUser): void {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  static load(): User | null {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return null;
    
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  }

  static clear(): void {
    localStorage.removeItem(PROFILE_KEY);
  }

  static exists(): boolean {
    return localStorage.getItem(PROFILE_KEY) !== null;
  }
}