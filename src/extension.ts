import * as vscode from "vscode";
import { edit, clear } from "./commitMessage";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("larry-lan.gitCommitMessage.edit", () =>
      edit(context)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("larry-lan.gitCommitMessage.clear", clear)
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
