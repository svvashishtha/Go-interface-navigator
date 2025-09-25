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
                if (locations.length === 1) {
                    // Single implementation found, navigate directly
                    vscode.window.showTextDocument(locations[0].uri, {
                        selection: locations[0].range
                    });
                    return;
                } else {
                    // Multiple implementations found, show selection dialog
                    const selected = await vscode.window.showQuickPick(
                        locations.map((loc, i) => {
                            // Extract file name and line number for better display
                            const fileName = loc.uri.fsPath.split('/').pop() || loc.uri.fsPath;
                            const lineNumber = loc.range.start.line + 1;
                            return {
                                label: `${i + 1}. ${fileName}:${lineNumber}`,
                                description: loc.uri.fsPath,
                                location: loc
                            };
                        }),
                        { placeHolder: 'Select implementation to navigate to' }
                    );
                    if (selected) {
                        vscode.window.showTextDocument(selected.location.uri, {
                            selection: selected.location.range
                        });
                    }
                    return;
                }
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

    // Register the findAndNavigateToInterface command for cross-file interface search
    context.subscriptions.push(
        vscode.commands.registerCommand("go-interface-navigator.findAndNavigateToInterface", async (methodName: string, implementationPosition: vscode.Position) => {
            try {
                // Get the active document to find the method implementation
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showErrorMessage('No active text editor');
                    return;
                }

                const document = activeEditor.document;
                
                // Get document symbols to find the method implementation
                const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                    'vscode.executeDocumentSymbolProvider',
                    document.uri
                );

                if (!symbols) {
                    vscode.window.showErrorMessage('Could not get document symbols');
                    return;
                }

                // Find the method symbol that contains our implementation position
                let methodSymbol: vscode.DocumentSymbol | null = null;
                for (const symbol of symbols) {
                    if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
                        // Extract method name from symbol
                        const symbolName = symbol.name;
                        const methodMatch = symbolName.match(/\)\.(\w+)$/);
                        const extractedMethodName = methodMatch ? methodMatch[1] : symbolName;
                        
                        if (extractedMethodName === methodName && symbol.range.contains(implementationPosition)) {
                            methodSymbol = symbol;
                            break;
                        }
                    }
                }

                if (!methodSymbol) {
                    vscode.window.showErrorMessage(`Could not find method symbol for: ${methodName}`);
                    return;
                }

                // Use LSP to find type definition - this should give us the interface
                const typeDefinitions = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
                    'vscode.executeTypeDefinitionProvider',
                    document.uri,
                    methodSymbol.selectionRange.start
                );

                if (typeDefinitions && typeDefinitions.length > 0) {
                    // Navigate to the first type definition (should be the interface)
                    const typeDef = typeDefinitions[0];
                    let targetUri: vscode.Uri;
                    let targetRange: vscode.Range;
                    
                    if ('targetUri' in typeDef) {
                        // LocationLink
                        targetUri = typeDef.targetUri;
                        targetRange = typeDef.targetRange;
                    } else {
                        // Location
                        targetUri = typeDef.uri;
                        targetRange = typeDef.range;
                    }
                    
                    // Now find the specific method within the interface
                    const interfaceMethodPosition = await findMethodInInterface(targetUri, targetRange, methodName);
                    if (interfaceMethodPosition) {
                        vscode.window.showTextDocument(targetUri, {
                            selection: interfaceMethodPosition
                        });
                        return;
                    } else {
                        // Fallback to interface itself if method not found
                        vscode.window.showTextDocument(targetUri, {
                            selection: targetRange
                        });
                        return;
                    }
                }

                // Fallback: Use "Go to Definition" to find the interface method
                const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
                    'vscode.executeDefinitionProvider',
                    document.uri,
                    methodSymbol.selectionRange.start
                );

                if (definitions && definitions.length > 0) {
                    // Check each definition to see if it's an interface method
                    for (const definition of definitions) {
                        const interfaceMethodPosition = await findMethodInInterface(definition.uri, definition.range, methodName);
                        if (interfaceMethodPosition) {
                            vscode.window.showTextDocument(definition.uri, {
                                selection: interfaceMethodPosition
                            });
                            return;
                        }
                    }
                }

                // If we reach here, we couldn't find the interface
                vscode.window.showInformationMessage(`No interface found for method: ${methodName}`);

            } catch (error) {
                vscode.window.showErrorMessage(`Error finding interface: ${error}`);
            }
        })
    );
}

export function deactivate() { }

// Helper function to find a specific method within an interface
async function findMethodInInterface(uri: vscode.Uri, interfaceRange: vscode.Range, methodName: string): Promise<vscode.Range | null> {
    try {
        // Get document symbols for the interface file
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            uri
        );

        if (!symbols) return null;

        // Find interfaces that contain the given range
        for (const symbol of symbols) {
            if (symbol.kind === vscode.SymbolKind.Interface &&
                (symbol.range.contains(interfaceRange.start) || interfaceRange.contains(symbol.range.start))) {
                
                // Look for the specific method within this interface
                for (const method of symbol.children || []) {
                    if (method.name === methodName) {
                        return method.selectionRange;
                    }
                }
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

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

                // In Go, symbolName could be like: "(s *Service).GetUser" or just "GetUser"
                let implMethodName: string;
                const methodMatch = symbolName.match(/\)\.(\w+)$/); // extract method name from "(receiver).MethodName"
                if (methodMatch) {
                    implMethodName = methodMatch[1];
                } else {
                    // For simple function names or method names without receiver syntax
                    implMethodName = symbolName;
                }


                if (!implMethodName) continue;

                let interfaceFound = false;

                // First, scan current file for interface methods
                for (const iface of symbols) {
                    if (iface.kind === vscode.SymbolKind.Interface) {
                        for (const ifaceMethod of iface.children || []) {
                            if (ifaceMethod.name === implMethodName) {
                                lenses.push(new vscode.CodeLens(
                                    new vscode.Range(symbol.selectionRange.start, symbol.selectionRange.start),
                                    {
                                        title: '↑ Go to Interface',
                                        command: 'go-interface-navigator.findAndNavigateToInterface',
                                        arguments: [implMethodName, symbol.selectionRange.start]
                                    }
                                ));
                                interfaceFound = true;
                            }
                        }
                    }
                }

                // If no interface found in current file, search across workspace
                if (!interfaceFound) {
                    lenses.push(new vscode.CodeLens(
                        new vscode.Range(symbol.selectionRange.start, symbol.selectionRange.start),
                        {
                            title: '↑ Go to Interface',
                            command: 'go-interface-navigator.findAndNavigateToInterface',
                            arguments: [implMethodName, symbol.selectionRange.start]
                        }
                    ));
                }
            }
        }

        return lenses;
    }
}