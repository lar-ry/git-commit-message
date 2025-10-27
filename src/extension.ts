import * as vscode from "vscode";
import { collectInputs } from "./collectInputs";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "LarryLan.gitCommitMessage",
    collectInputs
  );
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
