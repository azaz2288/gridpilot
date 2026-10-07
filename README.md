# GridPilot · 浏览器大表格工作台

**v0.1 可运行纵向功能版**。React/TypeScript/Web Worker实现本机CSV浏览、过滤、稳定排序、键盘选格、编辑/撤销/重做与安全导出。实际生成10万行示例，虚拟行表格避免把所有单元格塞进DOM。

## 运行与验证

需要Node24+；React19、TypeScript5、esbuild构建，Node原生测试。全部解析数据留在浏览器，不依赖分析后端。

```sh
npm ci
npm test
npm run build
npm run preview
# http://127.0.0.1:8782，点击加载10万行原创示例
```

## 工程证据与边界

[设计与语义](docs/DESIGN.md) · [已实现和后续验收](docs/ROADMAP.md) · [验证记录](docs/PROGRESS.md) · [面试演示](docs/INTERVIEW.md)

所有示例明确为原创合成数据，测试不读取私人资料。本机首版不等于公网生产系统。
