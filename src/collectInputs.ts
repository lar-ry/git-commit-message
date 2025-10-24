import { workspace, extensions, window, QuickPickItem, l10n } from "vscode";
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
    done: QuickPickItemWithValue;
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
      return window.showErrorMessage(l10n.t("Git extension not activated"));
    }
    const git = gitExtension.getAPI(1);
    const repo = git.repositories[0];
    if (!repo) {
      return window.showErrorMessage(l10n.t("No Git repository found"));
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
      title: l10n.t("Git Commit Message: {0}", l10n.t("Select Type")),
      placeholder: l10n.t("Select Type (single choice, required)"),
      ignoreFocusOut: true,
      activeItem: state.type,
      shouldResume: shouldResume,
      items: [
        {
          label: `$(rocket) ${l10n.t("perf")}`,
          value: i18n[language].perf,
          description: l10n.t("(perf): Code or feature optimization, deletion"),
        },
        {
          label: `$(add) ${l10n.t("feat")}`,
          value: i18n[language].feat,
          description: l10n.t("(feat): Support for new features"),
        },
        {
          label: `$(bug) ${l10n.t("fix")}`,
          value: i18n[language].fix,
          description: l10n.t("(fix): Bug fixes"),
        },
        {
          label: `$(book) ${l10n.t("docs")}`,
          value: i18n[language].docs,
          description: l10n.t(
            "(docs): Modify only documentation files, without affecting code functionality"
          ),
        },
        {
          label: `$(bookmark) ${l10n.t("release")}`,
          value: i18n[language].release,
          description: l10n.t(
            "(release): Modify only release files, such as version notes, without affecting code functionality"
          ),
        },
        {
          label: `$(discard) ${l10n.t("revert")}`,
          value: i18n[language].revert,
          description: l10n.t(
            "(revert): Revert code, restore the previous version of the code"
          ),
        },
        {
          label: `$(jersey) ${l10n.t("style")}`,
          value: i18n[language].style,
          description: l10n.t("(style): Modify only style files"),
        },
        {
          label: `$(lightbulb) ${l10n.t("refactor")}`,
          value: i18n[language].refactor,
          description: l10n.t(
            "(refactor): Rebuild code to fix issues, support new features, or optimize performance"
          ),
        },
        {
          label: `$(beaker) ${l10n.t("test")}`,
          value: i18n[language].test,
          description: l10n.t(
            "(test): Modify only test files, without affecting code functionality"
          ),
        },
        {
          label: `$(play) ${l10n.t("build")}`,
          value: i18n[language].build,
          description: l10n.t(
            "(build): Modify only build files, without affecting code functionality"
          ),
        },
        {
          label: `$(search) ${l10n.t("om")}`,
          value: i18n[language].om,
          description: l10n.t(
            "(om): Modify only operation and maintenance files, such as continuous integration and continuous deployment, without affecting code functionality"
          ),
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
        title: l10n.t("Git Commit Message: {0}", "Jira ID"),
        prompt: l10n.t("Optional"),
        placeholder: l10n.t("Fill in Jira ID"),
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
      title: l10n.t("Git Commit Message: {0}", l10n.t("Scope")),
      prompt: l10n.t("Optional"),
      placeholder: l10n.t("Fill in {0}", l10n.t("Scope")),
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
      title: l10n.t("Git Commit Message: {0}", l10n.t("Summary")),
      prompt: l10n.t("Required, no wrap"),
      placeholder: l10n.t("Fill in {0}", l10n.t("Summary")),
      ignoreFocusOut: true,
      value: state.summary || "",
      validate: async (text) =>
        text.trim().length === 0 ? l10n.t("Required") : undefined,
      shouldResume: shouldResume,
    });
    updateGitCommitMessage(state);
    return (input: MultiStepInput) => inputDetail(input, state);
  }

  async function inputDetail(input: MultiStepInput, state: Partial<State>) {
    state.detail = await input.showInputBox({
      step: 4 + (enableJira ? 1 : 0),
      totalSteps,
      title: l10n.t("Git Commit Message: {0}", l10n.t("Detail")),
      prompt: l10n.t("Optional, you can use \\n to wrap"),
      placeholder: l10n.t("Fill in {0}", l10n.t("Detail")),
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
      title: l10n.t("Git Commit Message: {0}", l10n.t("Breaking Change")),
      prompt: l10n.t("Optional, you can use \\n to wrap"),
      placeholder: l10n.t("Fill in {0}", l10n.t("Breaking Change")),
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
        title: l10n.t("Git Commit Message: {0}", l10n.t("Select Reporters")),
        placeholder: l10n.t("Select Reporters (multiple choice, optional)"),
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
        title: l10n.t("Git Commit Message: {0}", l10n.t("Select Reviewers")),
        placeholder: l10n.t("Select Reviewers (multiple choice, optional)"),
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
    return (input: MultiStepInput) => pickDone(input, state);
  }

  async function pickDone(input: MultiStepInput, state: Partial<State>) {
    while (true) {
      state.done = (await input.showQuickPick({
        step:
          6 +
          (enableJira ? 1 : 0) +
          (reporters.length ? 1 : 0) +
          (reviewers.length ? 1 : 0),
        totalSteps,
        title: l10n.t("Git Commit Message: {0}", l10n.t("Select Check / Done")),
        placeholder: l10n.t("Select Check / Done"),
        ignoreFocusOut: true,
        shouldResume: shouldResume,
        items: [
          {
            label: `$(stop-circle) ${l10n.t("Check")}`,
            value: "Check",
            description: l10n.t(
              "Please check the Git change message, you can go back to modify it, and select done after confirmation"
            ),
          },
          {
            label: `$(pass) ${l10n.t("Done")}`,
            value: "Done",
            description: l10n.t("Selection done and then exit, goodbye"),
          },
        ],
      })) as QuickPickItemWithValue;
      if (state.done?.value === "Done") {
        break;
      }
    }
  }
}
