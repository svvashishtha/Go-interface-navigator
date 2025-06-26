import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register CodeLens provider for Go files
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ language: 'go' }, new GoInterfaceMethodCodeLensProvider())
    );

    // Register the command triggered by CodeLens
    context.subscriptions.push(
        vscode.commands.registerCommand("go-interface-navigator.navigateToImplementation", async (uri: vscode.Uri, position: vscode.Position) => {
            // First try built-in implementation provider
            const locations = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeImplementationProvider',
                uri,
                position
            );

            if (locations && locations.length > 0) {
                vscode.window.showTextDocument(locations[0].uri, {
                    selection: locations[0].range
                });
                return;
            }

            // Fallback: search across workspace
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                uri
            );

            // Find the interface method name at the given position
            let methodName: string | null = null;
            for (const sym of symbols || []) {
                if (sym.kind === vscode.SymbolKind.Interface) {
                    for (const method of sym.children || []) {
                        if (method.selectionRange.contains(position)) {
                            methodName = method.name;
                        }
                    }
                }
            }

            if (!methodName) {
                vscode.window.showInformationMessage("Could not determine method name.");
                return;
            }

            // Search all symbols in workspace
            const workspaceSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                'vscode.executeWorkspaceSymbolProvider',
                methodName
            );

            const matching = (workspaceSymbols || []).filter(s => {
                const match = s.name.match(/\)\.(\w+)$/);
                const cleanName = match ? match[1] : s.name;
                return cleanName === methodName &&
                    (s.kind === vscode.SymbolKind.Method || s.kind === vscode.SymbolKind.Function);
            });

            if (matching.length === 0) {
                vscode.window.showInformationMessage(`No implementation found for ${methodName}`);
            } else if (matching.length === 1) {
                vscode.window.showTextDocument(matching[0].location.uri, {
                    selection: matching[0].location.range
                });
            } else {
                const selected = await vscode.window.showQuickPick(
                    matching.map((m, i) => ({
                        label: `${i + 1}. ${m.containerName || 'unknown'}`,
                        description: m.location.uri.fsPath,
                        location: m.location
                    })),
                    { placeHolder: `Select implementation of ${methodName}` }
                );
                if (selected) {
                    vscode.window.showTextDocument(selected.location.uri, {
                        selection: selected.location.range
                    });
                }
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