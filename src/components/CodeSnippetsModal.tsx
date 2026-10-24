import React, { useState } from 'react';
import { X, Check, Copy, Terminal, Code2 } from 'lucide-react';

interface CodeSnippetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  oneUrl: string;
  activeModel: string;
}

export const CodeSnippetsModal: React.FC<CodeSnippetsModalProps> = ({
  isOpen,
  onClose,
  oneUrl,
  activeModel,
}) => {
  const [activeTab, setActiveTab] = useState<'python' | 'node' | 'curl' | 'cursor' | 'env'>('python');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baseUrl = oneUrl.replace(/\/chat\/completions\/?$/, '');

  const snippets = {
    python: `from openai import OpenAI

# Point client to your NexusAI Unified Router
client = OpenAI(
    base_url="${baseUrl}",
    api_key="nexus-router-key", # Or pass your provider key
)

response = client.chat.completions.create(
    model="${activeModel}",
    messages=[
        {"role": "system", "content": "You are a helpful AI assistant."},
        {"role": "user", "content": "Explain how API routing works with local GGUF models."}
    ],
    temperature=0.7,
    stream=True
)

for chunk in response:
    content = chunk.choices[0].delta.content or ""
    print(content, end="", flush=True)
`,
    node: `import OpenAI from 'openai';

// Point OpenAI official SDK to NexusAI Unified Router
const client = new OpenAI({
  baseURL: '${baseUrl}',
  apiKey: 'nexus-router-key',
});

async function main() {
  const stream = await client.chat.completions.create({
    model: '${activeModel}',
    messages: [{ role: 'user', content: 'Hello from Node.js!' }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();
`,
    curl: `curl ${oneUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer optional-key" \\
  -d '{
    "model": "${activeModel}",
    "messages": [
      {"role": "user", "content": "Ping universal AI router."}
    ],
    "temperature": 0.7
  }'
`,
    cursor: `// In Cursor Settings -> Models -> OpenAI API Key:
// Base URL: ${baseUrl}
// Model Names to add:
// - ${activeModel}
// - llama-3.2-1b-instruct-q4
// - smollm2-360m-instruct-q4
// - qwen2.5-0.5b-instruct-q4
`,
    env: `# Environment file (.env) for your application or environment
OPENAI_BASE_URL="${baseUrl}"
OPENAI_API_BASE="${baseUrl}"
OPENAI_API_KEY="nexus-router-key"
AI_ROUTER_MODEL="${activeModel}"
`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Plug One-URL Into Any Codebase or Environment
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {(['python', 'node', 'curl', 'cursor', 'env'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'env' ? '.env Config' : tab}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Block */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-96">
          <pre>{snippets[activeTab]}</pre>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
          <span>Target Model: <code className="text-emerald-400 font-mono">{activeModel}</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
