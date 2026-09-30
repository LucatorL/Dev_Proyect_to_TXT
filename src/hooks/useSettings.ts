
import { ProjectType } from "@/lib/file-processor";
import useLocalStorage from "./useLocalStorage";

export interface UserSettings {
  lastProjectType: ProjectType;
  lastSeenVersion: string;
}

const defaultSettings: UserSettings = {
  lastProjectType: "java",
  lastSeenVersion: "0.0.0",
};

function useSettings() {
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    "user-settings",
    defaultSettings
  );

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      ...newSettings,
    }));
  };

  return { settings, updateSettings };
}

export default useSettings;
