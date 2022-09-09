import {
    Connection,
    WorkspaceFolder as _WorkspaceFolder,
} from 'vscode-languageserver';

interface IConfiguration {
    remoteCwd: string;
    shell: string;
    maxNumberOfProblems: number;
    files: string;
    relativeFilePath: boolean;
    php?: string;
    phpunit?: string;
    args?: string[];
    docker?: boolean;
    dockerImage?: string;
    configFile?: string;
    discoverConfigFile: boolean;
    pathMappings: object;
}

export class Configuration implements IConfiguration {
    defaults: IConfiguration = {
        maxNumberOfProblems: 10000,
        files: '**/*.php',
        relativeFilePath: false,
        shell: '',
        remoteCwd: '',
        discoverConfigFile: false,
        pathMappings: {}
    };

    constructor(
        private connection: Connection,
        private workspaceFolder: _WorkspaceFolder
    ) { }

    get maxNumberOfProblems(): number {
        return this.defaults.maxNumberOfProblems;
    }

    get files(): string {
        return this.defaults.files;
    }

    get relativeFilePath(): boolean {
        return this.defaults.relativeFilePath;
    }

    get remoteCwd(): string {
        return this.defaults.remoteCwd;
    }

    get shell(): string {
        return this.defaults.shell;
    }

    get php(): string | undefined {
        return this.defaults.php;
    }

    get phpunit(): string | undefined {
        return this.defaults.phpunit;
    }

    get args(): string[] | undefined {
        return this.defaults.args;
    }

    get docker(): boolean | undefined {
        return this.defaults.docker;
    }

    get dockerImage(): string | undefined {
        return this.defaults.dockerImage;
    }

    get configFile(): string | undefined {
        return this.defaults.configFile;
    }

    get discoverConfigFile(): boolean {
        return this.defaults.discoverConfigFile;
    }

    get pathMappings(): object {
        return this.defaults.pathMappings;
    }

    async update(configurationCapability = true) {
        if (configurationCapability) {
            this.defaults = await this.connection.workspace.getConfiguration({
                scopeUri: this.workspaceFolder.uri,
                section: 'phpunit',
            });
        }

        return this;
    }
}
