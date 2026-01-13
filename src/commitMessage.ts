import {
  workspace,
  extensions,
  window,
  QuickPickItem,
  l10n,
  QuickPickItemKind,
  commands,
  Uri,
  ExtensionContext,
  ThemeIcon,
} from "vscode";
import { MultiStepInput } from "./multiStepInput";
import { renderString } from "nunjucks";

async function getI18n(context: ExtensionContext, language?: string) {
  if (language && language !== "en") {
    const uri = Uri.file(
      `${context.extensionPath}/l10n/bundle.l10n.${language}.json`
    );
    const content = await workspace.fs.readFile(uri);
    return JSON.parse(Buffer.from(content).toString("utf8"));
  }
  return null;
}

function getRepo() {
  // Get the git extension
  const gitExtension = extensions.getExtension("vscode.git")?.exports;
  if (!gitExtension) {
    window.showErrorMessage(l10n.t("Git extension not activated"));
    return null;
  }
  const repo = gitExtension.getAPI(1).repositories[0];
  if (!repo) {
    window.showErrorMessage(l10n.t("No git repository found"));
    return null;
  }
  return repo;
}

function parseLabel(label: string): {
  icon?: string;
  text: string;
} {
  const match = label.match(/^\$\(([^)]+)\)\s*(.*)$/);
  if (!match) {
    return {
      text: label.trim(),
    };
  }
  return {
    icon: match[1],
    text: match[2].trim(),
  };
}
export async function edit(context: ExtensionContext) {
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
    scopeItem: QuickPickItemWithValue;
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

  const repo = getRepo();
  if (!repo) {
    return;
  }

  const config = workspace.getConfiguration("gitCommitMessage");

  // Get i18n, use function `t(message)` to translate
  const i18n = await getI18n(context, config.language);
  function t(message: string) {
    if (i18n) {
      return i18n?.[message] ?? message;
    } else {
      return message;
    }
  }

  let totalSteps = 6;
  totalSteps += config.jira.enable ? 1 : 0;
  totalSteps += config.reporters.length ? 1 : 0;
  totalSteps += config.reviewers.length ? 1 : 0;
  const state = {} as Partial<State>;
  await MultiStepInput.run((input) => inputJira(input, state));
  return state as State;

  function updateGitCommitMessage(state: Partial<State>) {
    const templates = {
      general: [
        "{% if scope %}",
        "{% if jira.id %}[{{ jira.prefix }}{{ jira.id }}] {% endif %}{{ type }}({{ scope }}): {{ summary }}",
        "{% elif type %}",
        "{% if jira.id %}[{{ jira.prefix }}{{ jira.id }}] {% endif %}{{ type }}: {{ summary }}",
        "{% else %}",
        "{% if jira.id %}[{{ jira.prefix }}{{ jira.id }}] {% endif %}{{ summary }}",
        "{% endif %}",
        "",
        "{{ detail }}",
        "",
        "{% if breakingChange %}",
        "{{ BREAKING_CHANGE }}: {{ breakingChange }}",
        "{% endif %}",
        "",
        "{% if jira.enable and jira.url and jira.id %}",
        "[{{ jira.prefix }}{{ jira.id }}]: {{ jira.url }}{{ jira.prefix }}{{ jira.id }}",
        "{% endif %}",
        "",
        "{% for reporter in reporters -%}",
        "{{ Reporter }}: {{ reporter.name }} <{{ reporter.email }}>",
        "{% endfor %}",
        "",
        "{% for reviewer in reviewers -%}",
        "{{ Reviewer }}: {{ reviewer.name }} <{{ reviewer.email }}>",
        "{% endfor %}",
        "",
        "{% if signer.name or signer.email %}",
        "{{ Signer }}: {{ signer.name }} <{{ signer.email }}>",
        "{% endif %}",
      ],
      legacy: [
        "{% if jira.id %}",
        "{{ type }}[{{ jira.prefix }}{{ jira.id }}]{{ scope }}: {{ summary }}",
        "{% elif type and scope %}",
        "{{ type }}.{{ scope }}: {{ summary }}",
        "{% elif type or scope %}",
        "{{ type }}{{ scope }}: {{ summary }}",
        "{% else %}",
        "{{ summary }}",
        "{% endif %}",
        "",
        "{{ detail }}",
        "",
        "{% if breakingChange %}",
        "{{ BREAKING_CHANGE }}: {{ breakingChange }}",
        "{% endif %}",
        "",
        "{% if jira.enable and jira.url and jira.id %}",
        "[{{ jira.prefix }}{{ jira.id }}]: {{ jira.url }}{{ jira.prefix }}{{ jira.id }}",
        "{% endif %}",
        "",
        "{% for reporter in reporters -%}",
        "{{ Reporter }}: {{ reporter.name }} <{{ reporter.email }}>",
        "{% endfor %}",
        "",
        "{% for reviewer in reviewers -%}",
        "{{ Reviewer }}: {{ reviewer.name }} <{{ reviewer.email }}>",
        "{% endfor %}",
        "",
        "{% if signer.name or signer.email %}",
        "{{ Signer }}: {{ signer.name }} <{{ signer.email }}>",
        "{% endif %}",
      ],
      custom: config.template.custom,
    };
    repo.inputBox.value = renderString(
      (
        templates?.[config.template as keyof typeof templates] ??
        templates.general
      )?.join("\n"),
      {
        type: state?.type ?? "",
        scope: state?.scope ?? "",
        summary: state?.summary ?? "",
        detail: state?.detail?.replace(/&#92;n/g, "\n"),
        breakingChange: state?.breakingChange?.replace(/&#92;n/g, "\n"),
        reporters: state?.reporters ?? [],
        reviewers: state?.reviewers ?? [],
        jira: { ...config.jira, id: state?.jiraId ?? "" },
        signer: config.signer,
        BREAKING_CHANGE: t("BREAKING_CHANGE"),
        Reporter: t("Reported-by"),
        Reviewer: t("Reviewed-by"),
        Signer: t("Signed-off-by"),
      }
    )
      ?.replace(/^\n+/g, "")
      ?.replace(/&#92;n/g, "\n")
      ?.replace(/\n{3,}/g, "\n\n")
      ?.replace(/\n+$/g, "");
  }

  async function inputJira(input: MultiStepInput, state: Partial<State>) {
    if (config.jira.enable) {
      state.jiraId = await input.showInputBox({
        step: 1,
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
    return (input: MultiStepInput) => pickType(input, state);
  }
  async function pickType(input: MultiStepInput, state: Partial<State>) {
    const items: QuickPickItemWithValue[] = [
      {
        label: l10n.t("perf"),
        value: t("perf"),
        description: l10n.t("Code or feature optimization, deletion"),
        iconPath: new ThemeIcon("zap"),
      },
      {
        label: l10n.t("feat"),
        value: t("feat"),
        description: l10n.t("Support for new features"),
        iconPath: new ThemeIcon("sparkle"),
      },
      {
        label: l10n.t("fix"),
        value: t("fix"),
        description: l10n.t("Bug fixes"),
        iconPath: new ThemeIcon("bug"),
      },
      {
        label: l10n.t("revert"),
        value: t("revert"),
        description: l10n.t(
          "Revert code, restore the previous version of the code"
        ),
        iconPath: new ThemeIcon("discard"),
      },
      {
        label: l10n.t("style"),
        value: t("style"),
        description: l10n.t("Modify only style files"),
        iconPath: new ThemeIcon("jersey"),
      },
      {
        label: l10n.t("refactor"),
        value: t("refactor"),
        description: l10n.t(
          "Refactor code to fix issues, support new features, or optimize performance"
        ),
        iconPath: new ThemeIcon("lightbulb"),
      },
      {
        label: l10n.t("Without affecting code functionality"),
        kind: QuickPickItemKind.Separator,
        description: "",
        value: "",
      },
      {
        label: l10n.t("docs"),
        value: t("docs"),
        description: l10n.t("Modify only documentation files"),
        iconPath: new ThemeIcon("book"),
      },
      {
        label: l10n.t("release"),
        value: t("release"),
        description: l10n.t("Modify only release files, such as version notes"),
        iconPath: new ThemeIcon("bookmark"),
      },
      {
        label: l10n.t("test"),
        value: t("test"),
        description: l10n.t("Modify only test files"),
        iconPath: new ThemeIcon("beaker"),
      },
      {
        label: l10n.t("build"),
        value: t("build"),
        description: l10n.t("Modify only build files"),
        iconPath: new ThemeIcon("play"),
      },
      {
        label: l10n.t("chore"),
        value: t("chore"),
        description: l10n.t("Modify only non-functional files"),
        iconPath: new ThemeIcon("symbol-misc"),
      },
      {
        label: l10n.t("ci"),
        value: t("ci"),
        description: l10n.t(
          "Modify only continuous integration configuration files"
        ),
        iconPath: new ThemeIcon("sync"),
      },
    ];
    if (Object.keys(config.customTypes)?.length) {
      items.push(
        {
          label: l10n.t("Custom options"),
          kind: QuickPickItemKind.Separator,
          description: "",
          value: "",
        },
        ...Object.keys(config.customTypes)?.map((label) => {
          const { text, icon } = parseLabel(config.customTypes[label]);
          return {
            label,
            value: label,
            description: text,
            iconPath: new ThemeIcon(icon || "blank"),
          };
        })
      );
    }
    if (state.type && !items.map((x) => x.value).includes(state.type)) {
      items.push(
        {
          label: l10n.t("Custom input"),
          kind: QuickPickItemKind.Separator,
          description: "",
          value: "",
        },
        {
          label: state.type,
          description: l10n.t("Custom input"),
          value: state.type,
          iconPath: new ThemeIcon("pencil"),
        }
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
        label: "",
        value: "",
        description: l10n.t("Not selected"),
        iconPath: new ThemeIcon("circle-slash"),
      }
    );
    state.typeItem = (await input.showQuickPick({
      step: 1 + (config.jira.enable ? 1 : 0),
      totalSteps,
      title: l10n.t("Git Commit Message: {0}", l10n.t("Select Type")),
      placeholder: l10n.t("Select Type (single choice, fillable)"),
      ignoreFocusOut: true,
      activeItem: state.typeItem,
      shouldResume: shouldResume,
      items,
    })) as QuickPickItemWithValue;
    state.type = state.typeItem?.value ?? "";
    updateGitCommitMessage(state);
    return (input: MultiStepInput) => pickScope(input, state);
  }

  async function pickScope(input: MultiStepInput, state: Partial<State>) {
    const items: QuickPickItemWithValue[] = [
      {
        label: l10n.t("config"),
        value: t("config"),
        description: l10n.t("config"),
        iconPath: new ThemeIcon("settings"),
      },
      {
        label: l10n.t("display"),
        value: t("display"),
        description: l10n.t("display"),
        iconPath: new ThemeIcon("symbol-color"),
      },
      {
        label: l10n.t("system"),
        value: t("system"),
        description: l10n.t("system"),
        iconPath: new ThemeIcon("gear"),
      },
    ];
    if (Object.keys(config.customScopes)?.length) {
      items.push(
        {
          label: l10n.t("Custom options"),
          kind: QuickPickItemKind.Separator,
          description: "",
          value: "",
        },
        ...Object.keys(config.customScopes)?.map((label) => {
          const { text, icon } = parseLabel(config.customScopes[label]);
          return {
            label,
            value: label,
            description: text,
            iconPath: new ThemeIcon(icon || "blank"),
          };
        })
      );
    }
    if (state.scope && !items.map((x) => x.value).includes(state.scope)) {
      items.push(
        {
          label: l10n.t("Custom input"),
          kind: QuickPickItemKind.Separator,
          description: "",
          value: "",
        },
        {
          label: state.scope,
          description: l10n.t("Custom input"),
          value: state.scope,
          iconPath: new ThemeIcon("pencil"),
        }
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
        label: "",
        value: "",
        description: l10n.t("Not selected"),
        iconPath: new ThemeIcon("circle-slash"),
      }
    );
    state.scopeItem = (await input.showQuickPick({
      step: 2 + (config.jira.enable ? 1 : 0),
      totalSteps,
      title: l10n.t("Git Commit Message: {0}", l10n.t("Select Scope")),
      placeholder: l10n.t("Select Scope (single choice, fillable)"),
      ignoreFocusOut: true,
      activeItem: state.scopeItem,
      shouldResume: shouldResume,
      items,
    })) as QuickPickItemWithValue;
    state.scope = state.scopeItem?.value ?? "";
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
            label: l10n.t("Check"),
            kind: QuickPickItemKind.Separator,
            description: "",
            value: "",
          },
          {
            label: l10n.t("Check"),
            value: "Check",
            description: l10n.t(
              "Please check the change message, you can go back to modify it, and select done after confirmation"
            ),
            iconPath: new ThemeIcon("circle-large-outline"),
          },
          {
            label: l10n.t("Done"),
            kind: QuickPickItemKind.Separator,
            description: "",
            value: "",
          },
          {
            label: l10n.t("Done"),
            value: "Done",
            description: l10n.t("Selection done and then exit, goodbye"),
            iconPath: new ThemeIcon("pass-filled"),
          },
          {
            label: l10n.t("Done & Commit"),
            value: "Done & Commit",
            description: l10n.t(
              "Selection done & commit and then exit, goodbye"
            ),
            iconPath: new ThemeIcon("pass-filled"),
          },
          {
            label: l10n.t("Done & Stage All & Commit"),
            value: "Done & Stage All & Commit",
            description: l10n.t(
              "Selection done & stage all & commit and then exit, goodbye"
            ),
            iconPath: new ThemeIcon("pass-filled"),
          },
        ],
      })) as QuickPickItemWithValue;
      if (state.done?.value === "Done") {
        break;
      }
      if (state.done?.value === "Done & Commit") {
        await commands.executeCommand("git.commit", {
          message: repo.inputBox.value,
        });
        break;
      }
      if (state.done?.value === "Done & Stage All & Commit") {
        await commands.executeCommand("git.stageAll");
        await commands.executeCommand("git.commit", {
          message: repo.inputBox.value,
        });
        break;
      }
    }
  }
}

export async function clear() {
  const repo = getRepo();
  if (!repo) {
    return;
  }
  repo.inputBox.value = "";
}
