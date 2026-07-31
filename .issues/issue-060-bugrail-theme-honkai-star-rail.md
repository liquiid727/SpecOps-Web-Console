# Add Bugrail theme (Honkai: Star Rail inspired)

## Description
增设特色主题 Bugrail，以崩坏：星穹铁道的色彩体系和视觉风格为灵感，构建一个多元化的深色主题配置。通过 CSS 变量覆盖实现主题切换，支持 Settings 中选择和 localStorage 持久化。

## Design

### Color System

| Token | Color | Usage |
|-------|-------|-------|
| --bg-base | #0D0D1A → #1A1A2E (gradient) | 应用背景 |
| --bg-panel | #1A1A2E | 面板/卡片背景 |
| --bg-subtle | #252540 | 悬停/选中态背景 |
| --border | #3D3D5C | 边框 |
| --accent | #6B5CE7 | 主强调色（星轨紫） |
| --accent-hover | #7D6FF0 | 强调色悬停态 |
| --accent-secondary | #F5A623 | 次强调色（金色点缀） |
| --text | #E8E8F0 | 主文字（星辉白） |
| --text-secondary | #9E9EB8 | 次要文字（银灰） |
| --text-tertiary | #6B6B8A | 辅助文字 |
| --success | #4CAF50 | 存护绿（命途色系） |
| --error | #FF5252 | 虚数红（命途色系） |
| --warning | #F5A623 | 金色警示 |
| --info | #4FC3F7 | 量子蓝（命途色系） |
| --running | #6B5CE7 | 运行态（智识紫） |

### Visual Effects
- **卡片边框**: `border-image: linear-gradient(135deg, #6B5CE7, #F5A623) 1` 微光渐变
- **按钮 Hover**: `background: linear-gradient(90deg, #6B5CE7, #4FC3F7)` 星轨流光
- **Sidebar**: subtle star field pattern (`radial-gradient` 点状装饰)
- **状态指示**: 命途色系区分不同状态
- **滚动条**: 自定义为半透明紫色

### Implementation

#### CSS 文件结构
```
client/styles/themes/
├── bugrail.css     ← 主题变量覆盖 + 特效
└── index.css       ← 主题注册入口
```

#### 主题激活方式
```css
/* bugrail.css */
[data-theme="bugrail"] {
  --bg-base: #0D0D1A;
  --bg-panel: #1A1A2E;
  /* ... 所有变量覆盖 ... */
}
```

#### JavaScript 激活
```typescript
// theme.tsx
function applyTheme(theme: "system" | "light" | "dark" | "bugrail") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("specos-theme", theme);
}
```

### Settings UI
SettingsView 增加 Theme section：
- 主题卡片网格预览（system / light / dark / bugrail）
- 当前主题高亮选中
- 实时预览切换效果

### Preferences Extension
```typescript
interface UiPreferencesV1 {
  // ... existing fields
  theme: "system" | "light" | "dark" | "bugrail";
}
```

## Acceptance Criteria
- [ ] 新增 `client/styles/themes/bugrail.css` 主题文件
- [ ] 主题通过 `data-theme="bugrail"` 属性激活
- [ ] 所有 CSS 变量正确覆盖（无遗漏导致白色元素）
- [ ] Settings 中可选择主题并实时预览
- [ ] 主题选择持久化到 localStorage
- [ ] 页面加载时恢复上次选择的主题（无闪烁）
- [ ] Bugrail 主题在所有视图中视觉一致
- [ ] 卡片渐变边框和按钮流光效果正常
- [ ] 对比度满足 WCAG AA 标准（文字可读性）
- [ ] 不影响其他主题的正常使用

## Affected Files
- `cli-gui/client/styles/themes/bugrail.css` (新建)
- `cli-gui/client/styles/themes/index.css` (新建/注册)
- `cli-gui/client/styles/index.css` (引入主题)
- `cli-gui/client/theme.tsx` (主题切换逻辑)
- `cli-gui/client/app/preferences.ts` (新增 theme 字段)
- `cli-gui/client/components/SettingsView.tsx` (Theme 选择 UI)

## Dependencies
None

## Type
feature / frontend / design

## Priority
low

## SPEC Reference
.features/product-enhancement-features/spec.md §5
