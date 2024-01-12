{"parsed":{"_path":"/drivers/vercel-kv","_dir":"drivers","_draft":false,"_partial":false,"_locale":"","title":"Vercel KV","description":"Store data in a Vercel KV Store.","body":{"type":"root","children":[{"type":"element","tag":"callout","props":{"color":"blue","icon":"i-ph-info-duotone","target":"_blank","to":"https://vercel.com/docs/storage/vercel-kv"},"children":[{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"Learn more about Vercel KV."}]}]},{"type":"element","tag":"callout","props":{"color":"amber","icon":"i-ph-warning-duotone"},"children":[{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"Vercel KV driver is in beta. Please check "},{"type":"element","tag":"a","props":{"href":"https://vercel.com/docs/storage/vercel-kv/limits","rel":["nofollow"]},"children":[{"type":"text","value":"Vercel KV Limits"}]},{"type":"text","value":" and "},{"type":"element","tag":"a","props":{"href":"https://github.com/unjs/unstorage/issues/218","rel":["nofollow"]},"children":[{"type":"text","value":"unjs/unstorage#218"}]},{"type":"text","value":" for known issues and possible workarounds."}]}]},{"type":"element","tag":"pre","props":{"className":"language-js shiki shiki-themes min-light min-dark material-theme-palenight","code":"import { createStorage } from \"unstorage\";\nimport vercelKVDriver from \"unstorage/drivers/vercel-kv\";\n\nconst storage = createStorage({\n  driver: vercelKVDriver({\n    // url: \"https://<your-project-slug>.kv.vercel-storage.com\", // KV_REST_API_URL\n    // token: \"<your secret token>\", // KV_REST_API_TOKEN\n    // base: \"test\",\n    // env: \"KV\",\n    // ttl: 60, // in seconds\n  }),\n});\n","language":"js","meta":"","style":""},"children":[{"type":"element","tag":"code","props":{"__ignoreMap":""},"children":[{"type":"element","tag":"span","props":{"class":"line","line":1},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"import"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" {"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":" from"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"unstorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":2},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"import"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" vercelKVDriver "}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"from"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"unstorage/drivers/vercel-kv"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":3},"children":[{"type":"element","tag":"span","props":{"emptyLinePlaceholder":true},"children":[{"type":"text","value":"\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":4},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#C792EA"},"children":[{"type":"text","value":"const"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#1976D2;--shiki-default:#79B8FF;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" storage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" ="}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":5},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"  driver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" vercelKVDriver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":6},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#C2C3C5;--shiki-default:#6B737C;--shiki-dark:#676E95;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"    // url: \"https://<your-project-slug>.kv.vercel-storage.com\", // KV_REST_API_URL\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":7},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#C2C3C5;--shiki-default:#6B737C;--shiki-dark:#676E95;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"    // token: \"<your secret token>\", // KV_REST_API_TOKEN\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":8},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#C2C3C5;--shiki-default:#6B737C;--shiki-dark:#676E95;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"    // base: \"test\",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":9},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#C2C3C5;--shiki-default:#6B737C;--shiki-dark:#676E95;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"    // env: \"KV\",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":10},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#C2C3C5;--shiki-default:#6B737C;--shiki-dark:#676E95;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"    // ttl: 60, // in seconds\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":11},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"  }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":12},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"}"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"To use, you will need to install "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"@vercel/kv"}]},{"type":"text","value":" dependency in your project:"}]},{"type":"element","tag":"pre","props":{"className":"language-json shiki shiki-themes min-light min-dark material-theme-palenight","code":"{\n  \"dependencies\": {\n    \"@vercel/kv\": \"latest\"\n  }\n}\n","language":"json","meta":"","style":""},"children":[{"type":"element","tag":"code","props":{"__ignoreMap":""},"children":[{"type":"element","tag":"span","props":{"class":"line","line":1},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":2},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F8F8F8;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"  \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F8F8F8;--shiki-dark:#C792EA"},"children":[{"type":"text","value":"dependencies"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F8F8F8;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" {\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":3},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F8F8F8;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"    \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F8F8F8;--shiki-dark:#FFCB6B"},"children":[{"type":"text","value":"@vercel/kv"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F8F8F8;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"latest"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\"\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":4},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"  }\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":5},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"}\n"}]}]}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"text","value":"Note:"}]},{"type":"text","value":" For driver options type support, you might need to install "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"@upstash/redis"}]},{"type":"text","value":" dev dependency as well."}]},{"type":"element","tag":"p","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"text","value":"Options:"}]}]},{"type":"element","tag":"ul","props":{},"children":[{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"url"}]},{"type":"text","value":": Rest API URL to use for connecting to your Vercel KV store. Default is "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"KV_REST_API_URL"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"token"}]},{"type":"text","value":": Rest API Token to use for connecting to your Vercel KV store. Default is "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"KV_REST_API_TOKEN"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"base"}]},{"type":"text","value":": "},{"type":"element","tag":"span","props":{},"children":[{"type":"text","value":"optional"}]},{"type":"text","value":" Prefix to use for all keys. Can be used for namespacing."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"env"}]},{"type":"text","value":": "},{"type":"element","tag":"span","props":{},"children":[{"type":"text","value":"optional"}]},{"type":"text","value":" Flag to customzize environment variable prefix (Default is "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"KV"}]},{"type":"text","value":"). Set to "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"false"}]},{"type":"text","value":" to disable env inference for "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"url"}]},{"type":"text","value":" and "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"token"}]},{"type":"text","value":" options."}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"See "},{"type":"element","tag":"a","props":{"href":"https://docs.upstash.com/redis/sdks/javascriptsdk/advanced","rel":["nofollow"]},"children":[{"type":"text","value":"@upstash/redis"}]},{"type":"text","value":" for all available options."}]},{"type":"element","tag":"style","props":{},"children":[{"type":"text","value":"html.dark .shiki span {color: var(--shiki-dark);background: var(--shiki-dark-bg);font-style: var(--shiki-dark-font-style);font-weight: var(--shiki-dark-font-weight);text-decoration: var(--shiki-dark-text-decoration);}html .shiki span {color: var(--shiki-default);background: var(--shiki-default-bg);font-style: var(--shiki-default-font-style);font-weight: var(--shiki-default-font-weight);text-decoration: var(--shiki-default-text-decoration);}html.light .shiki span {color: var(--shiki-light);background: var(--shiki-light-bg);font-style: var(--shiki-light-font-style);font-weight: var(--shiki-light-font-weight);text-decoration: var(--shiki-light-text-decoration);}html .light .shiki span {color: var(--shiki-light);background: var(--shiki-light-bg);font-style: var(--shiki-light-font-style);font-weight: var(--shiki-light-font-weight);text-decoration: var(--shiki-light-text-decoration);}html .default .shiki span {color: var(--shiki-default);background: var(--shiki-default-bg);font-style: var(--shiki-default-font-style);font-weight: var(--shiki-default-font-weight);text-decoration: var(--shiki-default-text-decoration);}html .dark .shiki span {color: var(--shiki-dark);background: var(--shiki-dark-bg);font-style: var(--shiki-dark-font-style);font-weight: var(--shiki-dark-font-weight);text-decoration: var(--shiki-dark-text-decoration);}"}]}],"toc":{"title":"","searchDepth":2,"depth":2,"links":[]}},"_type":"markdown","_id":"content:2.drivers:vercel-kv.md","_source":"content","_file":"2.drivers/vercel-kv.md","_extension":"md"},"hash":"2cpH2ilWAF"}