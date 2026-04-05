import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/database-client";

interface DatabaseUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
}

interface DatabaseSession {
  user: DatabaseUser;
  access_token: string;
}

interface DatabaseContextType {
  database: typeof db;
  supabase: typeof db;
  user: DatabaseUser | null;
  session: DatabaseSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabaseContext must be used within a DatabaseProvider");
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DatabaseUser | null>(null);
  const [session, setSession] = useState<DatabaseSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await db.auth.getUser();

        if (currentUser) {
          const nextSession: DatabaseSession = {
            user: currentUser as DatabaseUser,
            access_token: "local-session-token",
          };
          setUser(currentUser as DatabaseUser);
          setSession(nextSession);
        }
      } catch (error) {
        console.error("Error initializing database session:", error);
      } finally {
        setLoading(false);
      }
    };

    void initializeSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    const {
      data: { user: signedInUser },
      error,
    } = await db.auth.signIn(email, password);

    if (error) {
      throw error;
    }

    if (signedInUser) {
      const nextSession: DatabaseSession = {
        user: signedInUser as DatabaseUser,
        access_token: "local-session-token",
      };
      setUser(signedInUser as DatabaseUser);
      setSession(nextSession);
    }
  };

  const signUp = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const signOut = async () => {
    const { error } = await db.auth.signOut();
    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
  };

  return (
    <DatabaseContext.Provider
      value={{
        database: db,
        supabase: db,
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};
