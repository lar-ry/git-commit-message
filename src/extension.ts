import * as vscode from "vscode";
import { i18n } from "./i18n";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "LarryLan.gitCommitMessage",
    async () => {
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
        language,
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
      // Step: 选择提交类型
      const type = await vscode.window.showQuickPick(
        [
          {
            label: "$(rocket) 优化",
            value: i18n[language].perf,
            description: "(perf): 代码或功能优化, 删减",
          },
          {
            label: "$(add) 功能",
            value: i18n[language].feat,
            description: "(feat): 支持新的功能",
          },
          {
            label: "$(bug) 修复",
            value: i18n[language].fix,
            description: "(fix): 问题修复",
          },
          {
            label: "$(book) 文档",
            value: i18n[language].docs,
            description: "(docs): 仅更改文档文件, 不影响代码功能",
          },
          {
            label: "$(bookmark) 发布",
            value: i18n[language].release,
            description:
              "(release): 仅更改发布文件, 如版本说明, 不影响代码功能",
          },
          {
            label: "$(discard) 还原",
            value: i18n[language].revert,
            description: "(revert): 还原代码, 恢复之前版本的代码",
          },
          {
            label: "$(jersey) 样式",
            value: i18n[language].style,
            description: "(style): 仅更改样式文件",
          },
          {
            label: "$(lightbulb) 重构",
            value: i18n[language].refactor,
            description:
              "(refactor): 为修复问题或支持新功能或优化性能而进行代码重新构建",
          },
          {
            label: "$(beaker) 测试",
            value: i18n[language].test,
            description: "(test): 仅更改测试文件, 不影响代码功能",
          },
          {
            label: "$(play) 构建",
            value: i18n[language].build,
            description: "(build): 仅更改构建文件, 不影响代码功能",
          },
          {
            label: "$(search) 运维",
            value: i18n[language].om,
            description:
              "(om): 仅更改运维文件, 比如持续集成, 持续部署等, 不影响代码功能",
          },
        ],
        {
          title: `Git Commit Message: 选择类型 (${step++}/${totalSteps})`,
          placeHolder: "选择类型",
          ignoreFocusOut: true,
        }
      );

      if (type === undefined) {
        return; // 用户取消
      }
      commitMsg += type.value;
      repo.inputBox.value = commitMsg;

      // Step: 输入Jira
      const jiraId = enableJira
        ? await vscode.window.showInputBox({
            title: `Git Commit Message: Jira ID (${step++}/${totalSteps})`,
            prompt: "可不填",
            placeHolder: "填写 Jira ID",
            ignoreFocusOut: true,
          })
        : "";
      if (jiraId === undefined) {
        return; // 用户取消
      }
      commitMsg += jiraId ? `[${jiraPrefix}${jiraId}]` : "";
      repo.inputBox.value = commitMsg;
      // Step: 输入范围
      const scope = await vscode.window.showInputBox({
        title: `Git Commit Message: 范围 (${step++}/${totalSteps})`,
        prompt: "可不填",
        placeHolder: "填写范围",
        ignoreFocusOut: true,
      });

      if (scope === undefined) {
        return; // 用户取消
      }
      commitMsg += scope ? `.${scope}` : "";
      repo.inputBox.value = commitMsg;

      // Step: 输入摘要
      const summary = await vscode.window.showInputBox({
        title: `Git Commit Message: 摘要 (${step++}/${totalSteps})`,
        prompt: "必填, 不可换行",
        placeHolder: "填写摘要",
        ignoreFocusOut: true,
        validateInput: (text) =>
          text.trim().length === 0 ? "摘要不能为空" : undefined,
      });

      if (summary === undefined) {
        return; // 用户取消
      }
      commitMsg += `: ${summary}`;
      repo.inputBox.value = commitMsg;

      // Step: 输入描述
      const detail = await vscode.window.showInputBox({
        title: `Git Commit Message: 详情 (${step++}/${totalSteps})`,
        prompt: "可不填, 可使用\\n换行",
        placeHolder: "填写详情",
        ignoreFocusOut: true,
      });

      if (detail === undefined) {
        return; // 用户取消
      }
      commitMsg += detail ? `\n\n${detail?.replaceAll("\\n", "\n")}` : "";
      repo.inputBox.value = commitMsg;
      // Step: 输入描述
      const breakingChange = await vscode.window.showInputBox({
        title: `Git Commit Message: 破坏性变更 (${step++}/${totalSteps})`,
        prompt: "可不填, 可使用\\n换行",
        placeHolder: "填写破坏性变更",
        ignoreFocusOut: true,
      });

      if (breakingChange === undefined) {
        return; // 用户取消
      }
      commitMsg += breakingChange
        ? `\n\n${i18n[language].breakingChange}: ` +
          breakingChange?.replaceAll("\\n", "\n")
        : "";
      commitMsg +=
        enableJira && jiraUrl && jiraId
          ? `\n\n[${jiraPrefix}${jiraId}]: ${jiraUrl}${jiraPrefix}${jiraId}`
          : "";
      repo.inputBox.value = commitMsg;

      // Step: 选择报告人
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
        ignoreFocusOut: true,
        canPickMany: true,
      });

      if (reporter === undefined) {
        return; // 用户取消
      }
      commitMsg += reporter.length
        ? `\n${reporter
            .map((x) => `\n${i18n[language].reporter}: ${x.value}`)
            .join("")}`
        : "";
      repo.inputBox.value = commitMsg;

      // Step: 选择审阅人
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
        ignoreFocusOut: true,
        canPickMany: true,
      });

      if (reviewer === undefined) {
        return; // 用户取消
      }
      commitMsg += reviewer.length
        ? `\n${reviewer
            .map((x) => `\n${i18n[language].reviewer}: ${x.value}`)
            .join("")}`
        : "";

      // Step: 选择提交人

      commitMsg +=
        signerName || signerEmail ? `\n\n${i18n[language].signer}:` : "";
      commitMsg += signerName ? ` ${signerName}` : "";
      commitMsg += signerEmail ? ` <${signerEmail}>` : "";

      repo.inputBox.value = commitMsg;
    }
  );
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
