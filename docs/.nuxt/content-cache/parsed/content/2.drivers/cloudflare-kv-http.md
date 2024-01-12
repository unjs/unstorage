{"parsed":{"_path":"/drivers/cloudflare-kv-http","_dir":"drivers","_draft":false,"_partial":false,"_locale":"","title":"Cloudflare KV (http)","description":"Store data in Cloudflare KV using the Cloudflare API v4.","body":{"type":"root","children":[{"type":"element","tag":"h2","props":{"id":"usage"},"children":[{"type":"text","value":"Usage"}]},{"type":"element","tag":"callout","props":{"color":"blue","icon":"i-ph-info-duotone","target":"_blank","to":"https://developers.cloudflare.com/api/operations/workers-kv-namespace-list-namespaces"},"children":[{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"Learn more about Cloudflare KV API."}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"You need to create a KV namespace. See "},{"type":"element","tag":"a","props":{"href":"https://developers.cloudflare.com/workers/runtime-apis/kv#kv-bindings","rel":["nofollow"]},"children":[{"type":"text","value":"KV Bindings"}]},{"type":"text","value":" for more information."}]},{"type":"element","tag":"p","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"text","value":"Note:"}]},{"type":"text","value":" This driver uses native fetch and works universally! For using directly in a cloudflare worker environment, please use "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"cloudflare-kv-binding"}]},{"type":"text","value":" driver for best performance!"}]},{"type":"element","tag":"pre","props":{"className":"language-js shiki shiki-themes min-light min-dark material-theme-palenight","code":"import { createStorage } from \"unstorage\";\nimport cloudflareKVHTTPDriver from \"unstorage/drivers/cloudflare-kv-http\";\n\n// Using `apiToken`\nconst storage = createStorage({\n  driver: cloudflareKVHTTPDriver({\n    accountId: \"my-account-id\",\n    namespaceId: \"my-kv-namespace-id\",\n    apiToken: \"supersecret-api-token\",\n  }),\n});\n\n// Using `email` and `apiKey`\nconst storage = createStorage({\n  driver: cloudflareKVHTTPDriver({\n    accountId: \"my-account-id\",\n    namespaceId: \"my-kv-namespace-id\",\n    email: \"me@example.com\",\n    apiKey: \"my-api-key\",\n  }),\n});\n\n// Using `userServiceKey`\nconst storage = createStorage({\n  driver: cloudflareKVHTTPDriver({\n    accountId: \"my-account-id\",\n    namespaceId: \"my-kv-namespace-id\",\n    userServiceKey: \"v1.0-my-service-key\",\n  }),\n});\n","language":"js","meta":"","style":""},"children":[{"type":"element","tag":"code","props":{"__ignoreMap":""},"children":[{"type":"element","tag":"span","props":{"class":"line","line":1},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"import"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" {"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":" from"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"unstorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":2},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"import"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" cloudflareKVHTTPDriver "}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"from"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"unstorage/drivers/cloudflare-kv-http"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":3},"children":[{"type":"element","tag":"span","props":{"emptyLinePlaceholder":true},"children":[{"type":"text","value":"\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":4},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#C2C3C5;--shiki-default:#6B737C;--shiki-dark:#676E95;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"// Using `apiToken`\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":5},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#C792EA"},"children":[{"type":"text","value":"const"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#1976D2;--shiki-default:#79B8FF;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" storage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" ="}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":6},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"  driver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" cloudflareKVHTTPDriver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":7},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    accountId"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"my-account-id"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":8},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    namespaceId"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"my-kv-namespace-id"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":9},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    apiToken"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"supersecret-api-token"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":10},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"  }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":11},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"}"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":12},"children":[{"type":"element","tag":"span","props":{"emptyLinePlaceholder":true},"children":[{"type":"text","value":"\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":13},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#C2C3C5;--shiki-default:#6B737C;--shiki-dark:#676E95;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"// Using `email` and `apiKey`\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":14},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#C792EA"},"children":[{"type":"text","value":"const"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#1976D2;--shiki-default:#79B8FF;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" storage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" ="}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":15},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"  driver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" cloudflareKVHTTPDriver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":16},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    accountId"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"my-account-id"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":17},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    namespaceId"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"my-kv-namespace-id"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":18},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    email"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"me@example.com"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":19},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    apiKey"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"my-api-key"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":20},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"  }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":21},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"}"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":22},"children":[{"type":"element","tag":"span","props":{"emptyLinePlaceholder":true},"children":[{"type":"text","value":"\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":23},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#C2C3C5;--shiki-default:#6B737C;--shiki-dark:#676E95;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"// Using `userServiceKey`\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":24},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#C792EA"},"children":[{"type":"text","value":"const"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#1976D2;--shiki-default:#79B8FF;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" storage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" ="}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":25},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"  driver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" cloudflareKVHTTPDriver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":26},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    accountId"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"my-account-id"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":27},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    namespaceId"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"my-kv-namespace-id"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":28},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    userServiceKey"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"v1.0-my-service-key"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":29},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"  }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":30},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"}"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"text","value":"Options:"}]}]},{"type":"element","tag":"ul","props":{},"children":[{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"accountId"}]},{"type":"text","value":": Cloudflare account ID."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"namespaceId"}]},{"type":"text","value":": The ID of the KV namespace to target. "},{"type":"element","tag":"strong","props":{},"children":[{"type":"text","value":"Note:"}]},{"type":"text","value":" be sure to use the namespace's ID, and not the name or binding used in a worker environment."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"apiToken"}]},{"type":"text","value":": API Token generated from the "},{"type":"element","tag":"a","props":{"href":"https://dash.cloudflare.com/profile/api-tokens","rel":["nofollow"]},"children":[{"type":"text","value":"User Profile 'API Tokens' page"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"email"}]},{"type":"text","value":": Email address associated with your account. May be used along with "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"apiKey"}]},{"type":"text","value":" to authenticate in place of "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"apiToken"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"apiKey"}]},{"type":"text","value":": API key generated on the \"My Account\" page of the Cloudflare console. May be used along with "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"email"}]},{"type":"text","value":" to authenticate in place of "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"apiToken"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"userServiceKey"}]},{"type":"text","value":": A special Cloudflare API key good for a restricted set of endpoints. Always begins with \"v1.0-\", may vary in length. May be used to authenticate in place of "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"apiToken"}]},{"type":"text","value":" or "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"apiKey"}]},{"type":"text","value":" and "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"email"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"apiURL"}]},{"type":"text","value":": Custom API URL. Default is "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"https://api.cloudflare.com"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"base"}]},{"type":"text","value":": Adds prefix to all stored keys"}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"text","value":"Supported methods:"}]}]},{"type":"element","tag":"ul","props":{},"children":[{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"getItem"}]},{"type":"text","value":": Maps to "},{"type":"element","tag":"a","props":{"href":"https://api.cloudflare.com/#workers-kv-namespace-read-key-value-pair","rel":["nofollow"]},"children":[{"type":"text","value":"Read key-value pair"}]},{"type":"text","value":" "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name"}]}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"hasItem"}]},{"type":"text","value":": Maps to "},{"type":"element","tag":"a","props":{"href":"https://api.cloudflare.com/#workers-kv-namespace-read-key-value-pair","rel":["nofollow"]},"children":[{"type":"text","value":"Read key-value pair"}]},{"type":"text","value":" "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name"}]},{"type":"text","value":". Returns "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"true"}]},{"type":"text","value":" if "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"<parsed response body>.success"}]},{"type":"text","value":" is "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"true"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"setItem"}]},{"type":"text","value":": Maps to "},{"type":"element","tag":"a","props":{"href":"https://api.cloudflare.com/#workers-kv-namespace-write-key-value-pair","rel":["nofollow"]},"children":[{"type":"text","value":"Write key-value pair"}]},{"type":"text","value":" "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"PUT accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name"}]}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"removeItem"}]},{"type":"text","value":": Maps to "},{"type":"element","tag":"a","props":{"href":"https://api.cloudflare.com/#workers-kv-namespace-delete-key-value-pair","rel":["nofollow"]},"children":[{"type":"text","value":"Delete key-value pair"}]},{"type":"text","value":" "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"DELETE accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/values/:key_name"}]}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"getKeys"}]},{"type":"text","value":": Maps to "},{"type":"element","tag":"a","props":{"href":"https://api.cloudflare.com/#workers-kv-namespace-list-a-namespace-s-keys","rel":["nofollow"]},"children":[{"type":"text","value":"List a Namespace's Keys"}]},{"type":"text","value":" "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"GET accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/keys"}]}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"clear"}]},{"type":"text","value":": Maps to "},{"type":"element","tag":"a","props":{"href":"https://api.cloudflare.com/#workers-kv-namespace-delete-multiple-key-value-pairs","rel":["nofollow"]},"children":[{"type":"text","value":"Delete key-value pair"}]},{"type":"text","value":" "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"DELETE accounts/:account_identifier/storage/kv/namespaces/:namespace_identifier/bulk"}]}]}]},{"type":"element","tag":"style","props":{},"children":[{"type":"text","value":"html.dark .shiki span {color: var(--shiki-dark);background: var(--shiki-dark-bg);font-style: var(--shiki-dark-font-style);font-weight: var(--shiki-dark-font-weight);text-decoration: var(--shiki-dark-text-decoration);}html .shiki span {color: var(--shiki-default);background: var(--shiki-default-bg);font-style: var(--shiki-default-font-style);font-weight: var(--shiki-default-font-weight);text-decoration: var(--shiki-default-text-decoration);}html.light .shiki span {color: var(--shiki-light);background: var(--shiki-light-bg);font-style: var(--shiki-light-font-style);font-weight: var(--shiki-light-font-weight);text-decoration: var(--shiki-light-text-decoration);}html .light .shiki span {color: var(--shiki-light);background: var(--shiki-light-bg);font-style: var(--shiki-light-font-style);font-weight: var(--shiki-light-font-weight);text-decoration: var(--shiki-light-text-decoration);}html .default .shiki span {color: var(--shiki-default);background: var(--shiki-default-bg);font-style: var(--shiki-default-font-style);font-weight: var(--shiki-default-font-weight);text-decoration: var(--shiki-default-text-decoration);}html .dark .shiki span {color: var(--shiki-dark);background: var(--shiki-dark-bg);font-style: var(--shiki-dark-font-style);font-weight: var(--shiki-dark-font-weight);text-decoration: var(--shiki-dark-text-decoration);}"}]}],"toc":{"title":"","searchDepth":2,"depth":2,"links":[{"id":"usage","depth":2,"text":"Usage"}]}},"_type":"markdown","_id":"content:2.drivers:cloudflare-kv-http.md","_source":"content","_file":"2.drivers/cloudflare-kv-http.md","_extension":"md"},"hash":"4hQbihaJq5"}