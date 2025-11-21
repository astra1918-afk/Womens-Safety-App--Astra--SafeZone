// Simple session management for multi-user support
export class UserSession {
  private static instance: UserSession;
  private userId: string | null = null;

  private constructor() {
    // Load existing session from localStorage
    this.userId = localStorage.getItem('sakhi_user_id');
    
    // If no session exists, use demo-user for consistency
    if (!this.userId) {
      this.userId = 'demo-user';
      localStorage.setItem('sakhi_user_id', this.userId);
    }
  }

  public static getInstance(): UserSession {
    if (!UserSession.instance) {
      UserSession.instance = new UserSession();
    }
    return UserSession.instance;
  }

  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  public getUserId(): string {
    return this.userId || this.generateUserId();
  }

  public setUserId(id: string): void {
    this.userId = id;
    localStorage.setItem('sakhi_user_id', id);
  }

  public clearSession(): void {
    this.userId = null;
    localStorage.removeItem('sakhi_user_id');
  }
}

export const userSession = UserSession.getInstance();