export interface HealthResponse {
    status: string;
    service: string;
    timestamp: string;
}

export interface VersionResponse {
    name: string;
    apiVersion: string;
}

export interface AppSettingResponse {
    key: string;
    value: string;
}

export interface ApiError {
    message: string;
}
