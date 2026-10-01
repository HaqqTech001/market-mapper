import type { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const base = appJson.expo as ExpoConfig;

  return {
    ...config,
    ...base,
    android: {
      ...base.android,
      config: {
        ...base.android?.config,
        ...(googleMapsApiKey
          ? { googleMaps: { apiKey: googleMapsApiKey } }
          : {}),
      },
    },
  };
};
