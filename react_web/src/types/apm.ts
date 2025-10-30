export class APMConfig {
    constructor() {
    }

    private _serviceName: string | undefined;

    get serviceName(): string {
        return <string>this._serviceName;
    }

    set serviceName(value: string) {
        this._serviceName = value;
    }

    private _serverUrl: string | undefined;

    get serverUrl(): string {
        return <string>this._serverUrl;
    }

    set serverUrl(value: string) {
        this._serverUrl = value;
    }

    private _enabled: boolean = false;

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }
}