/* 现代化学习站 - 全局功能层 xd-features.js
 * XD 命名空间：通用工具 + 事件总线 + 模块树(TREE) + 目录/面包屑渲染 + 学习进度
 *              + 测验引擎 + 错题本 + 成就系统 + 站内搜索
 * 页面使用约定：公共脚本以 defer 加载，页面内联脚本先于其执行，
 * 引用公共能力必须防御式判断 window.XD && XD.xxx（在 DOMContentLoaded 回调中使用最稳）。
 * localStorage 键统一 xd_ 前缀。
 *
 * 模块树约定：
 *   XD.TREE 是全站唯一结构来源。节点：{id, n:名称, d:描述, icon, children:[...]}
 *   - children 存在 → 该节点是"目录页"，文件 = id.html，页面 data-kind="dir"
 *   - 无 children   → 该节点是"内容页/测验/工具"，页面 data-kind="doc|quiz|tool"
 *   - 树深支持到 10 层，目录页与面包屑渲染均为递归实现
 */
(function () {
    var XD = window.XD = window.XD || {};

    function LS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
    function SS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

    /* ========== 通用工具 ========== */
    XD.showToast = function (msg, ms) {
        ms = ms || 2600;
        var t = document.getElementById('xdToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'xdToast';
            t.className = 'xd-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._tm);
        t._tm = setTimeout(function () { t.classList.remove('show'); }, ms);
    };
    XD.escapeHtml = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    };
    XD.fmtDate = function (d) {
        d = d || new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    };
    XD.download = function (fileName, text, mime) {
        try {
            var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
        } catch (e) {}
    };
    XD.copy = function (text, okMsg) {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                XD.showToast(okMsg || '已复制到剪贴板');
            }).catch(function () { fallbackCopy(text, okMsg); });
        } else { fallbackCopy(text, okMsg); }
        function fallbackCopy(t, m) {
            var ta = document.createElement('textarea');
            ta.value = t;
            ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { document.execCommand('copy'); XD.showToast(m || '已复制到剪贴板'); } catch (e) {}
            document.body.removeChild(ta);
        }
    };

    /* ========== 事件总线：同页直调 + 跨 tab（BroadcastChannel + storage 兜底） ========== */
    XD._evt = {};
    XD.on = function (type, cb) {
        (XD._evt[type] = XD._evt[type] || []).push(cb);
    };
    XD.emit = function (type, payload) {
        var list = XD._evt[type] || [];
        for (var i = 0; i < list.length; i++) { try { list[i](payload || {}); } catch (e) {} }
        try {
            new BroadcastChannel('xiandaihua').postMessage({ type: type, payload: payload || {}, at: Date.now() });
        } catch (e) {}
        try { localStorage.setItem('xd_evt_' + type, JSON.stringify({ payload: payload || {}, at: Date.now() })); } catch (e2) {}
    };
    try {
        var _xdBC = new BroadcastChannel('xiandaihua');
        _xdBC.onmessage = function (e) {
            var d = e.data || {};
            var list = XD._evt[d.type] || [];
            for (var i = 0; i < list.length; i++) { try { list[i](d.payload || {}); } catch (err) {} }
        };
    } catch (e) {}
    window.addEventListener('storage', function (e) {
        if (!e.newValue || !e.key || e.key.indexOf('xd_evt_') !== 0) return;
        var type = e.key.slice(7);
        var list = XD._evt[type] || [];
        try { var p = JSON.parse(e.newValue).payload; } catch (e2) { return; }
        for (var i = 0; i < list.length; i++) { try { list[i](p || {}); } catch (err) {} }
    });

    /* ============================================================
     * 模块树 XD.TREE（全站结构单一来源：目录页/搜索/sitemap/SW 都由它派生）
     * 文件名规则：id + '.html'。树深理论支持 10 层，渲染全部递归。
     * ============================================================ */
    XD.TREE = [
        { id: 'A', icon: '🖥️', n: '计算机基础', d: '认识计算机的构成：定义、硬件、软件、数据与编码', children: [
            { id: 'A1', n: '认识计算机', d: '定义、四步循环、简史与家族' },
            { id: 'A2', n: '硬件', d: '主板/CPU/内存/硬盘/显卡逐个拆解', children: [
                { id: 'A2-1', n: '主板与 CPU', d: '骨架与大脑：芯片组、主频、核心线程' },
                { id: 'A2-2', n: '内存', d: '临时工作台：容量、频率与卡顿的关系' },
                { id: 'A2-3', n: '硬盘与存储', d: '机械 vs 固态：给老电脑最划算的升级' },
                { id: 'A2-4', n: '显卡、电源与散热', d: '画面加工厂与隐形地基' },
                { id: 'A2-5', n: '接口速查与升级决策', d: 'USB/HDMI 认全 + "卡了换什么"决策表' }
            ]},
            { id: 'A3', n: '软件与操作系统', d: '系统干什么、各系统对比、驱动与装系统' },
            { id: 'A4', n: '数据与二进制', d: '一切信息都是 0 和 1', children: [
                { id: 'A4-1', n: '二进制与存储单位', d: 'bit/Byte、KB-MB-GB 换算、进制转换' },
                { id: 'A4-2', n: '字符编码', d: 'ASCII→Unicode→UTF-8，乱码的真相' },
                { id: 'A4-3', n: '图片与声音的数字化', d: '像素、采样与压缩' }
            ]},
            { id: 'A6', n: '鼠标练习器', d: '单击/双击/右键/拖拽专项训练', tool: 1 },
            { id: 'A5', n: '测验：计算机基础', d: '12 题结业测验', quiz: 'A' }
        ]},
        { id: 'B', icon: '🖱️', n: '电脑详细使用', d: '把 Windows 用得又快又稳：文件、软件、安全、排障', children: [
            { id: 'B1', n: 'Windows 使用总览', d: '桌面、窗口分屏、虚拟桌面、截图' },
            { id: 'B2', n: '文件与文件夹管理', d: '路径、扩展名、批量操作与整理原则' },
            { id: 'B3', n: '软件的安装与管理', d: '装对软件、卸干净软件、防捆绑' },
            { id: 'B4', n: '系统设置与安全', d: '更新、杀毒、防火墙与密码卫生' },
            { id: 'B5', n: '网络连接', d: 'WiFi、网线、热点、DNS 与网速排查' },
            { id: 'B6', n: '日常维护与故障排查', d: '卡顿/蓝屏/断网/备份的处置顺序' },
            { id: 'B7', n: '测验：电脑使用', d: '12 题结业测验', quiz: 'B' }
        ]},
        { id: 'C', icon: '🌐', n: '网络与服务器', d: '看懂网页背后的世界：网络、DNS、HTTP 与服务器', children: [
            { id: 'C1', n: '网络基础', d: '局域网、互联网与客户端-服务器模型' },
            { id: 'C2', n: 'IP、域名与 DNS', d: '互联网的门牌与电话簿' },
            { id: 'C3', n: '网页打开的全过程', d: '从回车到渲染：HTTP/状态码/HTTPS' },
            { id: 'C4', n: '服务器是什么', d: '机房、云、虚拟化与 Web 服务器软件' },
            { id: 'C5', n: '网站托管与 GitHub Pages', d: '静态/动态网站与免费托管' },
            { id: 'C6', n: '测验：网络与服务器', d: '10 题结业测验', quiz: 'C' }
        ]},
        { id: 'D', icon: '⌨️', n: '键盘与快捷键', d: '指法、速查与两只招牌练习器，让双手跟上思维', children: [
            { id: 'D1', n: '键盘全解', d: '布局分区、指法与坐姿' },
            { id: 'D2', n: '快捷键速查库', d: '可搜索的分场景快捷键手册', children: [
                { id: 'D2-1', n: 'Windows 系统速查', d: 'Win 键家族与窗口管理' },
                { id: 'D2-2', n: '浏览器与文本编辑速查', d: '标签页、缩放、选区操作' },
                { id: 'D2-3', n: '开发者与效率工具速查', d: '终端、VS Code、截图录入' }
            ]},
            { id: 'D3', n: '快捷键练习器', d: '招牌交互：真实按键判定训练', tool: 1 },
            { id: 'D4', n: '打字速度测试', d: '中英文测速、准确率与最佳记录', tool: 1 }
        ]},
        { id: 'E', icon: '🤖', n: '如何使用 AI', d: '从认知到驾驭：大模型、提示词工程与工具工作流', children: [
            { id: 'E1', n: 'AI 基础认知', d: '大模型是什么、能与不能、幻觉与核实' },
            { id: 'E2', n: '提示词工程', d: '把需求说清楚的五要素与迭代法' },
            { id: 'E3', n: 'AI 工具地图与工作流', d: '场景选型、隐私与版权边界' },
            { id: 'E4', n: '提示词实验室', d: '组装式提示词生成器', tool: 1 },
            { id: 'E6', n: 'AI 生活应用场景', d: '问路、做菜、带娃、看病：AI 天天用得上' },
            { id: 'E7', n: 'AI 使用安全与隐私', d: '别喂隐私、内容要核实、防 AI 新骗局' },
            { id: 'E5', n: '测验：如何使用 AI', d: '8 题结业测验', quiz: 'E' }
        ]},
        { id: 'F', icon: '🐙', n: 'Git 与 GitHub', d: '版本控制、Git 配置、把网页发布到 GitHub Pages', children: [
            { id: 'F1', n: '版本控制概念', d: '为什么需要给文件拍"快照"' },
            { id: 'F2', n: '安装与配置 Git', d: '下载安装与 git config 全流程' },
            { id: 'F3', n: 'Git 核心命令图解', d: 'init/add/commit/status/log/push/pull' },
            { id: 'F4', n: 'GitHub 入门', d: '注册、建仓、HTTPS/SSH 与 README' },
            { id: 'F5', n: '上传网页到 GitHub Pages 全流程', d: '从建仓到上线的手把手指南' },
            { id: 'F6', n: 'Git 命令演练场', d: '模拟终端闯关练习', tool: 1 },
            { id: 'F7', n: '测验：Git 与 GitHub', d: '10 题结业测验', quiz: 'F' }
        ]},
        { id: 'G', icon: '🛠️', n: '怎么开发网页', d: 'HTML/CSS/JS 三件套、调试工具与第一个上线项目', children: [
            { id: 'G1', n: '开发总览', d: '三件套分工、工具与文件组织' },
            { id: 'G2', n: 'HTML 入门', d: '标签、结构与第一个页面' },
            { id: 'G3', n: 'CSS 入门', d: '选择器、盒模型与布局' },
            { id: 'G4', n: 'JavaScript 入门', d: '变量、函数、事件与 DOM' },
            { id: 'G5', n: '调试与 F12 开发者工具', d: '元素、控制台与网络面板实战' },
            { id: 'G6', n: '实战：个人主页开发与发布', d: '毕业项目：从零写到上线' },
            { id: 'G7', n: '测验：怎么开发网页', d: '10 题结业测验', quiz: 'G' }
        ]},
        { id: 'H', icon: '📱', n: '手机与平板', d: '触屏、App、输入法与拍照：把智能手机用明白', children: [
            { id: 'H1', n: '触屏与手势基础', d: '开关机、锁屏与六大手势' },
            { id: 'H2', n: '桌面与 App 安装', d: '应用商店、安装授权与卸载整理' },
            { id: 'H3', n: '手写与语音输入', d: '不会拼音也能打字' },
            { id: 'H4', n: '拍照与相册', d: '对焦调光、相册管理与备份' },
            { id: 'H5', n: '设置、WiFi 与存储清理', d: '长辈模式、连网与手机瘦身' },
            { id: 'H6', n: '测验：手机与平板', d: '10 题结业测验', quiz: 'H' }
        ]},
        { id: 'I', icon: '💬', n: '微信与生活服务', d: '聊天、支付、出行与挂号：把生活服务搬进手机', children: [
            { id: 'I1', n: '微信入门', d: '注册登录、加好友与视频通话' },
            { id: 'I2', n: '微信进阶', d: '群聊、朋友圈与公众号' },
            { id: 'I3', n: '微信支付与红包', d: '绑卡、付款码、扫一扫与转账' },
            { id: 'I4', n: '支付宝与扫码支付', d: '实名、付款收款与生活缴费' },
            { id: 'I5', n: '出行、挂号与生活 App', d: '打车、导航、乘车码与预约挂号' },
            { id: 'I6', n: '测验：微信与生活服务', d: '10 题结业测验', quiz: 'I' }
        ]},
        { id: 'J', icon: '🛡️', n: '网络安全与防诈骗', d: '密码、骗术拆解、AI 新骗局与止损报警：把防骗练成本能', children: [
            { id: 'J1', n: '密码与账号安全', d: '好密码标准、双重验证与防盗' },
            { id: 'J2', n: '电话与短信诈骗识别', d: '开场白、套路与官方渠道' },
            { id: 'J3', n: '购物与转账安全', d: '退款骗局、二手交易与转账核实' },
            { id: 'J4', n: 'AI 时代新骗局', d: '换脸、语音克隆与假新闻' },
            { id: 'J5', n: '被骗之后：止损与报警', d: '黄金半小时、冻结、证据与心理' },
            { id: 'J6', n: '诈骗识别练习器', d: '情景闯关判危险度', tool: 1 },
            { id: 'J7', n: '测验：网络安全与防诈骗', d: '10 题结业测验', quiz: 'J' }
        ]},
        { id: 'K', icon: '📄', n: '办公与文档', d: 'Word/Excel/PPT、WPS 云文档与电子邮件：把生活写成文档', children: [
            { id: 'K1', n: 'Word 入门', d: '打字、保存与排版四件套' },
            { id: 'K2', n: 'Excel 入门', d: '单元格、自动求和与排序' },
            { id: 'K3', n: 'PPT 入门', d: '幻灯片、插图与放映' },
            { id: 'K4', n: 'WPS·云文档·打印', d: '免费三合一、同步与打印设置' },
            { id: 'K5', n: '电子邮件', d: '注册、写信、附件与钓鱼识别' },
            { id: 'K6', n: '测验：办公与文档', d: '10 题结业测验', quiz: 'K' }
        ]},
        { id: 'L', icon: '🛒', n: '网上购物与现代消费', d: '网购入门、下单支付、物流收货、退换货与直播团购：把网购用得又省又安全', children: [
            { id: 'L1', n: '网购入门', d: '选平台、注册登录、搜索筛选、看评价与比价' },
            { id: 'L2', n: '下单与支付', d: '核对下单、支付方式、优惠凑单与订单查询' },
            { id: 'L3', n: '物流与收货', d: '查物流、驿站快递柜取件与收货验货' },
            { id: 'L4', n: '退换货与售后', d: '七天无理由、退货流程、退款到账与投诉维权' },
            { id: 'L5', n: '直播购物与团购', d: '看直播防逼单、领券拼单与本地生活团购核销' },
            { id: 'L6', n: '测验：网上购物与现代消费', d: '10 题结业测验', quiz: 'L' }
        ]},
        { id: 'M', icon: '🏠', n: '数字生活进阶', d: '短视频、智能电视、智能家居、数字政务、线上就医与备份换机：把家里的数字设备都用顺手', children: [
            { id: 'M1', n: '短视频与直播', d: '刷得安全、拍得开心、防上瘾防骗' },
            { id: 'M2', n: '智能电视与机顶盒', d: '遥控、联网、点播与投屏，长辈模式' },
            { id: 'M3', n: '智能家居', d: '语音音箱、智能插座、摄像头与场景联动' },
            { id: 'M4', n: '数字政务', d: '政务App、电子社保卡、医保查询与待遇认证' },
            { id: 'M5', n: '线上就医与健康管理', d: '在线问诊、挂号、报告查询与家庭医生签约' },
            { id: 'M6', n: '手机文件与备份换机', d: '找文件、云备份、微信记录迁移与老手机善后' },
            { id: 'M7', n: '测验：数字生活进阶', d: '10 题结业测验', quiz: 'M' }
        ]},
        { id: 'N', icon: '🧳', n: '旅游与出行', d: '出行规划、火车高铁、飞机、酒店住宿、景区预约与旅途防坑：一个人也能把远门出明白', children: [
            { id: 'N1', n: '出行规划与准备', d: '目的地时间、天气行装、证件票据与家里检查' },
            { id: 'N2', n: '火车与高铁', d: '12306 购票、检票进站与乘车流程' },
            { id: 'N3', n: '飞机出行', d: '订票、值机、安检与登机全流程' },
            { id: 'N4', n: '酒店与住宿', d: '订房选房、入住退房与住店安全' },
            { id: 'N5', n: '景区预约与行程安排', d: '门票预约、跟团与自由行、行程表' },
            { id: 'N6', n: '旅途防坑与应急', d: '低价团、黑车、购物坑与证件丢失' },
            { id: 'N7', n: '测验：旅游与出行', d: '10 题结业测验', quiz: 'N' }
        ]},
        { id: 'SYS', icon: '📊', n: '学习系统', d: '仪表盘、成就与测验中心', children: [
            { id: '41', n: '学习仪表盘', d: '进度、连续天数与成绩聚合' },
            { id: '42', n: '成就徽章墙', d: '26 枚成就等你解锁' },
            { id: '43', n: '测验中心与错题本', d: '全部测验入口 + 错题复习' },
            { id: 'SYS4', n: '生活场景速查', d: '按生活问题找教程', tool: 1 },
            { id: 'SYS5', n: '术语词典', d: '电脑手机术语速查：遇到看不懂的词来这里查', tool: 1 },
            { id: 'SYS6', n: '毕业证书', d: '学完十四大模块，领取你的毕业证书', tool: 1 }
        ]},
        { id: 'SITE', icon: 'ℹ️', n: '关于本站', d: '公告、指南、免责与反馈', children: [
            { id: '44', n: '更新公告', d: '版本日志' },
            { id: '45', n: '关于本站与使用指南', d: '怎么学、怎么把本站部署到你自己的 GitHub' },
            { id: '46', n: '免责声明与反馈', d: '边界说明与联系方式' }
        ]}
    ];

    /* ===== 树工具：扁平化 / 查找 / 面包屑 / 前后页 ===== */
    XD._byId = {};
    XD._flat = []; // DFS 展平的叶子+目录（全节点）
    (function walk(nodes, parentPath) {
        for (var i = 0; i < nodes.length; i++) {
            var nd = nodes[i];
            nd.f = nd.id + '.html';
            nd.path = parentPath.concat(nd);
            XD._byId[nd.id] = nd;
            XD._flat.push(nd);
            if (nd.children && nd.children.length) walk(nd.children, parentPath.concat(nd));
        }
    })(XD.TREE, []);

    XD.PAGES = []; // 供搜索：仅叶子（无 children），站点地图/SW 与构建脚本由 TREE 生成
    (function () {
        for (var i = 0; i < XD._flat.length; i++) {
            var nd = XD._flat[i];
            if (!nd.children || !nd.children.length) {
                XD.PAGES.push({ f: nd.f, t: nd.n, k: (nd.d || '') + ' ' + nd.id, m: nd.id, quiz: nd.quiz || '' });
            }
        }
    })();

    XD.node = function (id) { return XD._byId[id] || null; };
    XD.crumbsOf = function (id) {
        var nd = XD._byId[id];
        return nd ? nd.path.slice() : [];
    };
    // 某节点下所有叶子数量
    XD.leafCount = function (nd) {
        if (!nd.children || !nd.children.length) return 1;
        var c = 0;
        for (var i = 0; i < nd.children.length; i++) c += XD.leafCount(nd.children[i]);
        return c;
    };
    // 全站叶子文件名集合（进度分母用）
    XD.modIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    XD.leafFilesOfMod = function (modId) {
        var nd = XD._byId[modId];
        if (!nd) return [];
        var out = [];
        (function w(n) {
            if (!n.children || !n.children.length) { out.push(n.f); return; }
            for (var i = 0; i < n.children.length; i++) w(n.children[i]);
        })(nd);
        return out;
    };

    /* ========== 学习进度层 xd_read_v1 ========== */
    (function () {
        var KEY = 'xd_read_v1';
        function read() { return LS(KEY) || {}; }
        XD.progress = {
            all: read,
            markRead: function (f) {
                var a = read();
                if (!a[f]) {
                    a[f] = Date.now();
                    SS(KEY, a);
                    XD.emit('progress.read', { f: f });
                    XD.achieve.checkProgress(a);
                    if (XD.game) XD.game.add(5, '首次阅读' + (f ? '（' + f + '）' : ''));
                }
            },
            isRead: function (f) { return !!read()[f]; },
            count: function () { return Object.keys(read()).length; },
            nodeProgress: function (idOrNode) {
                var nd = typeof idOrNode === 'string' ? XD.node(idOrNode) : idOrNode;
                if (!nd) return 0;
                var files = [];
                (function w(n) {
                    if (!n.children || !n.children.length) { files.push(n.f); return; }
                    for (var i = 0; i < n.children.length; i++) w(n.children[i]);
                })(nd);
                if (!files.length) return 0;
                var a = read(), n = 0;
                for (var i = 0; i < files.length; i++) if (a[files[i]]) n++;
                return Math.round(n / files.length * 100);
            },
            overall: function () {
                var total = 0, n = 0, a = read();
                for (var m = 0; m < XD.modIds.length; m++) {
                    var files = XD.leafFilesOfMod(XD.modIds[m]);
                    total += files.length;
                    for (var i = 0; i < files.length; i++) if (a[files[i]]) n++;
                }
                return total ? Math.round(n / total * 100) : 0;
            }
        };
    })();

    /* ========== 目录页渲染：renderDir(containerId, nodeId) ========== */
    XD.renderDir = function (containerId, nodeId) {
        var box = document.getElementById(containerId);
        var nd = XD.node(nodeId);
        if (!box || !nd || !nd.children || !nd.children.length) return;
        var html = '';
        for (var i = 0; i < nd.children.length; i++) {
            var c = nd.children[i];
            var p = XD.progress.nodeProgress(c);
            var isDir = c.children && c.children.length;
            var badge = isDir ? '📁 模块目录' : (c.quiz ? '📝 结业测验' : c.tool ? '🧪 互动工具' : '📖 图文课');
            var tag = p === 100 ? '✅' : p > 0 ? p + '%' : '';
            html += '<a class="module-card" href="' + c.f + '">' +
                (tag ? '<span class="tag">' + tag + '</span>' : '') +
                '<div class="mod-head"><span style="font-size:28px;">' + (c.icon || (c.quiz ? '📝' : c.tool ? '🧪' : isDir ? '📁' : '📖')) + '</span>' +
                '<span class="mod-no">' + c.id + '</span></div>' +
                '<b>' + XD.escapeHtml(c.n) + '</b>' +
                '<span>' + XD.escapeHtml(c.d || '') + '</span>' +
                '<ul><li>' + badge + ' · ' + (isDir ? XD.leafCount(c) + ' 页内容' : '直接阅读') + '</li>' +
                '<li>' + (p === 100 ? '<span class="done-flag">✅ 已完成</span>' : p > 0 ? '进行中 ' + p + '%' : '未开始') + '</li></ul>' +
                (isDir || c.quiz || c.tool ? '' : '<div class="dir-prog"><i style="width:' + p + '%;"></i></div>') +
                '</a>';
        }
        box.innerHTML = html;
    };

    /* ========== 面包屑：自动插入到 .site-header 之后 ========== */
    XD.renderCrumbs = function () {
        var f = document.body.getAttribute('data-page');
        if (!f) return;
        var id = f.replace(/\.html$/, '');
        var path = XD.crumbsOf(id);
        if (!path.length) return;
        var html = '<nav class="crumbs" aria-label="位置">';
        html += '<a href="index.html">🏠 首页</a>';
        for (var i = 0; i < path.length; i++) {
            var sep = ' <span>›</span> ';
            html += sep + (i === path.length - 1 ? '<b>' + XD.escapeHtml(path[i].n) + '</b>' : '<a href="' + path[i].f + '">' + XD.escapeHtml(path[i].n) + '</a>');
        }
        html += '</nav>';
        var header = document.querySelector('.site-header');
        if (header && header.insertAdjacentHTML) {
            header.insertAdjacentHTML('afterend', html);
        } else {
            document.body.insertAdjacentHTML('afterbegin', html);
        }
    };

    /* ========== 前后页（DFS 顺序）渲染到 #xdPrevNext ========== */
    XD.renderPrevNext = function () {
        var box = document.getElementById('xdPrevNext');
        if (!box) return;
        var f = document.body.getAttribute('data-page');
        var id = f ? f.replace(/\.html$/, '') : '';
        // 在全站叶子序列中找当前位置（目录页不算）
        var leaves = XD.PAGES;
        var idx = -1;
        for (var i = 0; i < leaves.length; i++) if (leaves[i].f === f) { idx = i; break; }
        var html = '';
        if (idx > 0) html += '<a href="' + leaves[idx - 1].f + '">← ' + XD.escapeHtml(leaves[idx - 1].t) + '</a>';
        else html += '<a href="index.html">← 回到首页</a>';
        html += '<a class="mid" href="1.html">🗺 总目录</a>';
        if (idx >= 0 && idx < leaves.length - 1) html += '<a href="' + leaves[idx + 1].f + '">' + XD.escapeHtml(leaves[idx + 1].t) + ' →</a>';
        else html += '<a href="41.html">看看学习仪表盘 →</a>';
        box.innerHTML = html;
    };

    /* ========== 学习日志 xd_study_log_v1（供仪表盘聚合） ========== */
    (function () {
        var KEY = 'xd_study_log_v1';
        var MAX = 500;
        function rd() {
            try { var a = JSON.parse(localStorage.getItem(KEY)); if (Object.prototype.toString.call(a) === '[object Array]') return a; } catch (e) {}
            return [];
        }
        function wr(a) {
            if (a.length > MAX) a = a.slice(a.length - MAX);
            try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {}
            return a;
        }
        XD.studyLog = {
            add: function (entry) {
                var a = rd();
                a.push({ type: entry.type || 'read', itemId: entry.itemId == null ? '' : String(entry.itemId), mod: entry.mod || '', at: entry.at || Date.now() });
                wr(a);
                XD.emit('study.recorded', a[a.length - 1]);
            },
            recent: function (n) { var a = rd(); return n ? a.slice(-n) : a; },
            todayCount: function () {
                var a = rd(), now = new Date(), c = 0;
                for (var i = 0; i < a.length; i++) {
                    var d = new Date(a[i].at);
                    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) c++;
                }
                return c;
            },
            streakDays: function () {
                var a = rd(), days = {};
                for (var i = 0; i < a.length; i++) {
                    var d = new Date(a[i].at);
                    days[d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()] = 1;
                }
                var now = new Date(), n = 0, cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
                if (!days[key(cur)]) cur.setDate(cur.getDate() - 1);
                while (days[key(cur)]) { n++; cur.setDate(cur.getDate() - 1); }
                return n;
            },
            heatmap: function (nDays) {
                var a = rd(), out = [], now = new Date(), counts = {};
                for (var i = 0; i < a.length; i++) {
                    var d = new Date(a[i].at);
                    var k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
                    counts[k] = (counts[k] || 0) + 1;
                }
                for (var j = nDays - 1; j >= 0; j--) {
                    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - j);
                    var key = day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate();
                    out.push({ d: key, c: counts[key] || 0 });
                }
                return out;
            }
        };
    })();

    /* ========== 测验引擎 xd_quiz_v1 + 错题本 xd_err_items_v1 ========== */
    (function () {
        var QKEY = 'xd_quiz_v1';
        var EKEY = 'xd_err_items_v1';
        function results() { return LS(QKEY) || {}; }
        XD.quiz = {
            results: results,
            getResult: function (id) { return results()[id] || null; },
            errItems: function () { return LS(EKEY) || []; },
            removeErr: function (qid) {
                var a = XD.quiz.errItems();
                var b = a.filter(function (x) { return x.qid !== qid; });
                SS(EKEY, b);
                XD.emit('errbook.changed', {});
            },
            clearErr: function () { SS(EKEY, []); XD.emit('errbook.changed', {}); },
            run: function (containerId, cfg) {
                var box = document.getElementById(containerId);
                if (!box || !cfg || !cfg.questions || !cfg.questions.length) return;
                var qs = cfg.questions;
                var state = { answered: 0, right: 0, results: [] };
                var html = '<div class="quiz-box" id="' + containerId + '_inner">';
                html += '<h2 style="border:none;padding-left:0;margin:6px 0 4px;">📝 ' + XD.escapeHtml(cfg.title || '随堂测验') + '</h2>';
                html += '<p class="lesson-sub" style="text-align:left;">共 ' + qs.length + ' 题，点击选项立即判定；做错会自动进入错题本。</p>';
                for (var i = 0; i < qs.length; i++) {
                    var q = qs[i];
                    html += '<div class="quiz-q" data-i="' + i + '">';
                    html += '<div class="q-title"><span class="q-no">Q' + (i + 1) + '</span>' + XD.escapeHtml(q.q) + '</div>';
                    for (var j = 0; j < q.opts.length; j++) {
                        html += '<button class="quiz-opt" data-q="' + i + '" data-o="' + j + '">' + String.fromCharCode(65 + j) + '. ' + XD.escapeHtml(q.opts[j]) + '</button>';
                    }
                    html += '<div class="quiz-exp" data-e="' + i + '">' + (q.exp ? '💡 ' + XD.escapeHtml(q.exp) : '') + '</div>';
                    html += '</div>';
                }
                html += '<div class="quiz-result" style="display:none;" data-r="1"></div>';
                html += '</div>';
                box.innerHTML = html;

                box.addEventListener('click', function (e) {
                    var btn = e.target.closest ? e.target.closest('.quiz-opt') : null;
                    if (!btn || btn.disabled) return;
                    var qi = +btn.getAttribute('data-q');
                    var oi = +btn.getAttribute('data-o');
                    var q = qs[qi];
                    var qEl = box.querySelector('.quiz-q[data-i="' + qi + '"]');
                    if (!qEl || qEl.getAttribute('data-done')) return;
                    qEl.setAttribute('data-done', '1');
                    var opts = qEl.querySelectorAll('.quiz-opt');
                    for (var k = 0; k < opts.length; k++) { opts[k].disabled = true; }
                    var ok = (oi === q.a);
                    btn.classList.add(ok ? 'correct' : 'wrong');
                    if (!ok) opts[q.a].classList.add('correct');
                    var exp = qEl.querySelector('.quiz-exp');
                    if (exp) exp.classList.add('show');
                    state.answered++;
                    if (ok) state.right++;
                    state.results[qi] = { ok: ok, chosen: oi };
                    if (!ok) {
                        var errs = XD.quiz.errItems();
                        errs.push({ qid: cfg.id + '-Q' + (qi + 1), quizId: cfg.id, quizTitle: cfg.title || '', q: q.q, opts: q.opts, a: q.a, exp: q.exp || '', at: Date.now() });
                        SS(EKEY, errs);
                    }
                    if (state.answered === qs.length) finish();
                });

                function finish() {
                    var score = Math.round(state.right / qs.length * 100);
                    var r = box.querySelector('[data-r]');
                    var all = results();
                    var prev = all[cfg.id];
                    var improved = !prev || score > prev.score;
                    if (improved) {
                        all[cfg.id] = { score: score, right: state.right, total: qs.length, at: Date.now() };
                        SS(QKEY, all);
                    }
                    XD.studyLog.add({ type: 'quiz', itemId: cfg.id, mod: cfg.id });
                    XD.emit('quiz.done', { id: cfg.id, score: score, right: state.right, total: qs.length, improved: improved });
                    XD.achieve.checkQuiz(all);
                    if (score === 100) XD.achieve.unlock('quiz_perfect');
                    XD.achieve.unlock('quiz_first');
                    // 游戏化：首次完成或刷新最高分才发经验，防止反复重做刷分
                    if (improved && XD.game) {
                        XD.game.add(25, '完成测验「' + (cfg.title || cfg.id) + '」');
                        if (score >= 60) XD.game.add(10, '测验及格');
                        if (score === 100) XD.game.add(15, '测验满分');
                    }
                    // 考后解析报告：逐题对错 + 你的答案/正确答案 + 解析 + 错题本跳转
                    var rep = '<div class="quiz-report"><h3>📋 本次答题解析</h3>';
                    for (var x = 0; x < qs.length; x++) {
                        var rx = state.results[x];
                        var ok = !!(rx && rx.ok);
                        rep += '<div class="qr-item ' + (ok ? 'qr-ok' : 'qr-no') + '">' +
                            '<span class="qr-mark">' + (ok ? '✓' : '✗') + '</span><div>' +
                            '<b>' + (x + 1) + '. ' + XD.escapeHtml(qs[x].q) + '</b>';
                        if (rx && !ok) rep += '<div class="qr-yours">你的答案：' + String.fromCharCode(65 + rx.chosen) + '. ' + XD.escapeHtml(qs[x].opts[rx.chosen]) + '</div>';
                        if (rx && !ok) rep += '<div class="qr-right">正确答案：' + String.fromCharCode(65 + qs[x].a) + '. ' + XD.escapeHtml(qs[x].opts[qs[x].a]) + '</div>';
                        if (qs[x].exp) rep += '<div class="qr-exp">💡 ' + XD.escapeHtml(qs[x].exp) + '</div>';
                        rep += '</div></div>';
                    }
                    rep += '<div class="qr-actions"><button class="btn ghost" data-errbook="1">📕 打开错题本复习</button></div></div>';
                    r.style.display = 'block';
                    r.innerHTML = '<div class="score">' + score + ' 分</div>' +
                        '<p style="margin:6px 0;">答对 ' + state.right + ' / ' + qs.length + ' 题' +
                        (score === 100 ? ' · 🎉 满分！' : score >= 60 ? ' · 通过' : ' · 未通过，看看解析再来一次吧') + '</p>' +
                        (improved ? '' : '<p style="margin:4px 0;font-size:13px;color:var(--dim);">已做过本测验，本次未超过历史最高分，不重复计经验</p>') +
                        '<button class="btn" data-retry="1">🔄 重做一次</button>' + rep;
                }

                box.addEventListener('click', function (e) {
                    if (e.target && e.target.getAttribute) {
                        if (e.target.getAttribute('data-retry')) {
                            XD.quiz.run(containerId, cfg);
                            var boxEl = document.getElementById(containerId);
                            if (boxEl) boxEl.scrollIntoView({ behavior: 'smooth' });
                        } else if (e.target.getAttribute('data-errbook')) {
                            location.href = '43.html';
                        }
                    }
                });
            }
        };
    })();

    /* ========== 成就系统 xd_ach_v1 ========== */
    (function () {
        var KEY = 'xd_ach_v1';
        XD.ACHIEVEMENTS = [
            { id: 'first_read', t: '初来乍到', d: '阅读完第一节课', icon: '🎯' },
            { id: 'explorer', t: '全站漫游', d: '累计阅读 20 个不同页面', icon: '🧭' },
            { id: 'mod_a', t: '硬件通', d: '完成模块A：计算机基础', icon: '🖥️' },
            { id: 'mod_b', t: '电脑高手', d: '完成模块B：电脑详细使用', icon: '🖱️' },
            { id: 'mod_c', t: '网络向导', d: '完成模块C：网络与服务器', icon: '🌐' },
            { id: 'mod_d', t: '指尖飞舞', d: '完成模块D：键盘与快捷键', icon: '⌨️' },
            { id: 'mod_e', t: 'AI 驾驭者', d: '完成模块E：如何使用 AI', icon: '🤖' },
            { id: 'mod_f', t: '版本控制者', d: '完成模块F：Git 与 GitHub', icon: '🐙' },
            { id: 'mod_g', t: '开发者入门', d: '完成模块G：怎么开发网页', icon: '🛠️' },
            { id: 'mod_h', t: '掌上达人', d: '完成模块H：手机与平板', icon: '📱' },
            { id: 'mod_i', t: '生活管家', d: '完成模块I：微信与生活服务', icon: '💬' },
            { id: 'mod_j', t: '火眼金睛', d: '完成模块J：网络安全与防诈骗', icon: '🛡️' },
            { id: 'mod_k', t: '办公能手', d: '完成模块K：办公与文档', icon: '📄' },
            { id: 'mod_l', t: '购物达人', d: '完成模块L：网上购物与现代消费', icon: '🛒' },
            { id: 'mod_m', t: '智家能手', d: '完成模块M：数字生活进阶', icon: '🏠' },
            { id: 'mod_n', t: '出行达人', d: '完成模块N：旅游与出行', icon: '🧳' },
            { id: 'quiz_first', t: '小试牛刀', d: '完成第一次测验', icon: '✏️' },
            { id: 'quiz_perfect', t: '满分学霸', d: '任意测验取得满分', icon: '🏆' },
            { id: 'all_quiz', t: '测验达人', d: '完成全部 13 个模块测验', icon: '🎓' },
            { id: 'shortcut_10', t: '快键新手', d: '快捷键练习器累计答对 10 题', icon: '⚡' },
            { id: 'shortcut_50', t: '快键高手', d: '快捷键练习器累计答对 50 题', icon: '🚀' },
            { id: 'typing_40', t: '打字入门', d: '打字测试达到 40 字/分钟', icon: '⌨️' },
            { id: 'typing_80', t: '键盘大师', d: '打字测试达到 80 字/分钟', icon: '👑' },
            { id: 'streak_3', t: '坚持三天', d: '连续学习 3 天', icon: '🔥' },
            { id: 'streak_7', t: '坚持一周', d: '连续学习 7 天', icon: '⭐' },
            { id: 'graduate', t: '顺利毕业', d: '学完全部 14 个模块（毕业证书页可打印证书）', icon: '🏫' }
        ];
        function got() { return LS(KEY) || {}; }
        XD.achieve = {
            list: function () {
                var g = got();
                return XD.ACHIEVEMENTS.map(function (a) {
                    return { id: a.id, t: a.t, d: a.d, icon: a.icon, at: g[a.id] || 0 };
                });
            },
            unlock: function (id) {
                var g = got();
                if (g[id]) return;
                var def = null;
                for (var i = 0; i < XD.ACHIEVEMENTS.length; i++) if (XD.ACHIEVEMENTS[i].id === id) def = XD.ACHIEVEMENTS[i];
                if (!def) return;
                g[id] = Date.now();
                SS(KEY, g);
                XD.showToast('🏅 成就解锁：' + def.t + ' — ' + def.d);
                XD.emit('achieve.unlocked', { id: id, t: def.t });
            },
            checkProgress: function (readMap) {
                var keys = Object.keys(readMap);
                if (keys.length >= 1) XD.achieve.unlock('first_read');
                if (keys.length >= 20) XD.achieve.unlock('explorer');
                var allDone = true;
                for (var m = 0; m < XD.modIds.length; m++) {
                    var files = XD.leafFilesOfMod(XD.modIds[m]), n = 0;
                    for (var i = 0; i < files.length; i++) if (readMap[files[i]]) n++;
                    if (files.length && n === files.length) XD.achieve.unlock('mod_' + XD.modIds[m].toLowerCase());
                    if (files.length && n < files.length) allDone = false;
                }
                if (XD.studyLog.streakDays() >= 3) XD.achieve.unlock('streak_3');
                if (XD.studyLog.streakDays() >= 7) XD.achieve.unlock('streak_7');
                if (allDone) XD.achieve.unlock('graduate');
            },
            checkQuiz: function (all) {
                var ids = ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
                var n = 0;
                for (var i = 0; i < ids.length; i++) if (all && all[ids[i]]) n++;
                if (n >= ids.length) XD.achieve.unlock('all_quiz');
            }
        };
    })();

    /* ========== 游戏化：XP 经验 / 等级 / 每日任务 ========== */
    (function () {
        var KEY = 'xd_xp_v1';        // { xp: n, log: [{n, why, at}] }
        var DKEY = 'xd_daily_v1';    // { date: 'Y-M-D', claimed: {t1:1,...} } 仅记录已领取，完成态实时推导
        XD.LEVELS = [
            { xp: 0, t: '懵懂新手' },
            { xp: 50, t: '初学乍练' },
            { xp: 150, t: '渐入佳境' },
            { xp: 300, t: '小有所成' },
            { xp: 500, t: '融会贯通' },
            { xp: 750, t: '娴熟老手' },
            { xp: 1050, t: '得心应手' },
            { xp: 1400, t: '学有所成' },
            { xp: 1800, t: '进阶达人' },
            { xp: 2300, t: '精益求精' },
            { xp: 2900, t: '博闻强识' },
            { xp: 3600, t: '数字学神' }
        ];
        function rd() {
            var a = LS(KEY);
            if (a && typeof a.xp === 'number') return a;
            return { xp: 0, log: [] };
        }
        function wr(a) {
            if (a.log && a.log.length > 200) a.log = a.log.slice(-200);
            SS(KEY, a);
        }
        function levelInfo(xp) {
            var lv = 0;
            for (var i = 0; i < XD.LEVELS.length; i++) if (xp >= XD.LEVELS[i].xp) lv = i;
            var cur = XD.LEVELS[lv];
            var next = XD.LEVELS[lv + 1] || null;
            var span = next ? next.xp - cur.xp : 1;
            var got = next ? xp - cur.xp : span;
            return {
                lv: lv + 1, t: cur.t, xp: xp,
                pct: next ? Math.max(0, Math.min(100, Math.round(got / span * 100))) : 100,
                next: next ? next.xp : xp, nextT: next ? next.t : ''
            };
        }
        function isToday(ts) {
            var d = new Date(ts), now = new Date();
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        }
        XD.game = {
            xp: function () { return rd().xp; },
            level: function () { return levelInfo(rd().xp); },
            add: function (n, why) {
                var a = rd();
                var before = levelInfo(a.xp).lv;
                a.xp += n;
                a.log.push({ n: n, why: why || '', at: Date.now() });
                wr(a);
                var after = levelInfo(a.xp).lv;
                if (after > before) XD.showToast('🔺 升级！Lv' + after + ' · ' + levelInfo(a.xp).t, 3600);
                XD.emit('game.xp', { xp: a.xp, n: n, why: why || '' });
            },
            /* 每日任务：完成态全部从现有存储实时推导，零额外记录 */
            dailyTasks: function () {
                var readMap = XD.progress.all();
                var readsToday = 0;
                for (var f in readMap) {
                    if (Object.prototype.hasOwnProperty.call(readMap, f)) {
                        if (isToday(readMap[f])) readsToday++;
                    }
                }
                var log = XD.studyLog.recent(500);
                var qToday = 0, pToday = 0;
                for (var i = 0; i < log.length; i++) {
                    var e = log[i];
                    if (!isToday(e.at)) continue;
                    if (e.type === 'quiz') qToday++;
                    if (e.type === 'practice' || e.type === 'mouse') pToday++;
                }
                var c = LS(DKEY);
                var claimed = (c && c.date === XD.fmtDate(new Date()) && c.claimed) ? c.claimed : {};
                var tasks = [
                    { id: 't1', t: '今日读满 2 页', d: '打开两篇图文课，进入页面自动记录', done: readsToday >= 2, xp: 10 },
                    { id: 't2', t: '完成一次互动练习', d: '键盘/打字/鼠标等练习器跑完一轮', done: pToday >= 1, xp: 10 },
                    { id: 't3', t: '完成一套测验', d: '任意一套结业测验做完即算', done: qToday >= 1, xp: 10 }
                ];
                for (var j = 0; j < tasks.length; j++) tasks[j].claimed = !!claimed[tasks[j].id];
                return tasks;
            },
            claimDaily: function (id) {
                var today = XD.fmtDate(new Date());
                var tasks = XD.game.dailyTasks();
                var def = null;
                for (var i = 0; i < tasks.length; i++) if (tasks[i].id === id) def = tasks[i];
                if (!def || !def.done || def.claimed) return false;
                var c = LS(DKEY) || {};
                if (c.date !== today || !c.claimed) c = { date: today, claimed: {} };
                c.claimed[id] = 1;
                SS(DKEY, c);
                XD.game.add(def.xp, '完成每日任务「' + def.t + '」');
                XD.emit('game.daily', { id: id });
                return true;
            }
        };
    })();

    /* ========== 首次导游 XD.guide：首页 3 步轮播遮罩（xd_guide_v1，可跳过） ========== */
    (function () {
        var KEY = 'xd_guide_v1';
        var STEPS = [
            { icon: '🗺️', t: '先看课程地图', d: '首页下面就是全部模块的课程地图，从你最想学的地方点进去，随时能回来。' },
            { icon: '✅', t: '打开页面自动记录', d: '每打开一篇图文课就记一次已读，首页绿色进度条会一点点往上涨，成就感看得见。' },
            { icon: '🏅', t: '测验积累经验升级', d: '每个模块结尾有一场结业测验，做完有解析；拿徽章、攒经验，一步步从小白升到"数字学神"。' }
        ];
        XD.guide = {
            maybe: function () {
                try { if (localStorage.getItem(KEY)) return; } catch (e) {}
                XD.guide.show();
            },
            show: function () {
                if (document.getElementById('xdGuide')) return;
                try { localStorage.setItem(KEY, '1'); } catch (e) {}
                var mask = document.createElement('div');
                mask.className = 'guide-mask';
                mask.id = 'xdGuide';
                mask.innerHTML = '<div class="guide-box">' +
                    '<div class="guide-step"></div>' +
                    '<div class="guide-nav"><button type="button" class="guide-skip" data-g="skip">跳过</button>' +
                    '<button type="button" class="btn guide-next" data-g="next">下一步 →</button></div>' +
                    '<div class="guide-dots"></div></div>';
                document.body.appendChild(mask);
                var stepEl = mask.querySelector('.guide-step');
                var dotsEl = mask.querySelector('.guide-dots');
                var nextEl = mask.querySelector('.guide-next');
                var cur = 0;
                function render() {
                    var s = STEPS[cur];
                    stepEl.innerHTML = '<div class="guide-icon">' + s.icon + '</div><b>' + s.t + '</b><p>' + s.d + '</p>';
                    nextEl.textContent = cur === STEPS.length - 1 ? '开始学习 🎉' : '下一步 →';
                    var dh = '';
                    for (var i = 0; i < STEPS.length; i++) dh += '<i' + (i === cur ? ' class="on"' : '') + '></i>';
                    dotsEl.innerHTML = dh;
                }
                function close() {
                    mask.classList.add('out');
                    setTimeout(function () { if (mask.parentNode) mask.parentNode.removeChild(mask); }, 350);
                }
                mask.addEventListener('click', function (e) {
                    var t = e.target;
                    if (t.getAttribute && t.getAttribute('data-g') === 'skip') { close(); return; }
                    if (t.getAttribute && t.getAttribute('data-g') === 'next') {
                        if (cur < STEPS.length - 1) { cur++; render(); } else close();
                        return;
                    }
                    if (t === mask) close();
                });
                render();
            }
        };
    })();

    /* ========== 收藏夹 xd_fav_v1 ========== */
    (function () {
        var KEY = 'xd_fav_v1';
        function rd() {
            try { var a = JSON.parse(localStorage.getItem(KEY)); if (Object.prototype.toString.call(a) === '[object Array]') return a; } catch (e) {}
            return [];
        }
        function wr(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
        XD.fav = {
            list: function () {
                var a = rd(), out = [];
                for (var i = 0; i < a.length; i++) {
                    var p = null;
                    for (var j = 0; j < XD.PAGES.length; j++) if (XD.PAGES[j].f === a[i]) { p = XD.PAGES[j]; break; }
                    out.push(p ? { f: p.f, t: p.t, m: p.m } : { f: a[i], t: a[i], m: '' });
                }
                return out;
            },
            has: function (f) { return rd().indexOf(f) >= 0; },
            toggle: function (f) {
                var a = rd(), i = a.indexOf(f);
                if (i >= 0) { a.splice(i, 1); wr(a); XD.emit('fav.changed', { f: f, on: false }); return false; }
                a.push(f); wr(a); XD.emit('fav.changed', { f: f, on: true }); return true;
            },
            remove: function (f) {
                var a = rd(), i = a.indexOf(f);
                if (i >= 0) { a.splice(i, 1); wr(a); XD.emit('fav.changed', { f: f, on: false }); }
            },
            count: function () { return rd().length; }
        };
    })();

    /* ========== 语音朗读 XD.speak（图文课；SpeechSynthesis 存在性守卫） ========== */
    (function () {
        if (!('speechSynthesis' in window)) { XD.speak = { toggle: function () {} }; return; }
        var synth = window.speechSynthesis;
        var bar = null, parts = [], idx = 0, rate = 1, paused = false, running = false;
        function collect() {
            var box = document.querySelector('.lesson.container');
            if (!box) return [];
            var nodes = box.querySelectorAll('h1, h2, h3, p, li, td, th');
            var out = [];
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n.closest('.code-block, .quiz-report, .lesson-footer, .toc, .lesson-nav, .page-actions, .speak-bar')) continue;
                var t = (n.textContent || '').replace(/\s+/g, ' ').trim();
                if (t) out.push({ el: n, text: t });
            }
            return out;
        }
        function clearHL() {
            if (!parts.length) return;
            for (var i = 0; i < parts.length; i++) parts[i].el.classList.remove('speaking');
        }
        function speakPart() {
            if (!running) return;
            if (idx >= parts.length) { finish(); return; }
            clearHL();
            var part = parts[idx];
            part.el.classList.add('speaking');
            try { part.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
            var u = new SpeechSynthesisUtterance(part.text);
            u.lang = 'zh-CN';
            u.rate = rate;
            var vs = synth.getVoices().filter(function (v) { return /^zh/i.test(v.lang); });
            if (vs.length) u.voice = vs[0];
            u.onend = function () { idx++; speakPart(); };
            u.onerror = function () { idx++; speakPart(); };
            utter = u;
            synth.speak(u);
        }
        function finish() {
            running = false;
            clearHL();
            if (bar) {
                var p = bar.querySelector('[data-sp="play"]');
                if (p) p.textContent = '▶ 重听一遍';
            }
            XD.showToast('🔊 朗读完毕');
        }
        function stop() {
            running = false; paused = false;
            try { synth.cancel(); } catch (e) {}
            clearHL();
            idx = 0;
        }
        function buildBar() {
            bar = document.createElement('div');
            bar.className = 'speak-bar';
            bar.innerHTML = '<span class="speak-t">🔊 朗读中</span>' +
                '<button type="button" class="speak-btn" data-sp="play">⏸ 暂停</button>' +
                '<button type="button" class="speak-btn" data-sp="stop">⏹ 停止</button>' +
                '<span class="speak-rate"><label>语速</label>' +
                '<button type="button" class="speak-btn" data-rate="0.75">慢</button>' +
                '<button type="button" class="speak-btn on" data-rate="1">中</button>' +
                '<button type="button" class="speak-btn" data-rate="1.1">快</button></span>' +
                '<button type="button" class="speak-btn" data-sp="close">✕</button>';
            document.body.appendChild(bar);
            bar.addEventListener('click', function (e) {
                var b = e.target.closest('[data-sp], [data-rate]');
                if (!b) return;
                var sp = b.getAttribute('data-sp');
                if (sp === 'play') {
                    if (paused) { paused = false; synth.resume(); b.textContent = '⏸ 暂停'; }
                    else if (running) { paused = true; synth.pause(); b.textContent = '▶ 继续'; }
                    else start();
                } else if (sp === 'stop') { stop(); if (bar) bar.style.display = 'none'; }
                else if (sp === 'close') { stop(); if (bar) bar.style.display = 'none'; }
                else if (b.getAttribute('data-rate')) {
                    rate = parseFloat(b.getAttribute('data-rate'));
                    var rs = bar.querySelectorAll('[data-rate]');
                    for (var i = 0; i < rs.length; i++) rs[i].classList.toggle('on', rs[i] === b);
                    if (running) { try { synth.cancel(); } catch (e) {} idx--; idx = Math.max(0, idx); speakPart(); }
                }
            });
        }
        function start() {
            parts = collect();
            if (!parts.length) { XD.showToast('本页没有可朗读的正文'); return; }
            if (!bar) buildBar();
            bar.style.display = 'flex';
            idx = 0; paused = false; running = true;
            var p = bar.querySelector('[data-sp="play"]');
            if (p) p.textContent = '⏸ 暂停';
            synth.cancel();
            speakPart();
        }
        XD.speak = {
            toggle: function () {
                if (running || paused) { stop(); if (bar) bar.style.display = 'none'; }
                else start();
            },
            stop: stop
        };
    })();

    /* ========== 护眼提醒 xd_eye_v1：当日累计学习满 45 分钟提醒一次 ========== */
    (function () {
        var KEY = 'xd_eye_v1';
        var TIP_SEC = 45 * 60;
        var COOLDOWN = 60 * 60 * 1000;
        function rd() {
            try { var o = JSON.parse(localStorage.getItem(KEY)); if (o && typeof o === 'object') return o; } catch (e) {}
            return { date: '', sec: 0, lastTip: 0 };
        }
        function wr(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
        function today() { return XD.fmtDate(new Date()); }
        function tick() {
            var o = rd();
            if (o.date !== today()) o = { date: today(), sec: 0, lastTip: 0 };
            o.sec += 30;
            var now = Date.now();
            var show = o.sec >= TIP_SEC && now - o.lastTip >= COOLDOWN;
            if (show) o.lastTip = now;
            wr(o);
            if (show) showTip();
        }
        function showTip() {
            if (document.getElementById('eyeTip')) return;
            var tip = document.createElement('div');
            tip.className = 'eye-tip';
            tip.id = 'eyeTip';
            tip.innerHTML = '<div class="eye-ic">👀</div><div class="eye-mid"><b>该让眼睛歇一歇啦</b>' +
                '<span>你已经连续学了很久。站起来走走、看看窗外远处，比一直盯屏幕更护眼。</span></div>' +
                '<div class="eye-side"><button type="button" class="btn ghost" data-eye="later">再学一会儿</button>' +
                '<button type="button" class="btn" data-eye="ok">知道了</button></div>';
            document.body.appendChild(tip);
            tip.addEventListener('click', function (e) {
                var b = e.target.closest('[data-eye]');
                if (!b) return;
                tip.classList.add('out');
                setTimeout(function () { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 300);
            });
        }
        XD.eyeCare = {
            start: function () {
                if (typeof document.visibilityState === 'undefined' && typeof document.hidden === 'undefined') return;
                setInterval(function () {
                    if (typeof document.visibilityState !== 'undefined' && document.visibilityState === 'hidden') return;
                    tick();
                }, 30000);
            },
            tick: tick
        };
    })();

    /* ========== 版本框架 ========== */
    XD.APP_VER = '1.5.0';
    XD.VERSION_LOG = [
        { ver: '1.5.0', title: '玻璃拟态交互升级 + 术语词典与毕业证书', desc: '全站上线 6 大玻璃拟态交互：光随鼠走（卡片柔光跟随 + 3D 轻微倾斜）、玻璃停靠栏（底部居中图标 dock，悬停放大相邻跟随）、液态模块导航条（目录页顶部 A-N 玻璃胶囊，切换滑块滑动回弹）、模块就地放大（图文课卡片原位浮起铺满主区，底部缩略条切换，Esc/✕ 原路收回）、水滴分裂筛选（学习统计今天/本周/本月/全年液态胶囊分裂，指标数字滚动）、命令面板（Ctrl+K 或 / 唤起玻璃搜索，背景压暗模糊 + 关键词高亮 + 回车跳转）；仪表盘新增最近 35 天学习热力日历与每日任务今日目标进度条；新增第 8 个工具「术语词典」（SYS5，60 个术语的大白话解释）与第 9 个工具「毕业证书」（SYS6，学完十四大模块领取可打印证书）；成就徽章增至 26 枚（新增坚持一周、顺利毕业）；页面增至 127 个、TREE 节点 125 个' },
        { ver: '1.4.0', title: '适老功能四件套 + 生活场景速查', desc: '新增语音朗读、收藏夹、打印本页、护眼休息提醒四大适老功能（每页右上角一键使用）；新增第 7 个工具「生活场景速查」（SYS4）：按生活问题直达课程；页面增至 125 个、TREE 节点 123 个；鼠标练习器与快捷键挑战补成绩评价，仪表盘新增我的收藏卡' },
        { ver: '1.3.0', title: '游戏化升级 + 三大新模块', desc: '新增网上购物与现代消费（L）/数字生活进阶（M）/旅游与出行（N）三大模块共 23 页，测验增至 13 套、成就增至 24 枚、目录页 19 个；首页重构（等级徽章/今日统计/继续学习）；XP 等级、每日任务、首次导游、考后解析报告与错题弱项分析全面上线' },
        { ver: '1.2.0', title: '内容大扩容', desc: '新增四大模块：手机与平板（H）/微信与生活服务（I）/网络安全与防诈骗（J）/办公与文档（K），共 32 个新页面，测验增至 10 套、成就增至 21 枚，新增鼠标练习器与诈骗识别练习器' },
        { ver: '1.1.0', title: '模块树结构上线', desc: '全站改为模块化目录树：点进模块看到细分子模块，目录套目录层层深入，面包屑导航定位，树深支持到 10 层' },
        { ver: '1.0.0', title: '现代知识学院开学', desc: '七大模块上线：计算机基础/电脑使用/网络与服务器/键盘快捷键/AI/Git与GitHub/Web开发；快捷键练习器、Git演练场、提示词实验室、测验与错题本、学习仪表盘' }
    ];

    /* ========== 站内搜索（/ 热键） ========== */
    (function () {
        var mask = null, input = null, listEl = null, cur = -1, items = [];
        function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
        function hl(text, kw) {
            var esc = XD.escapeHtml(String(text == null ? '' : text));
            if (!kw) return esc;
            try { return esc.replace(new RegExp('(' + escRe(kw) + ')', 'gi'), '<mark class="hl">$1</mark>'); }
            catch (err) { return esc; }
        }
        function build() {
            mask = document.createElement('div');
            mask.className = 'xd-search-mask';
            mask.innerHTML = '<div class="xd-search-box">' +
                '<div class="cmd-head"><b>🔍 命令面板</b><span>Ctrl+K 或 / 唤起 · ↑↓ 选择 · 回车跳转 · Esc 关闭</span></div>' +
                '<input class="xd-search-input" placeholder="搜索课程…（输入关键词，实时过滤高亮）">' +
                '<div class="xd-search-list"></div></div>';
            document.body.appendChild(mask);
            input = mask.querySelector('.xd-search-input');
            listEl = mask.querySelector('.xd-search-list');
            mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
            input.addEventListener('input', function () { render(input.value); });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { close(); }
                else if (e.key === 'ArrowDown') { move(1); e.preventDefault(); }
                else if (e.key === 'ArrowUp') { move(-1); e.preventDefault(); }
                else if (e.key === 'Enter' && items.length) { location.href = items[Math.max(0, cur)]; }
            });
        }
        function render(kw) {
            kw = (kw || '').trim().toLowerCase();
            cur = -1;
            var ps = XD.PAGES.filter(function (p) {
                if (!kw) return true;
                return (p.t + ' ' + p.k + ' ' + p.f).toLowerCase().indexOf(kw) >= 0;
            }).slice(0, 30);
            items = ps.map(function (p) { return p.f; });
            var html = '';
            for (var i = 0; i < ps.length; i++) {
                html += '<div class="xd-search-item" data-f="' + ps[i].f + '"><span class="f">' + hl(ps[i].f, kw) + '</span><span>' + hl(ps[i].t, kw) + '</span></div>';
            }
            if (!ps.length) html = '<div class="xd-search-item"><span>没有匹配的课程</span></div>';
            listEl.innerHTML = html;
            var els = listEl.querySelectorAll('.xd-search-item[data-f]');
            for (var j = 0; j < els.length; j++) {
                els[j].onclick = function () { location.href = this.getAttribute('data-f'); };
            }
        }
        function move(d) {
            var els = listEl.querySelectorAll('.xd-search-item[data-f]');
            if (!els.length) return;
            cur = (cur + d + els.length) % els.length;
            for (var i = 0; i < els.length; i++) els[i].classList.toggle('hot', i === cur);
        }
        function open() {
            if (!mask) build();
            mask.classList.add('open');
            input.value = '';
            render('');
            setTimeout(function () { input.focus(); }, 50);
        }
        function close() { if (mask) mask.classList.remove('open'); }
        document.addEventListener('keydown', function (e) {
            var tag = (e.target && e.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); return; }
            if (e.key === '/' && mask && !mask.classList.contains('open')) { e.preventDefault(); open(); }
        });
        XD.search = { open: open, close: close };
    })();

    /* ========== 玻璃拟态 UI（v1.5）：光随鼠走 + 玻璃停靠栏 ========== */
    (function () {
        /* 光随鼠走：事件委托，mousemove 更新 CSS 变量驱动光斑与 3D 倾斜（移出复原） */
        var tiltEl = null;
        function setTilt(el, x, y) {
            var r = el.getBoundingClientRect();
            if (!r || !r.width) return;
            var px = x - r.left, py = y - r.top;
            el.style.setProperty('--mx', px + 'px');
            el.style.setProperty('--my', py + 'px');
            el.style.setProperty('--rx', ((py / r.height) - 0.5) * -3 + 'deg');
            el.style.setProperty('--ry', ((px / r.width) - 0.5) * 3 + 'deg');
        }
        function clearTilt(el) {
            el.style.setProperty('--rx', '0deg');
            el.style.setProperty('--ry', '0deg');
        }
        document.addEventListener('mousemove', function (e) {
            var t = e.target;
            var c = t && t.closest ? t.closest('.card, .module-card, .qc-card, .scene-card') : null;
            if (c) { setTilt(c, e.clientX, e.clientY); tiltEl = c; }
            else if (tiltEl) { clearTilt(tiltEl); tiltEl = null; }
        }, true);

        /* 玻璃停靠栏：全站底部居中图标 dock，悬停当前放大 + 相邻跟随 */
        var DOCK = [
            ['index.html', '🏠', '首页'],
            ['1.html', '🗂️', '全站目录'],
            ['41.html', '📊', '学习仪表盘'],
            ['42.html', '🏅', '成就徽章墙'],
            ['43.html', '✏️', '测验中心'],
            ['SYS4.html', '🧭', '场景速查'],
            ['SYS5.html', '📖', '术语词典'],
            ['SYS6.html', '🎓', '毕业证书'],
            [null, '🔍', '搜索']
        ];
        function buildDock() {
            if (!document.body || document.getElementById('xdDock')) return;
            var cur = document.body.getAttribute('data-page') || '';
            var dock = document.createElement('div');
            dock.className = 'glass-dock';
            dock.id = 'xdDock';
            var h = '';
            for (var i = 0; i < DOCK.length; i++) {
                var d = DOCK[i];
                if (d[0]) h += '<a href="' + d[0] + '" title="' + d[2] + '"' + (d[0] === cur ? ' class="on"' : '') + '>' + d[1] + '</a>';
                else h += '<button type="button" class="dock-btn" data-dock="search" title="' + d[2] + '">' + d[1] + '</button>';
            }
            dock.innerHTML = h;
            document.body.appendChild(dock);
            var searchBtns = dock.querySelectorAll('.dock-btn[data-dock="search"]');
            for (var s = 0; s < searchBtns.length; s++) {
                (function (b) {
                    b.addEventListener('click', function () { if (window.XD && XD.search) XD.search.open(); });
                })(searchBtns[s]);
            }
            var items = dock.children;
            for (var k = 0; k < items.length; k++) {
                (function (it) {
                    it.addEventListener('mouseenter', function () {
                        it.classList.add('lift-lg');
                        var idx = -1;
                        for (var q = 0; q < items.length; q++) if (items[q] === it) { idx = q; break; }
                        if (idx > 0) items[idx - 1].classList.add('lift');
                        if (idx >= 0 && idx < items.length - 1) items[idx + 1].classList.add('lift');
                    });
                    it.addEventListener('mouseleave', function () {
                        it.classList.remove('lift-lg');
                        for (var q = 0; q < items.length; q++) items[q].classList.remove('lift');
                    });
                })(items[k]);
            }
        }
        if (document.body) {
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildDock);
            else buildDock();
        }
    })();

    /* ========== 液态模块导航条（v1.5）：目录页顶部 A-N 玻璃胶囊 + 液态滑块回弹 ========== */
    (function () {
        var MOD_ICONS = { A: '📱', B: '💻', C: '🖥️', D: '⌨️', E: '🌐', F: '📄', G: '📷', H: '🎬', I: '🎵', J: '🛒', K: '🧮', L: '🗣️', M: '📞', N: '⚙️' };
        function modOf(page) {
            if (page === 'index.html' || page === '1.html') return 'HOME';
            for (var i = 0; i < XD.modIds.length; i++) {
                if (page.indexOf(XD.modIds[i]) === 0) return XD.modIds[i];
            }
            return '';
        }
        function buildStrip() {
            if (!window.XD || !XD.TREE) return;
            if (document.body.getAttribute('data-kind') !== 'dir') return;
            var container = document.querySelector('main .container') || document.querySelector('.container');
            if (!container) return;
            var h1 = container.querySelector('h1');
            if (!h1 || container.querySelector('.mod-strip')) return;
            var page = document.body.getAttribute('data-page') || '';
            var cur = modOf(page);
            var html = '<div class="mod-strip"><div class="mod-pills">';
            html += '<a class="mod-pill' + (cur === 'HOME' ? ' on' : '') + '" href="index.html" data-mod="HOME" title="首页">🏠 首页</a>';
            for (var m = 0; m < XD.modIds.length; m++) {
                var id = XD.modIds[m];
                var nd = XD.node(id);
                if (!nd) continue;
                html += '<a class="mod-pill' + (cur === id ? ' on' : '') + '" href="' + (nd.f || id + '.html') + '" data-mod="' + id + '" title="' + XD.escapeHtml(nd.n) + '">' + (MOD_ICONS[id] || '📁') + ' <b>' + id + '</b></a>';
            }
            html += '<span class="mod-slider"></span></div></div>';
            h1.insertAdjacentHTML('beforebegin', html);
            var slider = container.querySelector('.mod-strip .mod-slider');
            var pills = container.querySelectorAll('.mod-pill');
            function place() {
                var target = null;
                for (var i = 0; i < pills.length; i++) if (pills[i].classList.contains('on')) { target = pills[i]; break; }
                if (!target) { slider.style.display = 'none'; return; }
                slider.style.display = '';
                slider.style.left = (target.offsetLeft + 2) + 'px';
                slider.style.width = Math.max(0, target.offsetWidth - 4) + 'px';
            }
            place();
            for (var p = 0; p < pills.length; p++) {
                (function (pill) {
                    pill.addEventListener('click', function (e) {
                        if (pill.classList.contains('on')) return;
                        e.preventDefault();
                        if (pill.scrollIntoView) { try { pill.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (err) { } }
                        slider.style.display = '';
                        slider.style.left = (pill.offsetLeft + 2) + 'px';
                        slider.style.width = Math.max(0, pill.offsetWidth - 4) + 'px';
                        setTimeout(function () { location.href = pill.getAttribute('href'); }, 440);
                    });
                })(pills[p]);
            }
        }
        if (document.body) {
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildStrip);
            else buildStrip();
        }
    })();

    /* ========== 模块就地放大（v1.5）：目录页图文课卡从原位浮起全屏预览 ========== */
    (function () {
        if (typeof fetch === 'undefined') return; /* 无 fetch 环境直接整页跳转 */
        var cache = {};
        function fetchDoc(url) {
            if (cache[url]) return Promise.resolve(cache[url]);
            return fetch(url, { cache: 'no-cache' }).then(function (r) {
                if (!r.ok) throw new Error('fetch fail');
                return r.text();
            }).then(function (txt) {
                var d = new DOMParser().parseFromString(txt, 'text/html');
                var body = d.body;
                var kind = (body && body.getAttribute('data-kind')) || '';
                var box = d.querySelector('main .container, .container');
                var hasInteract = box && box.querySelector('.quiz-box, .vk, .term, .type-target');
                var info = {
                    ok: !!(box && kind === 'doc' && !hasInteract),
                    html: box ? box.innerHTML : '',
                    title: (d.querySelector('h1') || { textContent: '' }).textContent || ''
                };
                cache[url] = info;
                return info;
            }).catch(function () { return null; });
        }
        var stage = null, thumbs = null, curHref = '', zoomCards = [];
        function buildUI() {
            stage = document.createElement('div');
            stage.className = 'zoom-stage';
            stage.innerHTML = '<div class="zoom-head"><span class="zoom-title"></span>' +
                '<button type="button" class="zoom-btn zoom-new">↗ 在新页面打开</button>' +
                '<button type="button" class="zoom-btn zoom-close">✕ 关闭</button></div>' +
                '<div class="zoom-body"><p class="empty-hint">正在加载…</p></div>';
            document.body.appendChild(stage);
            stage.querySelector('.zoom-close').addEventListener('click', closeZoom);
            stage.querySelector('.zoom-new').addEventListener('click', function () { location.href = curHref; });
            stage.addEventListener('click', function (e) { if (e.target === stage) closeZoom(); });
            thumbs = document.createElement('div');
            thumbs.className = 'thumb-strip';
            thumbs.style.display = 'none';
            document.body.appendChild(thumbs);
        }
        function showDoc(href) {
            var title = stage.querySelector('.zoom-title');
            var body = stage.querySelector('.zoom-body');
            body.innerHTML = '<p class="empty-hint">正在加载…</p>';
            fetchDoc(href).then(function (info) {
                if (!info || !info.ok) { location.href = href; return; }
                title.textContent = info.title.trim() || href;
                body.innerHTML = info.html;
                body.scrollTop = 0;
            });
        }
        function openZoom(href, rect) {
            curHref = href;
            var grids = document.querySelectorAll('.card-grid');
            for (var i = 0; i < grids.length; i++) grids[i].classList.add('zoom-on');
            var h = '';
            for (var k = 0; k < zoomCards.length; k++) {
                h += '<button type="button" class="thumb' + (zoomCards[k].href === href ? ' on' : '') + '" data-href="' + zoomCards[k].href + '">' + XD.escapeHtml(zoomCards[k].title) + '</button>';
            }
            thumbs.innerHTML = h;
            thumbs.style.display = '';
            thumbs.querySelectorAll('.thumb').forEach(function (b) {
                b.addEventListener('click', function () {
                    var th = b.getAttribute('data-href');
                    if (th === curHref) return;
                    curHref = th;
                    thumbs.querySelectorAll('.thumb').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-href') === th); });
                    showDoc(th);
                });
            });
            var vw = window.innerWidth || document.documentElement.clientWidth || 800;
            var vh = window.innerHeight || document.documentElement.clientHeight || 600;
            var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            stage.style.transformOrigin = '0 0';
            stage.style.transform = 'translate(' + (cx - vw / 2) + 'px,' + (cy - vh / 2) + 'px) scale(' + (rect.width / vw) + ',' + (rect.height / vh) + ')';
            stage.style.opacity = '0';
            stage.classList.add('open');
            function fly() {
                stage.style.transition = 'transform .45s cubic-bezier(.22, .61, .36, 1), opacity .3s';
                stage.style.transform = 'translate(0,0) scale(1,1)';
                stage.style.opacity = '1';
            }
            if (window.requestAnimationFrame) requestAnimationFrame(fly);
            else setTimeout(fly, 16);
            showDoc(href);
        }
        function closeZoom() {
            var grids = document.querySelectorAll('.card-grid');
            for (var i = 0; i < grids.length; i++) grids[i].classList.remove('zoom-on');
            thumbs.style.display = 'none';
            var orig = null;
            var links = document.querySelectorAll('.module-card');
            for (var j = 0; j < links.length; j++) if (links[j].getAttribute('href') === curHref) { orig = links[j]; break; }
            if (orig) {
                var r = orig.getBoundingClientRect();
                var vw = window.innerWidth || document.documentElement.clientWidth || 800;
                var vh = window.innerHeight || document.documentElement.clientHeight || 600;
                var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                stage.style.transform = 'translate(' + (cx - vw / 2) + 'px,' + (cy - vh / 2) + 'px) scale(' + (r.width / vw) + ',' + (r.height / vh) + ')';
                stage.style.opacity = '0';
                setTimeout(function () {
                    stage.classList.remove('open');
                    stage.style.transition = '';
                    stage.style.transform = '';
                    stage.style.opacity = '';
                }, 430);
            } else {
                stage.classList.remove('open');
            }
        }
        document.addEventListener('click', function (e) {
            var c = e.target && e.target.closest ? e.target.closest('.module-card') : null;
            if (!c) return;
            var badge = c.querySelector('ul li');
            if (!badge || badge.textContent.indexOf('图文课') < 0) return; /* 测验/工具/目录整页跳转 */
            e.preventDefault();
            var href = c.getAttribute('href');
            var grid = c.closest('.card-grid') || c.parentElement;
            zoomCards = [];
            var links = grid.querySelectorAll('.module-card');
            for (var i = 0; i < links.length; i++) {
                var li = links[i].querySelector('ul li');
                if (li && li.textContent.indexOf('图文课') >= 0) {
                    zoomCards.push({ href: links[i].getAttribute('href'), title: (links[i].querySelector('b') || { textContent: '' }).textContent || '' });
                }
            }
            if (!stage) buildUI();
            openZoom(href, c.getBoundingClientRect());
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && stage && stage.classList.contains('open')) closeZoom();
        });
    })();

    /* ========== 页面初始化（面包屑 + 前后页 + 进度 + 代码复制） ========== */
    function pageInit() {
        XD.renderCrumbs();
        XD.renderPrevNext();
        // 高级化注入：返回顶部按钮 + 滚动渐显 + 首页首次导游（全站一次生效）
        if (!document.querySelector('.to-top')) {
            var topBtn = document.createElement('button');
            topBtn.className = 'to-top';
            topBtn.type = 'button';
            topBtn.setAttribute('aria-label', '回到顶部');
            topBtn.textContent = '↑';
            document.body.appendChild(topBtn);
            topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
            var onScroll = function () {
                var y = window.pageYOffset || document.documentElement.scrollTop || 0;
                topBtn.classList.toggle('show', y > 320);
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }
        (function revealFx() {
            var els = document.querySelectorAll('.reveal');
            if (!els.length) return;
            if ('IntersectionObserver' in window) {
                var obs = new IntersectionObserver(function (es) {
                    for (var i = 0; i < es.length; i++) {
                        if (es[i].isIntersecting) { es[i].target.classList.add('in'); obs.unobserve(es[i].target); }
                    }
                }, { threshold: 0.12 });
                for (var j = 0; j < els.length; j++) obs.observe(els[j]);
            } else {
                for (var k = 0; k < els.length; k++) els[k].classList.add('in');
            }
        })();
        if (XD.guide) {
            var pf = document.body.getAttribute('data-page');
            var hp0 = location.pathname || '';
            var last0 = hp0.split('/').pop();
            if ((!pf || pf === 'index.html') && (!last0 || last0 === '' || last0 === 'index.html')) XD.guide.maybe();
        }
        var f = document.body.getAttribute('data-page');
        var kind = document.body.getAttribute('data-kind') || 'doc';
        // 适老操作条：朗读 / 收藏 / 打印（门户页除外，全站 JS 注入）
        if (f && f !== 'index.html' && f !== '1.html') {
            var hdr = document.querySelector('.site-header');
            var badge = hdr ? hdr.querySelector('.mod-badge') : null;
            if (badge) {
                var canSpeak = kind === 'doc' && ('speechSynthesis' in window);
                var ah = '<span class="page-actions">';
                if (canSpeak) ah += '<button type="button" class="page-act" data-act="speak" title="朗读本页">🔊</button>';
                ah += '<button type="button" class="page-act" data-act="fav" title="收藏本页"><span class="fav-ic">' + (XD.fav.has(f) ? '★' : '☆') + '</span></button>';
                ah += '<button type="button" class="page-act" data-act="print" title="打印本页">🖨</button></span>';
                badge.insertAdjacentHTML('afterend', ah);
                var abar = hdr.querySelector('.page-actions');
                if (abar) abar.addEventListener('click', function (e) {
                    var b = e.target.closest('.page-act');
                    if (!b) return;
                    var act = b.getAttribute('data-act');
                    if (act === 'print') { window.print(); }
                    else if (act === 'fav') {
                        var on = XD.fav.toggle(f);
                        var ic = b.querySelector('.fav-ic');
                        if (ic) ic.textContent = on ? '★' : '☆';
                        XD.showToast(on ? '⭐ 已收藏，可在仪表盘「我的收藏」里找到' : '已取消收藏');
                    }
                    else if (act === 'speak') { XD.speak.toggle(); }
                });
            }
        }
        if (XD.eyeCare) XD.eyeCare.start();
        if (f && kind !== 'dir') {
            XD.progress.markRead(f);
            var id = f.replace(/\.html$/, '');
            var top = id.charAt(0).toUpperCase();
            if (XD.modIds.indexOf(top) >= 0) XD.studyLog.add({ type: kind === 'quiz' ? 'quiz' : kind === 'tool' ? 'practice' : 'read', itemId: id, mod: top });
            XD.achieve.checkProgress(XD.progress.all());
        }
        var blocks = document.querySelectorAll('.code-block');
        for (var i = 0; i < blocks.length; i++) {
            (function (b) {
                if (b.querySelector('.copy-btn')) return;
                var btn = document.createElement('button');
                btn.className = 'copy-btn';
                btn.textContent = '复制';
                btn.onclick = function () { XD.copy(b.innerText.replace(/^复制\n?/, '')); };
                b.appendChild(btn);
            })(blocks[i]);
        }
    }
    if (document.body && document.readyState !== 'loading') {
        pageInit();
    } else {
        document.addEventListener('DOMContentLoaded', pageInit);
    }
})();
