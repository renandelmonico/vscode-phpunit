/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
    createConnection,
    TextDocuments,
    TextDocument,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    CodeLensParams,
    ExecuteCommandParams,
    Position,
    WillSaveTextDocumentNotification,
    MessageType,
    LogMessageNotification,
} from 'vscode-languageserver';
import Parser, { Test } from './parser';
import { TestRunner } from './testRunner';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            // Tell the client that the server supports code completion
            completionProvider: {
                resolveProvider: true,
            },
            codeLensProvider: {
                resolveProvider: true,
            },
            executeCommandProvider: {
                commands: [
                    'phpunit.lsp.test.suite',
                    'phpunit.lsp.test.file',
                    'phpunit.lsp.test.nearest',
                    'phpunit.lsp.test.last',
                ],
            },
        },
    };
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined
        );
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// The example settings
interface PHPUnitSettings {
    maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: PHPUnitSettings = { maxNumberOfProblems: 1000 };
let globalSettings: PHPUnitSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<PHPUnitSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <PHPUnitSettings>(
            (change.settings.phpunit || defaultSettings)
        );
    }

    // Revalidate all open text documents
    // documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<PHPUnitSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'phpunit',
        });
        documentSettings.set(resource, result);
    }
    return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
    // documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    // validateTextDocument(change.document);
});

connection.onDidChangeWatchedFiles(_change => {
    // Monitored files have change in VSCode
    // connection.console.log(JSON.stringify(_change));
    connection.console.log('We received an file change event');
});

connection.onCodeLens((params: CodeLensParams) => {
    return new Parser()
        .parseTextDocument(documents.get(params.textDocument.uri))
        .map((test: Test) => test.asCodeLens());
});

const runner = new TestRunner();
connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
    connection.sendNotification(WillSaveTextDocumentNotification.type, {});
    connection.sendNotification('before');

    const args = params.arguments;
    const textDocument: TextDocument = documents.get(args[0]);
    const position: Position = args[1];

    let response: string;
    switch (params.command) {
        case 'phpunit.lsp.test.suite':
            response = await runner.runSuite();

            break;
        case 'phpunit.lsp.test.file':
            response = await runner.runFile(textDocument);

            break;
        case 'phpunit.lsp.test.last':
            response = await runner.runLast(textDocument, position);
            break;

        default:
            response = await runner.runNearest(textDocument, position);
            break;
    }

    connection.sendNotification(LogMessageNotification.type, {
        type: MessageType.Log,
        message: response,
    });
    connection.sendNotification('after');
});
/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
