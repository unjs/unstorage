{"parsed":{"_path":"/drivers/azure-cosmos","_dir":"drivers","_draft":false,"_partial":false,"_locale":"","title":"Azure Cosmos DB","description":"Store data in Azure Cosmos DB NoSQL API documents.","body":{"type":"root","children":[{"type":"element","tag":"h2","props":{"id":"usage"},"children":[{"type":"text","value":"Usage"}]},{"type":"element","tag":"callout","props":{"color":"blue","icon":"i-ph-info-duotone","target":"_blank","to":"https://azure.microsoft.com/en-us/services/cosmos-db/"},"children":[{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"Learn more about Azure Cosmos DB."}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"This driver stores KV information in a NoSQL API Cosmos DB collection as documents. It uses the "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"id"}]},{"type":"text","value":" field as the key and adds "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"value"}]},{"type":"text","value":" and "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"modified"}]},{"type":"text","value":" fields to the document."}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"To use it, you will need to install "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"@azure/cosmos"}]},{"type":"text","value":" and "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"@azure/identity"}]},{"type":"text","value":" in your project:"}]},{"type":"element","tag":"pre","props":{"className":"language-bash shiki shiki-themes min-light min-dark material-theme-palenight","code":"npm i @azure/cosmos @azure/identity\n","language":"bash","meta":"","style":""},"children":[{"type":"element","tag":"code","props":{"__ignoreMap":""},"children":[{"type":"element","tag":"span","props":{"class":"line","line":1},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#FFCB6B"},"children":[{"type":"text","value":"npm"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#2B5581;--shiki-default:#9DB1C5;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":" i"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#2B5581;--shiki-default:#9DB1C5;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":" @azure/cosmos"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#2B5581;--shiki-default:#9DB1C5;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":" @azure/identity\n"}]}]}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"text","value":"Usage:"}]},{"type":"element","tag":"pre","props":{"className":"language-js shiki shiki-themes min-light min-dark material-theme-palenight","code":"import { createStorage } from \"unstorage\";\nimport azureCosmos from \"unstorage/drivers/azure-cosmos\";\n\nconst storage = createStorage({\n  driver: azureCosmos({\n    endpoint: \"ENDPOINT\",\n    accountKey: \"ACCOUNT_KEY\",\n  }),\n});\n","language":"js","meta":"","style":""},"children":[{"type":"element","tag":"code","props":{"__ignoreMap":""},"children":[{"type":"element","tag":"span","props":{"class":"line","line":1},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"import"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" {"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":" from"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"unstorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":2},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"import"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" azureCosmos "}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF;--shiki-light-font-style:inherit;--shiki-default-font-style:inherit;--shiki-dark-font-style:italic"},"children":[{"type":"text","value":"from"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"unstorage/drivers/azure-cosmos"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":3},"children":[{"type":"element","tag":"span","props":{"emptyLinePlaceholder":true},"children":[{"type":"text","value":"\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":4},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#C792EA"},"children":[{"type":"text","value":"const"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#1976D2;--shiki-default:#79B8FF;--shiki-dark:#BABED8"},"children":[{"type":"text","value":" storage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" ="}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" createStorage"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":5},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"  driver"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#6F42C1;--shiki-default:#B392F0;--shiki-dark:#82AAFF"},"children":[{"type":"text","value":" azureCosmos"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":"("}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"{\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":6},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    endpoint"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"ENDPOINT"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":7},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#F07178"},"children":[{"type":"text","value":"    accountKey"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#D32F2F;--shiki-default:#F97583;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":":"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":" \""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#C3E88D"},"children":[{"type":"text","value":"ACCOUNT_KEY"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#22863A;--shiki-default:#FFAB70;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"\""}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":8},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"  }"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#212121;--shiki-default:#BBBBBB;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":",\n"}]}]},{"type":"element","tag":"span","props":{"class":"line","line":9},"children":[{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":"}"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#BABED8"},"children":[{"type":"text","value":")"}]},{"type":"element","tag":"span","props":{"style":"--shiki-light:#24292EFF;--shiki-default:#B392F0;--shiki-dark:#89DDFF"},"children":[{"type":"text","value":";\n"}]}]}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"text","value":"Authentication:"}]}]},{"type":"element","tag":"ul","props":{},"children":[{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"DefaultAzureCredential"}]}]},{"type":"text","value":": This is the recommended way to authenticate. It will use managed identity or environment variables to authenticate the request. It will also work in a local environment by trying to use Azure CLI or Azure PowerShell to authenticate. "},{"type":"element","tag":"br","props":{},"children":[]},{"type":"text","value":"\n⚠️ Make sure that your Managed Identity or personal account has at least "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"Cosmos DB Built-in Data Contributor"}]},{"type":"text","value":" role assigned to it. If you already are "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"Contributor"}]},{"type":"text","value":" or "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"Owner"}]},{"type":"text","value":" on the resource it should also be enough, but does not accomplish a model of least privilege."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"accountKey"}]}]},{"type":"text","value":": CosmosDB account key. If not provided, the driver will use the DefaultAzureCredential (recommended)."}]}]},{"type":"element","tag":"p","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"text","value":"Options:"}]}]},{"type":"element","tag":"ul","props":{},"children":[{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"strong","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"endpoint"}]}]},{"type":"text","value":" (required): CosmosDB endpoint in the format of "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"https://<account>.documents.azure.com:443/"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"accountKey"}]},{"type":"text","value":": CosmosDB account key. If not provided, the driver will use the DefaultAzureCredential (recommended)."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"databaseName"}]},{"type":"text","value":": The name of the database to use. Defaults to "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"unstorage"}]},{"type":"text","value":"."}]},{"type":"element","tag":"li","props":{},"children":[{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"containerName"}]},{"type":"text","value":": The name of the container to use. Defaults to "},{"type":"element","tag":"code","props":{"className":[]},"children":[{"type":"text","value":"unstorage"}]},{"type":"text","value":"."}]}]},{"type":"element","tag":"style","props":{},"children":[{"type":"text","value":"html.dark .shiki span {color: var(--shiki-dark);background: var(--shiki-dark-bg);font-style: var(--shiki-dark-font-style);font-weight: var(--shiki-dark-font-weight);text-decoration: var(--shiki-dark-text-decoration);}html .shiki span {color: var(--shiki-default);background: var(--shiki-default-bg);font-style: var(--shiki-default-font-style);font-weight: var(--shiki-default-font-weight);text-decoration: var(--shiki-default-text-decoration);}html.light .shiki span {color: var(--shiki-light);background: var(--shiki-light-bg);font-style: var(--shiki-light-font-style);font-weight: var(--shiki-light-font-weight);text-decoration: var(--shiki-light-text-decoration);}html .light .shiki span {color: var(--shiki-light);background: var(--shiki-light-bg);font-style: var(--shiki-light-font-style);font-weight: var(--shiki-light-font-weight);text-decoration: var(--shiki-light-text-decoration);}html .default .shiki span {color: var(--shiki-default);background: var(--shiki-default-bg);font-style: var(--shiki-default-font-style);font-weight: var(--shiki-default-font-weight);text-decoration: var(--shiki-default-text-decoration);}html .dark .shiki span {color: var(--shiki-dark);background: var(--shiki-dark-bg);font-style: var(--shiki-dark-font-style);font-weight: var(--shiki-dark-font-weight);text-decoration: var(--shiki-dark-text-decoration);}"}]}],"toc":{"title":"","searchDepth":2,"depth":2,"links":[{"id":"usage","depth":2,"text":"Usage"}]}},"_type":"markdown","_id":"content:2.drivers:azure-cosmos.md","_source":"content","_file":"2.drivers/azure-cosmos.md","_extension":"md"},"hash":"kk7K5irCnl"}