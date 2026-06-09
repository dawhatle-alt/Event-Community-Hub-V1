import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

import {
  getPendingReminders,
  rehydrateRemindersFromServer,
  type ReminderRecord,
} from "@/lib/notifications";

type RemindersContextValue = {
  reminders: ReminderRecord[];
  setReminders: React.Dispatch<React.SetStateAction<ReminderRecord[]>>;
  refreshReminders: () => Promise<void>;
  rehydrateFromServer: (
    apiBaseUrl: string,
    getAuthToken: () => Promise<string | null>
  ) => Promise<void>;
};

const RemindersContext = createContext<RemindersContextValue>({
  reminders: [],
  setReminders: () => {},
  refreshReminders: async () => {},
  rehydrateFromServer: async () => {},
});

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);

  const refreshReminders = useCallback(async () => {
    if (Platform.OS === "web") return;
    const pending = await getPendingReminders();
    setReminders(pending);
  }, []);

  const rehydrateFromServer = useCallback(
    async (apiBaseUrl: string, getAuthToken: () => Promise<string | null>) => {
      if (Platform.OS === "web") return;
      const updated = await rehydrateRemindersFromServer(apiBaseUrl, getAuthToken);
      setReminders(updated);
    },
    []
  );

  useEffect(() => {
    refreshReminders();
  }, [refreshReminders]);

  return (
    <RemindersContext.Provider
      value={{ reminders, setReminders, refreshReminders, rehydrateFromServer }}
    >
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  return useContext(RemindersContext);
}
