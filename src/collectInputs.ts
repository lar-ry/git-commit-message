import {
  workspace,
  extensions,
  window,
  QuickPickItem,
  l10n,
  QuickPickItemKind,
} from "vscode";
import { MultiStepInput } from "./multiStepInput";
import { i18n } from "./i18n";
import { renderString } from "nunjucks";

export async function collectInputs() {
  type QuickPickItemWithValue = QuickPickItem & {
    value: string;
    name?: string;
    email?: string;
  };

  interface State {
    type: string;
    typeItem: QuickPickItemWithValue;
    jiraId: string;
    scope: string;
    summary: string;
    detail: string;
    breakingChange: string;
    reporters: QuickPickItemWithValue[];
    reviewers: QuickPickItemWithValue[];
    done: QuickPickItemWithValue;
  }

  function shouldResume() {
    // Could show a notification with the option to resume.
    return new Promise<boolean>((_resolve, _reject) => {
      // noop
    });
  }

  // Get the git extension
  const gitExtension = extensions.getExtension("vscode.git")?.exports;
  if (!gitExtension) {
    return window.showErrorMessage(l10n.t("Git extension not activated"));
  }
  const git = gitExtension.getAPI(1);
  const repo = git.repositories[0];
  if (!repo) {
    return window.showErrorMessage(l10n.t("No git repository found"));
  }

  const config = workspace.getConfiguration("gitCommitMessage");
  let totalSteps = 6;
  totalSteps += config.jira.enable ? 1 : 0;
  totalSteps += config.reporters.length ? 1 : 0;
  totalSteps += config.reviewers.length ? 1 : 0;
  const state = {} as Partial<State>;
  await MultiStepInput.run((input) => pickType(input, state));
  return state as State;

  function updateGitCommitMessage(state: Partial<State>) {
    repo.inputBox.value = renderString(
      config.template?.join?.("\n") ?? config.template,
      {
        type: state?.type ?? "",
        scope: state?.scope ?? "",
        summary: state?.summary ?? "",
        detail: state?.detail?.replaceAll(/&#92;n/g, "\n"),
        breakingChange: state?.breakingChange?.replaceAll(/&#92;n/g, "\n"),
        reporters: state?.reporters ?? [],
        reviewers: state?.reviewers ?? [],
        jira: { ...config.jira, id: state?.jiraId ?? "" },
        signer: config.signer,
        BREAKING_CHANGE: i18n[config.language].breakingChange,
        Reporter: i18n[config.language].reporter,
        Reviewer: i18n[config.language].reviewer,
        Signer: i18n[config.language].signer,
      }
    )
      ?.replaceAll(/^\n+/g, "")
      ?.replaceAll(/&#92;n/g, "\n")
      ?.replaceAll(/\n{3,}/g, "\n\n")
      ?.replaceAll(/\n+$/g, "");
  }

  async function pickType(input: MultiStepInput, state: Partial<State>) {
    const items: QuickPickItemWithValue[] = [
      {
        label: `$(rocket) ${l10n.t("perf")}`,
        value: i18n[config.language].perf,
        description: l10n.t("Code or feature optimization, deletion"),
      },
      {
        label: `$(sparkle) ${l10n.t("feat")}`,
        value: i18n[config.language].feat,
        description: l10n.t("Support for new features"),
      },
      {
        label: `$(bug) ${l10n.t("fix")}`,
        value: i18n[config.language].fix,
        description: l10n.t("Bug fixes"),
      },
      {
        label: `$(discard) ${l10n.t("revert")}`,
        value: i18n[config.language].revert,
        description: l10n.t(
          "Revert code, restore the previous version of the code"
        ),
      },
      {
        label: `$(jersey) ${l10n.t("style")}`,
        value: i18n[config.language].style,
        description: l10n.t("Modify only style files"),
      },
      {
        label: `$(lightbulb) ${l10n.t("refactor")}`,
        value: i18n[config.language].refactor,
        description: l10n.t(
          "Refactor code to fix issues, support new features, or optimize performance"
        ),
      },
      {
        label: l10n.t("Without affecting code functionality"),
        kind: QuickPickItemKind.Separator,
        description: "",
        value: "",
      },
      {
        label: `$(book) ${l10n.t("docs")}`,
        value: i18n[config.language].docs,
        description: l10n.t("Modify only documentation files"),
      },
      {
        label: `$(bookmark) ${l10n.t("release")}`,
        value: i18n[config.language].release,
        description: l10n.t("Modify only release files, such as version notes"),
      },
      {
        label: `$(beaker) ${l10n.t("test")}`,
        value: i18n[config.language].test,
        description: l10n.t("Modify only test files"),
      },
      {
        label: `$(play) ${l10n.t("build")}`,
        value: i18n[config.language].build,
        description: l10n.t("Modify only build files"),
      },
      {
        label: `$(sync) ${l10n.t("ci")}`,
        value: i18n[config.language].ci,
        description: l10n.t(
          "Modify only continuous integration configuration files"
        ),
      },
    ];
    if (Object.keys(config.customTypes)?.length) {
      items.push(
        {
          label: l10n.t("Custom"),
          kind: QuickPickItemKind.Separator,
          description: "",
          value: "",
        },
        ...Object.keys(config.customTypes)?.map((label) => ({
          label,
          value: label,
          description: config.customTypes[label],
        }))
      );
    }
    items.push(
      {
        label: l10n.t("Not selected"),
        kind: QuickPickItemKind.Separator,
        description: "",
        value: "",
      },
      {
        label: `$(circle-slash)`,
        value: "",
        description: l10n.t("Not selected"),
      }
    );
    state.typeItem = (await input.showQuickPick({
      step: 1,
      totalSteps,
      title: l10n.t("Git Commit Message: {0}", l10n.t("Select Type")),
      placeholder: l10n.t("Select Type (single choice, required)"),
      ignoreFocusOut: true,
      activeItem: state.typeItem,
      shouldResume: shouldResume,
      items,
    })) as QuickPickItemWithValue;
    state.type = state.typeItem?.value ?? "";
    updateGitCommitMessage(state);
    return (input: MultiStepInput) => inputJira(input, state);
  }

  async function inputJira(input: MultiStepInput, state: Partial<State>) {
    if (config.jira.enable) {
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
      step: 2 + (config.jira.enable ? 1 : 0),
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
      step: 3 + (config.jira.enable ? 1 : 0),
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
      step: 4 + (config.jira.enable ? 1 : 0),
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
      step: 5 + (config.jira.enable ? 1 : 0),
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
    if (config.reporters?.length) {
      state.reporters = (await input.showQuickPick({
        step: 6 + (config.jira.enable ? 1 : 0),
        totalSteps,
        title: l10n.t("Git Commit Message: {0}", l10n.t("Select Reporters")),
        placeholder: l10n.t("Select Reporters (multiple choice, optional)"),
        ignoreFocusOut: true,
        canSelectMany: true,
        selectedItems: state.reporters,
        shouldResume: shouldResume,
        items: config.reporters?.map(
          (x: { name: string; email: string; picked: boolean }) => ({
            label: `$(report) ${x.name}`,
            description: x.email,
            picked: x.picked,
            name: x.name,
            email: x.email,
          })
        ),
      })) as QuickPickItemWithValue[];
      updateGitCommitMessage(state);
    }
    return (input: MultiStepInput) => pickReviewers(input, state);
  }

  async function pickReviewers(input: MultiStepInput, state: Partial<State>) {
    if (config.reviewers?.length) {
      state.reviewers = (await input.showQuickPick({
        step:
          6 + (config.jira.enable ? 1 : 0) + (config.reporters.length ? 1 : 0),
        totalSteps,
        title: l10n.t("Git Commit Message: {0}", l10n.t("Select Reviewers")),
        placeholder: l10n.t("Select Reviewers (multiple choice, optional)"),
        ignoreFocusOut: true,
        canSelectMany: true,
        selectedItems: state.reviewers,
        shouldResume: shouldResume,
        items: config.reviewers?.map(
          (x: { name: string; email: string; picked: boolean }) => ({
            label: `$(code-review) ${x.name}`,
            description: x.email,
            picked: x.picked,
            name: x.name,
            email: x.email,
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
          (config.jira.enable ? 1 : 0) +
          (config.reporters.length ? 1 : 0) +
          (config.reviewers.length ? 1 : 0),
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
              "Please check the git change message, you can go back to modify it, and select done after confirmation"
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
