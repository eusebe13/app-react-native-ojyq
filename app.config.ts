import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const d = new Date();
  const lastUpdate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  return {
    ...config,
    extra: {
      ...config.extra,
      lastUpdate,
    },
  } as ExpoConfig;
};
