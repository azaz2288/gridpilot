# 设计与正确性边界

Worker持有解析数据并计算视图行ID，main线程保留数据以渲染/导出。请求递增id抑制过期load/view响应；搜索120ms合并，worker并不抢占正在执行的旧请求。固定44px行高、可视区±5行overscan，水平列全部渲染（最多200列），不是双向虚拟化。ResizeObserver跟随视口，键盘移动滚动到选中行。

严格CSV状态机支持BOM、CRLF、quoted comma/newline、double quote。重复/空表头、ragged rows、非闭合引号/闭合后杂字符拒绝。32MiB文件、10万数据行、200列、单格1MiB字符。UTF-8 TextDecoder fatal拒绝坏字节。解析只在线程内，所有数据留浏览器内存，不发分析服务器。数据拷贝到worker与main，32MiB上限不是进程RSS上限。

行ID不随排序变化，编辑按原row/col操作，撤销100步，筛选/排序会重新计算视图。升降序稳定tie，数值非数值/空值永远置尾并保留原顺序。导出当前过滤/排序视图，所有公式前缀=+@-加单引号，明确改变危险字符串，非无损输出。关闭页面丢失未导出编辑；未实现IndexedDB/PWA/协作/大文件流式。esbuild分别打包React主入口与独立Worker，TypeScript严格检查，Node原生test验证CSV。回环静态预览器只公开四个固定产物并校验Host；静态build可部署可信网站，预览器不是生产服务器。
