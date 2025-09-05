export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  mlServiceUrl: string;
  maxFileSize: number;
  uploadDir: string;
}

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  musicCollection: string;
  imageCollection: string;
}

export interface DatabaseCollections {
  music: string;
  image: string;
}
