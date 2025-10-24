import { workspace, extensions, window, QuickPickItem } from "vscode";
import { MultiStepInput } from "./multiStepInput";
import { i18n } from "./i18n";

export async function collectInputs() {
  type QuickPickItemWithValue = QuickPickItem & { value: string };

  interface State {
    type: QuickPickItemWithValue;
    jiraId: string;
    scope: string;
    summary: string;
    detail: string;
    breakingChange: string;
    reporterList: QuickPickItemWithValue[];
    reviewerList: QuickPickItemWithValue[];
    finnish: QuickPickItemWithValue;
  }

  function shouldResume() {
    // Could show a notification with the option to resume.
    return new Promise<boolean>((_resolve, _reject) => {
      // noop
    });
  }

  function getRepo() {
    // 获取 Git 扩展
    const gitExtension = extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
      return window.showErrorMessage("Git 扩展未激活");
    }
    const git = gitExtension.getAPI(1);
    const repo = git.repositories[0];
    if (!repo) {
      return window.showErrorMessage("没有找到 Git 仓库");
    }
    return repo;
  }
  const repo = getRepo();
  const config = workspace.getConfiguration("gitCommitMessage");
  const {
    language,
    enableJira,
    jiraUrl,
    jiraPrefix,
    reporters,
    reviewers,
    signerName,
    signerEmail,
  } = config;
  let totalSteps = 6;
  totalSteps += enableJira ? 1 : 0;
  totalSteps += reporters.length ? 1 : 0;
  totalSteps += reviewers.length ? 1 : 0;
  const state = {} as Partial<State>;
  await MultiStepInput.run((input) => pickType(input, state));
  return state as State;

  function updateGitCommitMessage(state: Partial<State>) {
    const {
      type,
      jiraId = "",
      scope = "",
      summary = "",
      detail = "",
      breakingChange = "",
      reporterList = [],
      reviewerList = [],
    } = state;
    repo.inputBox.value =
      (type?.value ?? "") +
      (jiraId ? `[${jiraPrefix}${jiraId}]` : "") +
      (scope ? `${jiraId ? "" : "."}${scope}` : "") +
      `: ${summary}` +
      (detail ? `\n\n${detail?.replaceAll("\\n", "\n")}` : "") +
      (breakingChange
        ? `\n\n${i18n[language].breakingChange}: ` +
          breakingChange?.replaceAll("\\n", "\n")
        : "") +
      (enableJira && jiraUrl && jiraId
        ? `\n\n[${jiraPrefix}${jiraId}]: ${jiraUrl}${jiraPrefix}${jiraId}`
        : "") +
      (reporterList?.length
        ? `\n\n${reporterList
            .map((x: any) => `${i18n[language].reporter}: ${x.value}`)
            .join("\n")}`
        : "") +
      (reviewerList?.length
        ? `\n\n${reviewerList
            .map((x: any) => `${i18n[language].reviewer}: ${x.value}`)
            .join("\n")}`
        : "") +
      (signerName || signerEmail ? `\n\n${i18n[language].signer}:` : "") +
      (signerName ? ` ${signerName}` : "") +
      (signerEmail ? ` <${signerEmail}>` : "");
  }

  async function pickType(input: MultiStepInput, state: Partial<State>) {
    state.type = (await input.showQuickPick({
      step: 1,
      totalSteps,
      title: "Git Commit Message: 选择类型",
      placeholder: "选择类型",
      ignoreFocusOut: true,
      activeItem: state.type,
      shouldResume: shouldResume,
      items: [
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
          description: "(release): 仅更改发布文件, 如版本说明, 不影响代码功能",
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
    })) as QuickPickItemWithValue;
    updateGitCommitMessage(state);
    return (input: MultiStepInput) => inputJira(input, state);
  }

  async function inputJira(input: MultiStepInput, state: Partial<State>) {
    if (enableJira) {
      state.jiraId = await input.showInputBox({
        step: 2,
        totalSteps,
        title: "Git Commit Message: Jira ID",
        prompt: "可不填",
        placeholder: "填写 Jira ID",
        ignoreFocusOut: true,
        value: state.jiraId || "",
        validate: async () => undefined,
        shouldResume: shouldResume,
      });
      updateGitCommitMessage(state);
    }
    return (input: MultiStepInput) => inputScope(input, state);
  }

  async function inputScope(input: MultiStepInput, state: Partial<State>) {
    state.scope = await input.showInputBox({
      step: 2 + (enableJira ? 1 : 0),
      totalSteps,
      title: "Git Commit Message: 范围",
      prompt: "可不填",
      placeholder: "填写范围",
      ignoreFocusOut: true,
      value: state.scope || "",
      validate: async () => undefined,
      shouldResume: shouldResume,
    });
    updateGitCommitMessage(state);
    return (input: MultiStepInput) => inputSummary(input, state);
  }

  async function inputSummary(input: MultiStepInput, state: Partial<State>) {
    state.summary = await input.showInputBox({
      step: 3 + (enableJira ? 1 : 0),
      totalSteps,
      title: "Git Commit Message: 摘要",
      prompt: "必填, 不可换行",
      placeholder: "填写摘要",
      ignoreFocusOut: true,
      value: state.summary || "",
      validate: async (text) =>
        text.trim().length === 0 ? "摘要不能为空" : undefined,
      shouldResume: shouldResume,
    });
    updateGitCommitMessage(state);
    return (input: MultiStepInput) => inputDetail(input, state);
  }

  async function inputDetail(input: MultiStepInput, state: Partial<State>) {
    state.detail = await input.showInputBox({
      step: 4 + (enableJira ? 1 : 0),
      totalSteps,
      title: "Git Commit Message: 详情",
      prompt: "可不填, 可使用\\n换行",
      placeholder: "填写详情",
      ignoreFocusOut: true,
      value: state.detail || "",
      validate: async () => undefined,
      shouldResume: shouldResume,
    });
    updateGitCommitMessage(state);
    return (input: MultiStepInput) => inputBreakingChange(input, state);
  }

  async function inputBreakingChange(
    input: MultiStepInput,
    state: Partial<State>
  ) {
    state.breakingChange = await input.showInputBox({
      step: 5 + (enableJira ? 1 : 0),
      totalSteps,
      title: "Git Commit Message: 破坏性变更",
      prompt: "可不填, 可使用\\n换行",
      placeholder: "填写破坏性变更",
      ignoreFocusOut: true,
      value: state.breakingChange || "",
      validate: async () => undefined,
      shouldResume: shouldResume,
    });
    updateGitCommitMessage(state);
    return (input: MultiStepInput) => pickReporters(input, state);
  }

  async function pickReporters(input: MultiStepInput, state: Partial<State>) {
    if (reporters?.length) {
      state.reporterList = (await input.showQuickPick({
        step: 6 + (enableJira ? 1 : 0),
        totalSteps,
        title: "Git Commit Message: 选择报告人",
        placeholder: "选择报告人 (多选, 可不选)",
        ignoreFocusOut: true,
        canSelectMany: true,
        selectedItems: state.reporterList,
        shouldResume: shouldResume,
        items: reporters?.map(
          (x: { name: string; email: string; picked: boolean }) => ({
            label: x.name,
            value: `${x.name} <${x.email}>`,
            description: x.email,
            picked: x.picked,
          })
        ),
      })) as QuickPickItemWithValue[];
      updateGitCommitMessage(state);
    }
    return (input: MultiStepInput) => pickReviewers(input, state);
  }

  async function pickReviewers(input: MultiStepInput, state: Partial<State>) {
    if (reviewers?.length) {
      state.reviewerList = (await input.showQuickPick({
        step: 6 + (enableJira ? 1 : 0) + (reporters.length ? 1 : 0),
        totalSteps,
        title: "Git Commit Message: 选择审阅人",
        placeholder: "选择审阅人 (多选, 可不选)",
        ignoreFocusOut: true,
        canSelectMany: true,
        selectedItems: state.reviewerList,
        shouldResume: shouldResume,
        items: reviewers?.map(
          (x: { name: string; email: string; picked: boolean }) => ({
            label: x.name,
            value: `${x.name} <${x.email}>`,
            description: x.email,
            picked: x.picked,
          })
        ),
      })) as QuickPickItemWithValue[];
      updateGitCommitMessage(state);
    }
    return (input: MultiStepInput) => pickFinnish(input, state);
  }

  async function pickFinnish(input: MultiStepInput, state: Partial<State>) {
    state.finnish = (await input.showQuickPick({
      step:
        6 +
        (enableJira ? 1 : 0) +
        (reporters.length ? 1 : 0) +
        (reviewers.length ? 1 : 0),
      totalSteps,
      title: "Git Commit Message: 完成",
      placeholder: "选择完成",
      ignoreFocusOut: true,
      shouldResume: shouldResume,
      items: [
        {
          label: "$(arrow-left) 上一步",
          value: "上一步",
          description: "检查一下, 确认后请选择完成",
        },
        {
          label: "$(check) 完成",
          value: "完成",
          description: "选择完成即将退出, 再见",
        },
      ],
    })) as QuickPickItemWithValue;
    if (state.finnish?.value !== "完成") {
      return input.back();
    }
  }
}
