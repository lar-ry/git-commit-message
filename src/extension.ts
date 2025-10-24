// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // console.log(
  //   'Congratulations, your extension "gitCommitMessage" is now active!'
  // );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json

  const disposable = vscode.commands.registerCommand(
    "larry.gitCommitMessage",
    async () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      // vscode.window.showInformationMessage("Hello World from git commit Message!");
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

      const {
        enableJira,
        jiraUrl,
        jiraPrefix,
        reporters,
        reviewers,
        signerName,
        signerEmail,
      } = vscode.workspace.getConfiguration("gitCommitMessage");

      const totalSteps = enableJira ? 8 : 7;
      let step = 1;
      let commitMsg = "";
      // Step 1: 选择提交类型
      const type = await vscode.window.showQuickPick(
        [
          {
            label: "$(rocket) 优化",
            value: "优化",
            description: "(perf): 代码或功能优化, 删减",
          },
          {
            label: "$(add) 功能",
            value: "功能",
            description: "(feat): 支持新的功能",
          },
          {
            label: "$(bug) 修复",
            value: "修复",
            description: "(fix): 问题修复",
          },
          {
            label: "$(book) 文档",
            value: "文档",
            description: "(docs): 仅更改文档文件, 不影响代码功能",
          },
          {
            label: "$(bookmark) 发布",
            value: "发布",
            description:
              "(release): 仅更改发布文件, 如版本说明, 不影响代码功能",
          },
          {
            label: "$(discard) 还原",
            value: "还原",
            description: "(revert): 还原代码, 恢复之前版本的代码",
          },
          {
            label: "$(jersey) 样式",
            value: "样式",
            description: "(style): 仅更改样式文件",
          },
          {
            label: "$(lightbulb) 重构",
            value: "重构",
            description:
              "(refactor): 为修复问题或支持新功能或优化性能而进行代码重新构建",
          },
          {
            label: "$(beaker) 测试",
            value: "测试",
            description: "(test): 仅更改测试文件, 不影响代码功能",
          },
          {
            label: "$(play) 构建",
            value: "构建",
            description: "(build): 仅更改构建文件, 不影响代码功能",
          },
          {
            label: "$(search) 运维",
            value: "运维",
            description:
              "(om): 仅更改运维文件, 比如持续集成, 持续部署等, 不影响代码功能",
          },
        ],
        {
          title: `Git Commit Message: 选择提交类型 (${step++}/${totalSteps})`,
          placeHolder: "选择一个提交类型",
        }
      );

      if (type === undefined) {
        return; // 用户取消
      }
      commitMsg += type.value;
      repo.inputBox.value = commitMsg;

      // Step 2: 输入Jira
      const jiraId = enableJira
        ? await vscode.window.showInputBox({
            title: `Git Commit Message: Jira ID (${step++}/${totalSteps})`,
            prompt: "可不填",
            placeHolder: "Jira ID",
          })
        : "";
      if (jiraId === undefined) {
        return; // 用户取消
      }
      commitMsg += jiraId ? `[${jiraPrefix}${jiraId}]` : "";
      repo.inputBox.value = commitMsg;
      // Step 2: 输入范围
      const scope = await vscode.window.showInputBox({
        title: `Git Commit Message: 范围 (${step++}/${totalSteps})`,
        prompt: "可不填",
        placeHolder: "范围",
      });

      if (scope === undefined) {
        return; // 用户取消
      }
      commitMsg += scope ? `.${scope}` : "";
      repo.inputBox.value = commitMsg;

      // Step 3: 输入摘要
      const summary = await vscode.window.showInputBox({
        title: `Git Commit Message: 摘要 (${step++}/${totalSteps})`,
        prompt: "必填, 不可换行",
        placeHolder: "摘要",
        validateInput: (text) =>
          text.trim().length === 0 ? "摘要不能为空" : undefined,
      });

      if (summary === undefined) {
        return; // 用户取消
      }
      commitMsg += `: ${summary}`;
      repo.inputBox.value = commitMsg;

      // Step 3: 输入描述
      const detail = await vscode.window.showInputBox({
        title: `Git Commit Message: 详情 (${step++}/${totalSteps})`,
        prompt: "可不填, 可使用\\n换行",
        placeHolder: "详情信息",
      });

      if (detail === undefined) {
        return; // 用户取消
      }
      commitMsg += detail ? `\n\n${detail?.replaceAll("\\n", "\n")}` : "";
      repo.inputBox.value = commitMsg;
      // Step 3: 输入描述
      const breakingChange = await vscode.window.showInputBox({
        title: `Git Commit Message: 破坏性变更 (${step++}/${totalSteps})`,
        prompt: "可不填, 可使用\\n换行",
        placeHolder: "破坏性变更信息",
      });

      if (breakingChange === undefined) {
        return; // 用户取消
      }
      commitMsg += breakingChange
        ? `\n\n破坏性变更: ${breakingChange?.replaceAll("\\n", "\n")}`
        : "";
      commitMsg +=
        enableJira && jiraUrl && jiraId
          ? `\n\n[${jiraPrefix}${jiraId}]: ${jiraUrl}${jiraPrefix}${jiraId}`
          : "";
      repo.inputBox.value = commitMsg;

      // Step 1: 选择报告人
      const reportersOptions: {
        label: string;
        value: string;
        description: string;
        picked: boolean;
      }[] = reporters.map(
        (x: { name: string; email: string; picked: boolean }) => ({
          label: x.name,
          value: `${x.name} <${x.email}>`,
          description: x.email,
          picked: x.picked,
        })
      );
      const reporter = await vscode.window.showQuickPick(reportersOptions, {
        title: `Git Commit Message: 选择报告人 (${step++}/${totalSteps})`,
        placeHolder: "选择报告人 (多选, 可不选)",
        canPickMany: true,
      });

      if (reporter === undefined) {
        return; // 用户取消
      }
      commitMsg += reporter.length
        ? `\n${reporter.map((x) => `\n报告人: ${x.value}`).join("")}`
        : "";
      repo.inputBox.value = commitMsg;

      // Step 1: 选择审阅人
      const reviewersOptions: {
        label: string;
        value: string;
        description: string;
        picked: boolean;
      }[] = reviewers.map(
        (x: { name: string; email: string; picked: boolean }) => ({
          label: x.name,
          value: `${x.name} <${x.email}>`,
          description: x.email,
          picked: x.picked,
        })
      );
      const reviewer = await vscode.window.showQuickPick(reviewersOptions, {
        title: `Git Commit Message: 选择审阅人 (${step++}/${totalSteps})`,
        placeHolder: "选择审阅人 (多选, 可不选)",
        canPickMany: true,
      });

      if (reviewer === undefined) {
        return; // 用户取消
      }
      commitMsg += reviewer.length
        ? `\n${reviewer.map((x) => `\n审阅人: ${x.value}`).join("")}`
        : "";

      // Step 1: 选择提交人

      commitMsg += signerName || signerEmail ? `\n\n提交人:` : "";
      commitMsg += signerName ? ` ${signerName}` : "";
      commitMsg += signerEmail ? ` <${signerEmail}>` : "";

      repo.inputBox.value = commitMsg;
    }
  );
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
