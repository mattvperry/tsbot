/**
 * Interface for initial configuration
 */
export interface Configuration {
    adapterPath?: string;
    adapter: string;
    disableHttpd: boolean;
    alias: string;
    name: string;
    require: string[];
}