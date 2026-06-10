# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **人脸识别**: face-api.js (TensorFlow.js)
- **音视频**: WebRTC API

## 项目说明

本项目为**智能考勤系统 - 电子班牌**，集成了以下功能：

### 核心功能
1. **电子班牌界面** - 显示班级信息、日期时间、考勤统计
2. **人脸识别** - 使用 face-api.js 进行实时人脸检测与识别，含活体检测
3. **声纹识别** - 使用 Web Audio API 录制并分析声纹特征
4. **考勤打卡** - 支持上课打卡、下课打卡、请假、外出等多种考勤类型
5. **考勤记录** - 实时显示考勤历史记录
6. **请假审批** - 学生提交请假申请，教师审批
7. **考勤统计** - 教师端班级出勤率统计与可视化
8. **消息通知** - 公告、审批结果、考勤异常通知
9. **智能提醒** - 课程开始前提醒打卡
10. **考勤报告** - 个人考勤统计与趋势分析
11. **数据导出** - 考勤记录、学生数据的导入导出
12. **密码管理** - 修改密码、登录日志记录
13. **AI 助手** - 智能引导学生和教师使用系统

### 页面路由
| 路由 | 功能 |
|------|------|
| `/login` | 登录/注册页面 |
| `/registration` | 生物识别注册（人脸+声纹采集） |
| `/student` | 学生端首页 |
| `/checkin` | 考勤打卡页面 |
| `/teacher` | 教师端首页 |

### 技术特点
- 遵循 WebRTC 规范，正确处理摄像头和麦克风
- Hydration 安全，避免服务端/客户端渲染不一致
- 模型文件位于 `/public/models/` 目录
- 响应式设计，支持各种屏幕尺寸

## 目录结构

```
├── public/                 # 静态资源
│   └── models/             # face-api.js 模型文件
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── login/         # 登录注册
│   │   ├── registration/   # 生物识别注册
│   │   ├── checkin/       # 考勤打卡
│   │   ├── student/       # 学生端页面
│   │   └── teacher/       # 教师端页面
│   ├── components/
│   │   ├── ui/            # Shadcn UI 组件库
│   │   ├── attendance/    # 考勤组件
│   │   ├── notifications/ # 通知组件
│   │   ├── reminder/      # 提醒组件
│   │   ├── report/        # 报告组件
│   │   ├── settings/      # 设置组件
│   │   └── assistant/     # AI助手组件
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具库
│   │   ├── utils.ts       # 通用工具函数 (cn)
│   │   ├── sharedData.ts  # 数据共享与存储
│   │   └── userUtils.ts   # 用户工具函数
│   └── types/             # 类型定义
├── next.config.ts         # Next.js 配置
├── package.json           # 项目依赖管理
└── tsconfig.json          # TypeScript 配置
```

### 组件说明

| 组件 | 功能 |
|------|------|
| AttendanceHeader | 顶部导航栏，显示班级信息、日期时间、考勤统计 |
| FaceRecognition | 人脸识别，含活体检测（正视+眨眼）、摄像头采集 |
| VoiceRecognition | 声纹识别，含声纹录制、口令验证 |
| AttendancePanel | 考勤操作面板，选择考勤类型并完成打卡 |
| AttendanceList | 考勤记录列表，显示历史考勤数据 |
| AttendanceStatsPanel | 考勤统计面板，含柱状图、饼图、学生明细 |
| LeaveRequestPanel | 请假申请面板 |
| LeaveApprovalPanel | 请假审批面板 |
| NotificationCenter | 消息通知中心 |
| SmartReminderPanel | 智能提醒面板 |
| AttendanceReport | 个人考勤报告 |
| ChangePasswordModal | 密码修改弹窗 |
| LoginLogsPanel | 登录日志面板 |
| DataExportPanel | 数据导出面板 |
| AIAssistant | AI 智能助手组件 |

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## 预览链路配置

### 工作区与项目目录

- **工作区根目录**：`/workspace/projects`
- **技术项目根目录**：`/workspace/projects/projects`（子目录形式）
- **根 `.coze`**：`/workspace/projects/.coze`
- **子项目 `.coze`**：`/workspace/projects/projects/.coze`

### 预览链路

| 阶段 | 入口脚本 | 说明 |
|------|----------|------|
| build | `/workspace/projects/scripts/coze-preview-build.sh` | 安装依赖 |
| run | `/workspace/projects/scripts/coze-preview-run.sh` | 启动 Next.js dev server |

### 端口约束

- 预览服务绑定 **5000 端口**，监听 `0.0.0.0:5000`（IPv4 全接口）
- 禁止使用或清理 9000 端口

### 注意事项

- Python 后端服务（人脸识别、声纹识别）独立运行，预览时 API 调用会返回 503，但不影响前端页面访问
- 项目使用 Next.js 16 + React 19 + TypeScript，默认 `pnpm` 管理依赖

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**
