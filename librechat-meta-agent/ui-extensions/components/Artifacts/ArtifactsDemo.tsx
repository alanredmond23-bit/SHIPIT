'use client';

import { useState } from 'react';
import { FileBox, Code2, Sparkles } from 'lucide-react';
import CodeArtifact from './CodeArtifact';
import ArtifactPanel, { Artifact, ArtifactVersion } from './ArtifactPanel';

/**
 * Demo component showing how to use the Artifacts system
 * This can be used as a reference or integrated into your chat interface
 */
export default function ArtifactsDemo() {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  // Sample artifacts
  const demoArtifacts: Artifact[] = [
    {
      id: 'art-1',
      type: 'code',
      title: 'User Authentication Service',
      filename: 'auth-service.ts',
      language: 'typescript',
      content: `import { hash, compare } from 'bcrypt';
import jwt from 'jsonwebtoken';

interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly SALT_ROUNDS = 10;

  async hashPassword(password: string): Promise<string> {
    return hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
  }

  generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  verifyToken(token: string): { userId: string } {
    return jwt.verify(token, this.JWT_SECRET) as { userId: string };
  }

  async login(email: string, password: string, getUser: (email: string) => Promise<User | null>) {
    const user = await getUser(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return {
      token: this.generateToken(user.id),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}`,
      createdAt: new Date(Date.now() - 172800000),
      updatedAt: new Date(Date.now() - 3600000),
      version: 3,
      description: 'Complete authentication service with JWT tokens',
    },
    {
      id: 'art-2',
      type: 'code',
      title: 'React Hook for API Calls',
      filename: 'use-api.ts',
      language: 'typescript',
      content: `import { useState, useEffect } from 'react';

interface UseApiOptions<T> {
  autoFetch?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>(
  url: string,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      const result = await response.json();
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.autoFetch) {
      fetchData();
    }
  }, [url]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}`,
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 7200000),
      version: 2,
      description: 'Custom React hook for making API calls with loading states',
    },
    {
      id: 'art-3',
      type: 'code',
      title: 'Python Data Processing',
      filename: 'data_processor.py',
      language: 'python',
      content: `import pandas as pd
from typing import List, Dict, Any

class DataProcessor:
    """Process and analyze data from CSV files."""

    def __init__(self, filepath: str):
        self.df = pd.read_csv(filepath)
        self.filepath = filepath

    def clean_data(self) -> None:
        """Remove duplicates and handle missing values."""
        # Remove duplicates
        self.df.drop_duplicates(inplace=True)

        # Fill missing numeric values with mean
        numeric_cols = self.df.select_dtypes(include=['number']).columns
        self.df[numeric_cols] = self.df[numeric_cols].fillna(
            self.df[numeric_cols].mean()
        )

        # Fill missing categorical values with mode
        categorical_cols = self.df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            self.df[col].fillna(self.df[col].mode()[0], inplace=True)

    def get_statistics(self) -> Dict[str, Any]:
        """Calculate basic statistics for the dataset."""
        return {
            'row_count': len(self.df),
            'column_count': len(self.df.columns),
            'numeric_summary': self.df.describe().to_dict(),
            'missing_values': self.df.isnull().sum().to_dict(),
            'data_types': self.df.dtypes.astype(str).to_dict(),
        }

    def filter_by_column(self, column: str, value: Any) -> pd.DataFrame:
        """Filter dataframe by column value."""
        return self.df[self.df[column] == value]

    def export_to_csv(self, output_path: str) -> None:
        """Export processed data to CSV."""
        self.df.to_csv(output_path, index=False)
        print(f"Data exported to {output_path}")`,
      createdAt: new Date(Date.now() - 43200000),
      updatedAt: new Date(Date.now() - 1800000),
      version: 1,
      description: 'Python class for processing and analyzing CSV data',
    },
  ];

  // Sample version history
  const versionHistory: Record<string, ArtifactVersion[]> = {
    'art-1': [
      {
        version: 1,
        content: `export class AuthService {
  async login(email: string, password: string) {
    // Basic login implementation
  }
}`,
        timestamp: new Date(Date.now() - 172800000),
        description: 'Initial implementation',
      },
      {
        version: 2,
        content: `import { hash, compare } from 'bcrypt';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return hash(password, 10);
  }

  async login(email: string, password: string) {
    // Added password hashing
  }
}`,
        timestamp: new Date(Date.now() - 86400000),
        description: 'Added password hashing',
      },
      {
        version: 3,
        content: demoArtifacts[0].content,
        timestamp: demoArtifacts[0].updatedAt,
        description: 'Added JWT token generation and full auth flow',
      },
    ],
    'art-2': [
      {
        version: 1,
        content: `export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  // Basic implementation
}`,
        timestamp: new Date(Date.now() - 86400000),
        description: 'Initial hook',
      },
      {
        version: 2,
        content: demoArtifacts[1].content,
        timestamp: demoArtifacts[1].updatedAt,
        description: 'Added error handling and callbacks',
      },
    ],
    'art-3': [
      {
        version: 1,
        content: demoArtifacts[2].content,
        timestamp: demoArtifacts[2].updatedAt,
        description: 'Initial version',
      },
    ],
  };

  const handleSave = (id: string, content: string) => {
    console.log('Saving artifact:', id);
    console.log('New content:', content);
    // Here you would typically make an API call to save the content
    alert('Artifact saved! (Demo mode - check console for details)');
  };

  const handleRestoreVersion = (id: string, version: number) => {
    console.log('Restoring artifact:', id, 'to version:', version);
    // Here you would typically make an API call to restore the version
    alert(`Restored to version ${version}! (Demo mode - check console)`);
  };

  const handleRun = (id: string, code: string) => {
    console.log('Running code from artifact:', id);
    console.log('Code:', code);
    // Here you would typically execute the code in a sandbox
    alert('Code execution triggered! (Demo mode - check console for code)');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Artifacts System Demo
            </h1>
            <p className="text-slate-400">
              Claude-style artifact/canvas system for LibreChat
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            Features
          </h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Syntax highlighting for 25+ languages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Copy, download, and run code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Version history with restore</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Edit mode with save/discard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Mobile-friendly with touch gestures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>Fullscreen mode</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Demo Artifacts Grid */}
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileBox className="w-6 h-6 text-indigo-400" />
          Sample Artifacts
        </h2>
        <p className="text-slate-400 mb-6">
          Click on any artifact to open it in the interactive panel
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoArtifacts.map((artifact) => (
            <button
              key={artifact.id}
              onClick={() => setSelectedArtifact(artifact)}
              className="card text-left hover:border-indigo-600 transition-colors group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400 group-hover:bg-indigo-600/30 transition-colors">
                  <Code2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-indigo-400 transition-colors">
                    {artifact.title}
                  </h3>
                  <p className="text-xs text-slate-500">{artifact.filename}</p>
                </div>
              </div>

              <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                {artifact.description}
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="px-2 py-1 bg-slate-800 rounded-full">
                  {artifact.language}
                </span>
                <span>v{artifact.version}</span>
                <span>•</span>
                <span>{artifact.content.split('\n').length} lines</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Inline Example */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Inline Code Display</h2>
        <p className="text-slate-400 mb-6">
          Example of CodeArtifact component used inline (not in a panel)
        </p>

        <CodeArtifact
          id="inline-demo"
          content={`// Hello World in TypeScript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));`}
          language="typescript"
          title="Quick Example"
          filename="hello.ts"
          editable={false}
          showLineNumbers={true}
        />
      </div>

      {/* Artifact Panel */}
      <ArtifactPanel
        isOpen={!!selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
        artifact={selectedArtifact || undefined}
        versions={selectedArtifact ? versionHistory[selectedArtifact.id] : []}
        onSave={handleSave}
        onRestoreVersion={handleRestoreVersion}
        onRun={handleRun}
        position="right"
        allowEdit={true}
      />
    </div>
  );
}
