// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "git-commit" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json

  const disposable = vscode.commands.registerCommand(
    "larry.git-commit",
    async () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      // vscode.window.showInformationMessage("Hello World from git commit!");
      // 获取 Git 扩展
      const gitExtension =
        vscode.extensions.getExtension("vscode.git")?.exports;
      if (!gitExtension) {
        return vscode.window.showErrorMessage("Git 扩展未激活");
      }
      const git = gitExtension.getAPI(1);
      const repo = git.repositories[0];
      if (!repo) {
        return vscode.window.showErrorMessage("没有找到 Git 仓库");
      }
      // Step 1: 选择提交类型
      const typeOptions = [
        { label: "功能", description: "支持新功能" },
        { label: "修复", description: "修复功能" },
        { label: "文档", description: "文档变更" },
      ];

      const type = await vscode.window.showQuickPick(typeOptions, {
        title: "Git Commit: 选择提交类型 (1/4)",
        placeHolder: "选择一个提交类型",
      });

      if (!type) {
        return; // 用户取消
      }

      // Step 2: 输入作用域
      const scope = await vscode.window.showInputBox({
        title: "Git Commit: 输入作用域 (2/4)",
        prompt: "输入作用域 (可选，比如模块名)",
        placeHolder: "作用域 (可留空)",
      });

      if (scope === undefined) {
        return; // 用户取消
      }

      // Step 3: 输入描述
      const description = await vscode.window.showInputBox({
        title: "Git Commit: 输入描述 (3/4)",
        prompt: "输入提交描述",
        placeHolder: "简短描述",
        validateInput: (text) =>
          text.trim().length === 0 ? "描述不能为空" : undefined,
      });

      if (!description) {
        return; // 用户取消
      }

      // Step 4: 确认
      const confirm = await vscode.window.showQuickPick(["是", "否"], {
        title: "Git Commit: 确认 (4/4)",
        placeHolder: `确认提交吗？\n${type.label}${
          scope ? `(${scope})` : ""
        }: ${description}`,
      });

      if (confirm === "是") {
        const commitMsg = `最终提交信息: ${type.label}${
          scope ? `(${scope})` : ""
        }: ${description}`;
        // 填充到当前 Git 仓库的 commit message
        repo.inputBox.value = commitMsg;
      }
    }
  );
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
