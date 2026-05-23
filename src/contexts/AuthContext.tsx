import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { fetchMemberProfile } from '../lib/memberProfile';
import { isAdminProfile, type MemberProfile } from '../lib/admin';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  memberProfile: MemberProfile | null;
  profileLoading: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshMemberProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Supabase: never await other supabase calls inside onAuthStateChange (deadlock). */
function defer(fn: () => void) {
  queueMicrotask(fn);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadProfileRef = useRef<(authUser: User | null) => Promise<void>>(async () => {});

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setMemberProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const profile = await fetchMemberProfile(authUser.id);
      setMemberProfile(profile);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  loadProfileRef.current = loadProfile;

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      const u = initialSession?.user ?? null;
      setSession(initialSession);
      setUser(u);
      setIsLoading(false);
      if (u) {
        defer(() => void loadProfileRef.current(u));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const u = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(u);
      setIsLoading(false);
      if (u) {
        defer(() => void loadProfileRef.current(u));
      } else {
        setMemberProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (memberProfile?.status === 'banned' && user && !isAdminProfile(memberProfile)) {
      defer(() => {
        void supabase.auth.signOut();
        sessionStorage.setItem('banned_notice', '1');
      });
    }
  }, [memberProfile, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setMemberProfile(null);
    setProfileLoading(false);
  };

  const refreshUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);
    await loadProfile(currentUser);
  };

  const refreshMemberProfile = async () => {
    await loadProfile(user);
  };

  const isAdmin = Boolean(user && isAdminProfile(memberProfile));

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        memberProfile,
        profileLoading,
        isLoading,
        isAdmin,
        isBanned: memberProfile?.status === 'banned',
        signOut,
        refreshUser,
        refreshMemberProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
