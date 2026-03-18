export type TemplateType = 
  | 'classic' 
  | 'modern' 
  | 'minimal' 
  | 'bold' 
  | 'sidebar' 
  | 'compact' 
  | 'elegant' 
  | 'tech' 
  | 'creative' 
  | 'executive';

export interface ContentState {
  markdown: string;
  template: TemplateType;
  theme: string;
}

export interface Version {
  id: string;
  timestamp: number;
  content: string;
  name: string;
}

export const DEFAULT_MARKDOWN = `# 荣陶胜
## 高级前端工程师 | Frontend Systems
📍 杭州 | 📧 1005410788@qq.com | 📱 18626891229

### 个人简介
9+ 年软件开发经验，专注复杂交互系统与数据密集型应用开发，具有工业系统与平台产品开发经验。

---

### 技术亮点
- **9+ 年软件开发经验**，专注复杂交互系统与平台型产品开发
- 参与 **储能系统与边缘设备开发 (Flutter + Rust)**，实现高并发设备数据采集与工业可视化
- 参与开发 **数据库 IDE 工具平台**，支持多数据库 SQL 解析、智能提示与语法校验
- 设计 **数据密集型交互系统**，用于数据库数据管理与工业采集点批量编辑
- 使用 **WASM / Rust** 优化数据计算性能，提升数据密集型界面处理效率
- 开发 **AI Agent** 工具体系，构建 Skills 工具并通过 MCP 协议接入储能系统设备能力

---

### 工作经历

#### **高级前端开发工程师** @ 某科技公司 (2020 - 至今)
- 负责核心工业监控系统的架构设计与开发，支撑万级设备实时数据展示。
- 推动前端工程化建设，引入自动化测试与 CI/CD 流程，提升交付质量。

#### **前端开发工程师** @ 某互联网公司 (2016 - 2020)
- 参与大型电商平台后台管理系统的开发，优化海量数据表格的渲染性能。
- 独立负责多个内部工具链的从零到一构建。

### 教育背景
**计算机科学与技术** | 某知名大学 (2012 - 2016)

### 专业技能
- **语言:** TypeScript, Rust, Go, SQL
- **框架:** React, Vue, Flutter, Node.js
- **工具:** Docker, Kubernetes, Git, Figma
`;

export const TEMPLATES = [
  { id: 'classic', name: 'Classic Serif', icon: 'FileText', thumb: 'https://picsum.photos/seed/classic/400/560' },
  { id: 'modern', name: 'Modern Sans', icon: 'Layout', thumb: 'https://picsum.photos/seed/modern/400/560' },
  { id: 'minimal', name: 'Minimalist', icon: 'Type', thumb: 'https://picsum.photos/seed/minimal/400/560' },
  { id: 'bold', name: 'Bold Accent', icon: 'Zap', thumb: 'https://picsum.photos/seed/bold/400/560' },
  { id: 'sidebar', name: 'Split Sidebar', icon: 'Columns', thumb: 'https://picsum.photos/seed/sidebar/400/560' },
  { id: 'compact', name: 'Compact Info', icon: 'Minimize2', thumb: 'https://picsum.photos/seed/compact/400/560' },
  { id: 'elegant', name: 'Elegant Gold', icon: 'Palette', thumb: 'https://picsum.photos/seed/elegant/400/560' },
  { id: 'tech', name: 'Tech Mono', icon: 'Code', thumb: 'https://picsum.photos/seed/tech/400/560' },
  { id: 'creative', name: 'Creative Play', icon: 'Sparkles', thumb: 'https://picsum.photos/seed/creative/400/560' },
  { id: 'executive', name: 'Executive', icon: 'Shield', thumb: 'https://picsum.photos/seed/executive/400/560' },
] as const;
