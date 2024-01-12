{"parsed":{"_path":"/drivers/lru-cache","_dir":"drivers","_draft":false,"_partial":false,"_locale":"","title":"LRU Cache","description":"Keeps cached data in memory using LRU Cache.","body":{"type":"root","children":[{"type":"element","tag":"h2","props":{"id":"usage"},"children":[{"type":"text","value":"Usage"}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"Keeps cached data in memory using "},{"type":"element","tag":"a","props":{"href":"https://www.npmjs.com/package/lru-cache","rel":["nofollow"]},"children":[{"type":"text","value":"LRU Cache"}]},{"type":"text","value":"."}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"See "},{"type":"element","tag":"a","props":{"href":"https://www.npmjs.com/package/lru-cache","rel":["nofollow"]},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"lru-cache"}]}]},{"type":"text","value":" for supported options."}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"By default "},{"type":"element","tag":"a","props":{"href":"https://www.npmjs.com/package/lru-cache#max","rel":["nofollow"]},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"max"}]}]},{"type":"text","value":" setting is set to "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"1000"}]},{"type":"text","value":" items."}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"A default behavior for "},{"type":"element","tag":"a","props":{"href":"https://www.npmjs.com/package/lru-cache#sizecalculation","rel":["nofollow"]},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"sizeCalculation"}]}]},{"type":"text","value":" option is implemented based on buffer size of both key and value."}]},{"type":"element","tag":"pre","props":{"className":"language-js shiki shiki-themes min-light min-dark material-theme-palenight","code":"import { createStorage } from \"unstorage\";\nimport lruCacheDriver from \"unstorage/drivers/lru-cache\";\n\nconst storage = createStorage({\n  driver: lruCacheDriver(),\n});\n","language":"js","meta":"","style":""},"children":[{"type":"element","tag":"code","props":{"__ignoreMap":""},"children":[{"type":"element","tag":"span","props":{"class":"line","line":1},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"import"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" {"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":" from"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"unstorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":2},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"import"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" lruCacheDriver "}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"from"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"unstorage/drivers/lru-cache"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":3},"children":[{"type":"element","tag":"span","props":{"emptyLinePlaceholder":true},"children":[{"type":"text","value":"\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":4},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#C792EA"},"children":[{"type":"text","value":"const"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#1976D2;--shiki-default:#79B8FF;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" storage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" ="}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":5},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"  driver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" lruCacheDriver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"()"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":6},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"}"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]}]}]},{"type":"element","tag":"style","props":{},"children":[{"type":"text","value":"html.dark .shiki span {color: var(--shiki-dark);background: var(--shiki-dark-bg);font-style: var(--shiki-dark-font-style);font-weight: var(--shiki-dark-font-weight);text-decoration: var(--shiki-dark-text-decoration);}html .shiki span {color: var(--shiki-default);background: var(--shiki-default-bg);font-style: var(--shiki-default-font-style);font-weight: var(--shiki-default-font-weight);text-decoration: var(--shiki-default-text-decoration);}html.light .shiki span {color: var(--shiki-light);background: var(--shiki-light-bg);font-style: var(--shiki-light-font-style);font-weight: var(--shiki-light-font-weight);text-decoration: var(--shiki-light-text-decoration);}html .light .shiki span {color: var(--shiki-light);background: var(--shiki-light-bg);font-style: var(--shiki-light-font-style);font-weight: var(--shiki-light-font-weight);text-decoration: var(--shiki-light-text-decoration);}html .default .shiki span {color: var(--shiki-default);background: var(--shiki-default-bg);font-style: var(--shiki-default-font-style);font-weight: var(--shiki-default-font-weight);text-decoration: var(--shiki-default-text-decoration);}html .dark .shiki span {color: var(--shiki-dark);background: var(--shiki-dark-bg);font-style: var(--shiki-dark-font-style);font-weight: var(--shiki-dark-font-weight);text-decoration: var(--shiki-dark-text-decoration);}"}]}],"toc":{"title":"","searchDepth":2,"depth":2,"links":[{"id":"usage","depth":2,"text":"Usage"}]}},"_type":"markdown","_id":"content:2.drivers:lru-cache.md","_source":"content","_file":"2.drivers/lru-cache.md","_extension":"md"},"hash":"k179N1gjt1"}