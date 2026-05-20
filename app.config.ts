import type { ExpoConfig, ConfigContext } from "expo/config";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { domain } = require("./app.domain.json") as { domain: string };
const hostname = domain.replace(/^https?:\/\//, "");

export default ({ config }: ConfigContext): ExpoConfig => {
  const d = new Date();
  const lastUpdate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  return {
    ...config,
    ios: {
      ...config.ios,
      associatedDomains: [`applinks:${hostname}`],
    },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [{ scheme: "https", host: hostname }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    extra: {
      ...config.extra,
      lastUpdate,
    },
  };
};
