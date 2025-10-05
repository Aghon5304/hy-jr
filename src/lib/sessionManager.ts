'use client';

// Simple user session management for cache initialization
interface UserSession {
  isFirstTime: boolean;
  lastCacheUpdate: string | null;
  sessionId: string;
  createdAt: string;
}

class SessionManager {
  private readonly SESSION_KEY = 'user_session';
  private session: UserSession | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSession();
    }
  }

  /**
   * Initialize or restore user session
   */
  initializeSession(): UserSession {
    if (this.session) {
      return this.session;
    }

    const existingSession = this.loadSession();
    if (existingSession) {
      return existingSession;
    }

    // Create new session for first-time user
    const newSession: UserSession = {
      isFirstTime: true,
      lastCacheUpdate: null,
      sessionId: this.generateSessionId(),
      createdAt: new Date().toISOString()
    };

    this.session = newSession;
    this.saveSession();
    
    console.log('👋 New user session created');
    return newSession;
  }

  /**
   * Mark cache as updated for this session
   */
  markCacheUpdated(): void {
    if (!this.session) {
      this.initializeSession();
    }

    if (this.session) {
      this.session.lastCacheUpdate = new Date().toISOString();
      this.session.isFirstTime = false;
      this.saveSession();
      console.log('✅ Session updated with cache timestamp');
    }
  }

  /**
   * Check if this is a first-time user who needs cache initialization
   */
  isFirstTimeUser(): boolean {
    const session = this.initializeSession();
    return session.isFirstTime || !session.lastCacheUpdate;
  }

  /**
   * Get current session information
   */
  getSession(): UserSession {
    return this.initializeSession();
  }

  /**
   * Clear session (for testing or reset purposes)
   */
  clearSession(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.SESSION_KEY);
      this.session = null;
      console.log('🗑️ User session cleared');
    } catch (error) {
      console.error('❌ Failed to clear session:', error);
    }
  }

  /**
   * Load session from localStorage
   */
  private loadSession(): UserSession | null {
    if (typeof window === 'undefined') return null;

    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (sessionData) {
        this.session = JSON.parse(sessionData);
        console.log('📱 Loaded user session');
        return this.session;
      }
    } catch (error) {
      console.error('❌ Failed to load session:', error);
    }
    
    return null;
  }

  /**
   * Save session to localStorage
   */
  private saveSession(): void {
    if (typeof window === 'undefined' || !this.session) return;

    try {
      const sessionStr = JSON.stringify(this.session);
      localStorage.setItem(this.SESSION_KEY, sessionStr);
    } catch (error) {
      console.error('❌ Failed to save session:', error);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// React hook for session management
export function useSession() {
  return {
    initializeSession: () => sessionManager.initializeSession(),
    markCacheUpdated: () => sessionManager.markCacheUpdated(),
    isFirstTimeUser: () => sessionManager.isFirstTimeUser(),
    getSession: () => sessionManager.getSession(),
    clearSession: () => sessionManager.clearSession()
  };
}