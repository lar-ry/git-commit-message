# gitCommitMessage

这是一个 VS Code 扩展，用于快速生成 Git 提交说明

## 功能

- 快速生成 Git 提交说明

## 使用方法

1. 安装扩展
2. 打开 VS Code
3. 按照提示或使用命令面板运行扩展 `Git Commit Message`

## 设置

```json
{
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
