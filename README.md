# Git Commit Message - Git 提交说明

Quickly edit git commit message using a fixed format
快速生成固定格式的 Git 提交说明

## Usage - 使用方法

Run `Git Commit Message` from the command palette
or
Click the pencil icon in the upper right corner of the repository changed message input box.

使用命令面板运行 `Git Commit Message` 或点击仓库更改消息输入框右上角的铅笔图标按键

### Example in English

```
perf[PROJECT-1234]scope: summary

detail

BREAKING_CHANGE: break change

[PROJECT-1234]: https://jira.sample.com/browse/PROJECT-1234

Reported-by: Reporter <reporter@sample.com>

Reviewed-by: Reviewer <reviewer@sample.com>

Signed-off-by: Signer <signer@sample.com>
```

### 中文示例

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

```json
{
  "gitCommitMessage.language": "zh-CN",
  "gitCommitMessage.enableJira": true,
  "gitCommitMessage.reviewers": [
    { "name": "Reviewer", "email": "reviewer@sample.com", "picked": true }
  ],
  "gitCommitMessage.reporters": [
    { "name": "Reporter", "email": "reporter@sample.com", "picked": true }
  ],
  "gitCommitMessage.jiraPrefix": "PROJECT-",
  "gitCommitMessage.jiraUrl": "https://jira.sample.com/browse/",
  "gitCommitMessage.signerEmail": "signer@sample.com",
  "gitCommitMessage.signerName": "Signer"
}
```
