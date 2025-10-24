![install](https://img.shields.io/badge/en-English-blue)
![install](https://img.shields.io/badge/zh--cn-中文-red)
![install](https://img.shields.io/visual-studio-marketplace/v/larry-lan.git-commit-message)

<!-- ![install](https://img.shields.io/visual-studio-marketplace/release-date/larry-lan.git-commit-message) -->
<!-- ![install](https://img.shields.io/visual-studio-marketplace/last-updated/larry-lan.git-commit-message) -->
<!-- ![install](https://img.shields.io/visual-studio-marketplace/d/larry-lan.git-commit-message) -->
<!-- ![install](https://img.shields.io/visual-studio-marketplace/i/larry-lan.git-commit-message) -->
<!-- ![install](https://img.shields.io/visual-studio-marketplace/r/larry-lan.git-commit-message) -->

# Git Commit Message - Git 提交说明

Generate a fixed-format git commit message from a custom template

由自定义模板生成固定格式的 git 提交说明

## Quick Start - 使用方法

Run `Git Commit Message` from the command palette or click the edit button in the upper right corner of the repository changed message input box

使用命令面板运行 `Git Commit Message` 或点击仓库更改消息输入框右上角的编辑按键

![Demo](https://github.com/lar-ry/git-commit-message/raw/HEAD/assets/demo.gif)

The hover details of the commits in the git graph are as follows. Clicking on the issue link will take you to the configured Jira issue details page

Git 图形中提交的悬浮详细信息如下, 点击问题单链接可以跳转到配置的 Jira 问题详情页面

![Detail](https://github.com/lar-ry/git-commit-message/raw/HEAD/assets/detail.png)

## Example in English

```
perf[PROJECT-1234]scope: summary

detail

BREAKING_CHANGE: breaking change

[PROJECT-1234]: https://jira.sample.com/browse/PROJECT-1234

Reported-by: Reporter <reporter@sample.com>

Reviewed-by: Reviewer <reviewer@sample.com>

Signed-off-by: Signer <signer@sample.com>
```

## 中文示例

```
优化[PROJECT-1234]范围: 摘要

详情

破坏性变更: 破坏性变更

[PROJECT-1234]: https://jira.sample.com/browse/PROJECT-1234

报告人: Reporter <reporter@sample.com>

审阅人: Reviewer <reviewer@sample.com>

提交人: Signer <signer@sample.com>
```

## Setting - 设置

- `customTypes`: Custom types - 自定义类型
- `jira.enable`: Jira enable - Jira 使能
- `jira.prefix`: Jira project prefix, only valid when Jira enable is picked - Jira 项目前缀, 仅在 Jira 使能启用时有效
- `jira.url`: Jira URL, only valid when Jira enable is picked - Jira URL, 仅在 Jira enable 使能启用时有效
- `language`: Commit message language - 提交说明语言
- `reporters`: Reporters - 报告人列表
  - `reporters[].email`: Reporter's email - 报告人邮箱
  - `reporters[].name`: Reporter's name - 报告人名字
  - `reporters[].picked`: Picked default - 是否默认勾选
- `reviewers`: Reviewers - 审阅人列表
  - `reviewers[].email`: Reviewer's email - 审阅人邮箱
  - `reviewers[].name`: Reviewer's name - 审阅人名字
  - `reviewers[].picked`: Picked default - 是否默认勾选
- `signer.email`: Signer's email - 提交人邮箱
- `signer.name`: Signer's name - 提交人名字

```json
{
  "gitCommitMessage.language": "en",
  "gitCommitMessage.customTypes": {
    "customType": "custom type description"
  },
  "gitCommitMessage.jira.enable": true,
  "gitCommitMessage.jira.prefix": "PROJECT-",
  "gitCommitMessage.jira.url": "https://jira.sample.com/browse/",
  "gitCommitMessage.reporters": [
    { "name": "Reporter1", "email": "reporter1@sample.com", "picked": true },
    { "name": "Reporter2", "email": "reporter2@sample.com" }
  ],
  "gitCommitMessage.reviewers": [
    { "name": "Reviewer1", "email": "reviewer1@sample.com", "picked": true },
    { "name": "Reviewer2", "email": "reviewer2@sample.com" }
  ],
  "gitCommitMessage.signer.email": "signer@sample.com",
  "gitCommitMessage.signer.name": "Signer"
}
```

## Template - 模板

The template using the [Jinja2](https://palletsprojects.com/projects/jinja/) template language, implemented by [Nunjucks](https://mozilla.github.io/nunjucks/)

模板采用 [Jinja2](https://palletsprojects.com/projects/jinja/) 模板语言, 通过 [Nunjucks](https://mozilla.github.io/nunjucks/) 实现

```json
{
  "gitCommitMessage.template": [
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
    "{% endif %}"
  ]
}
```

If you need to customize it, you can configure a text line list. The complete template variable fields that was supported are provided below

如需自定义, 可配置一个文字行列表, 下面提供了已支持的所有模板变量字段

- Input - 输入
  - `type`: Type - 类型
  - `jira.id`: Jira ID - Jira ID
  - `scope`: Scope - 范围
  - `summary`: Summary - 摘要
  - `detail`: Detail - 详情
  - `breakingChange`: Breaking change - 破坏性变更
  - `reporters`: Reporters - 报告人列表
    - `reporters[].name`: Reporter's name - 报告人名字
    - `reporters[].email`: Reporter's email - 报告人邮箱
  - `reviewers`: Reviewers - 审阅人列表
    - `reviewers[].name`: Reviewer's name - 审阅人名字
    - `reviewers[].email`: Reviewer's email - 审阅人邮箱
- Setting - 配置
  - `jira.enable`: Jira enable - Jira 使能
  - `jira.prefix`: Jira prefix - Jira 项目前缀
  - `jira.url`: Jira URL - Jira URL
  - `signer.name`: Signer name - 报告人名字
  - `signer.email`: Signer email - 报告人邮箱
- Text - 文本
  - `BREAKING_CHANGE`: Text "BREAKING_CHANGE" - 文本 "破坏性变更"
  - `Reporter`: Text "Reporter" - 文本 "报告人"
  - `Reviewer`: Text "Reviewer" - 文本 "审阅人"
  - `Signer`: Text "Signer" - 文本 "提交人"
