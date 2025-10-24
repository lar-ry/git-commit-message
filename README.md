# Git Commit Message

这是一个 VS Code 扩展，用于快速生成固定格式的 Git 提交说明

## 功能

- 快速生成固定格式的 Git 提交说明

## 使用方法

1. 安装扩展
2. 打开 VS Code
3. 按照提示或使用命令面板运行扩展 `Git Commit Message`

### 中文

```
优化[PROJECT-1234].范围: 摘要

详情

破坏性变更: 破坏性变更

[PROJECT-1234]: https://jira.sample.com/browse/PROJECT-1234

报告人: Reporter <reporter@sample.com>

审阅人: Reviewer <reviewer@sample.com>

提交人: Signer <signer@sample.com>
```

### 英文

```
perf[PROJECT-1234].range: summary

detail

BREAKING_CHANGE: break change

[PROJECT-1234]: https://jira.sample.com/browse/PROJECT-1234

Reported-by: Reporter <reporter@sample.com>

Reviewed-by: Reviewer <reviewer@sample.com>

Signed-off-by: Signer <signer@sample.com>
```

## 设置

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
