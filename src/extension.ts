import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register CodeLens provider for Go files
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'go' }, new GoInterfaceMethodCodeLensProvider())
    );

    // Register the command triggered by CodeLens
    context.subscriptions.push(
        vscode.commands.registerCommand("go-interface-navigator.navigateToImplementation", async (uri: vscode.Uri, position: vscode.Position) => {
            const locations = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeImplementationProvider',
                uri,
                position
            );

            if (locations && locations.length > 0) {
                vscode.window.showTextDocument(locations[0].uri, {
                    selection: locations[0].range
                });
            } else {
                vscode.window.showInformationMessage("No implementation found.");
            }
        })
    );

    // Register the navigateToInterface command
    context.subscriptions.push(
        vscode.commands.registerCommand("go-interface-navigator.navigateToInterface", async (uri: vscode.Uri, position: vscode.Position) => {
            vscode.window.showTextDocument(uri, { selection: new vscode.Range(position, position) });
        })
    );
}

export function deactivate() { }

class GoInterfaceMethodCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const lenses: vscode.CodeLens[] = [];

        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (!symbols) return lenses;

        // 1. ↓ Go to Implementation (interface methods)
        for (const symbol of symbols) {
            if (symbol.kind === vscode.SymbolKind.Interface) {
                for (const method of symbol.children || []) {
                    const methodPosition = method.selectionRange.start;
                    lenses.push(new vscode.CodeLens(
                        new vscode.Range(methodPosition, methodPosition),
                        {
                            title: '↓ Go to Implementation',
                            command: 'go-interface-navigator.navigateToImplementation',
                            arguments: [document.uri, methodPosition]
                        }
                    ));
                }
            }
        }

        // 2. ↑ Go to Interface (function implementations)
        for (const symbol of symbols) {
            if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
                const symbolName = symbol.name;

                // In Go, symbolName could be like: "(s *Service).GetUser"
                const methodMatch = symbolName.match(/\)\.(\w+)$/); // extract method name
                const implMethodName = methodMatch ? methodMatch[1] : symbolName;

                if (!implMethodName) continue;

                // Now scan all interface methods to match
                for (const iface of symbols) {
                    if (iface.kind === vscode.SymbolKind.Interface) {
                        for (const ifaceMethod of iface.children || []) {
                            if (ifaceMethod.name === implMethodName) {
                                lenses.push(new vscode.CodeLens(
                                    new vscode.Range(symbol.selectionRange.start, symbol.selectionRange.start),
                                    {
                                        title: '↑ Go to Interface',
                                        command: 'go-interface-navigator.navigateToInterface',
                                        arguments: [document.uri, ifaceMethod.selectionRange.start]
                                    }
                                ));
                            }
                        }
                    }
                }
            }
        }

        return lenses;
    }
}