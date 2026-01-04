import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryService } from '../../src/services/memory-service';
import { mockPool, mockLogger, mockAnthropic, createMockQueryResult, resetAllMocks } from '../setup';

describe('MemoryService', () => {
  let service: MemoryService;
  const TEST_API_KEY = 'test-api-key';

  beforeEach(() => {
    resetAllMocks();
    service = new MemoryService(mockPool as any, mockLogger as any, TEST_API_KEY);
  });

  describe('createMemory', () => {
    it('should create a memory with generated embedding and summary', async () => {
      const mockMemory = {
        id: 'mem-123',
        user_id: 'user-123',
        project_id: 'proj-123',
        content: 'User prefers dark mode',
        category: 'preference',
        enabled: true,
        importance_score: 0.8,
      };

      // Mock embedding generation
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce(
        new Array(1536).fill(0.01)
      );

      // Mock summary generation
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Prefers dark mode' }],
      });

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([mockMemory]));

      const result = await service.createMemory({
        user_id: 'user-123',
        project_id: 'proj-123',
        content: 'User prefers dark mode',
        category: 'preference',
        importance_score: 0.8,
      });

      expect(result).toEqual(mockMemory);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meta_memory_facts'),
        expect.any(Array)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { memory_id: 'mem-123', category: 'preference' },
        'Memory created'
      );
    });

    it('should use default category when not specified', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([]);
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Summary' }],
      });

      mockPool.query.mockResolvedValueOnce(createMockQueryResult([{ id: 'mem-123' }]));

      await service.createMemory({
        project_id: 'proj-123',
        content: 'Test content',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['fact'])
      );
    });

    it('should handle embedding generation errors', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockRejectedValueOnce(
        new Error('Embedding failed')
      );

      await expect(
        service.createMemory({
          project_id: 'proj-123',
          content: 'Test',
        })
      ).rejects.toThrow('Embedding failed');
    });
  });

  describe('listMemories', () => {
    it('should list memories with filters', async () => {
      const mockMemories = [
        {
          id: 'mem-1',
          user_id: 'user-123',
          project_id: 'proj-123',
          category: 'preference',
          enabled: true,
        },
        {
          id: 'mem-2',
          user_id: 'user-123',
          project_id: 'proj-123',
          category: 'fact',
          enabled: true,
        },
      ];

      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockMemories));

      const result = await service.listMemories({
        user_id: 'user-123',
        project_id: 'proj-123',
        enabled: true,
      });

      expect(result).toEqual(mockMemories);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
        expect.arrayContaining(['user-123', 'proj-123', true])
      );
    });

    it('should filter by category', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await service.listMemories({
        category: 'preference',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND category = $'),
        expect.arrayContaining(['preference'])
      );
    });

    it('should apply limit when specified', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await service.listMemories({
        limit: 10,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([10])
      );
    });

    it('should exclude expired memories', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await service.listMemories({});

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at IS NULL OR expires_at > NOW()'),
        expect.any(Array)
      );
    });
  });

  describe('getMemory', () => {
    it('should retrieve memory and update last_accessed_at', async () => {
      const mockMemory = {
        id: 'mem-123',
        content: 'Test memory',
      };

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([mockMemory]))
        .mockResolvedValueOnce(createMockQueryResult([])); // UPDATE query

      const result = await service.getMemory('mem-123');

      expect(result).toEqual(mockMemory);
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE meta_memory_facts SET last_accessed_at = NOW() WHERE id = $1',
        ['mem-123']
      );
    });

    it('should return null when memory not found', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getMemory('non-existent');

      expect(result).toBeNull();
    });

    it('should not update last_accessed_at when memory not found', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await service.getMemory('non-existent');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateMemory', () => {
    it('should update memory and regenerate embedding when content changes', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([0.1, 0.2]);
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'New summary' }],
      });

      mockPool.query.mockResolvedValueOnce(
        createMockQueryResult([{ id: 'mem-123', content: 'Updated content' }])
      );

      const result = await service.updateMemory('mem-123', {
        content: 'Updated content',
      });

      expect(result.content).toBe('Updated content');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('content = $1'),
        expect.any(Array)
      );
    });

    it('should update category without regenerating embedding', async () => {
      mockPool.query.mockResolvedValueOnce(
        createMockQueryResult([{ id: 'mem-123', category: 'instruction' }])
      );

      await service.updateMemory('mem-123', {
        category: 'instruction',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('category = $1'),
        expect.any(Array)
      );
    });

    it('should update enabled flag', async () => {
      mockPool.query.mockResolvedValueOnce(
        createMockQueryResult([{ id: 'mem-123', enabled: false }])
      );

      await service.updateMemory('mem-123', {
        enabled: false,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('enabled = $1'),
        expect.any(Array)
      );
    });

    it('should throw error when no fields to update', async () => {
      await expect(service.updateMemory('mem-123', {})).rejects.toThrow('No fields to update');
    });

    it('should throw error when memory not found', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        service.updateMemory('non-existent', { enabled: false })
      ).rejects.toThrow('Memory non-existent not found');
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await service.deleteMemory('mem-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM meta_memory_facts WHERE id = $1',
        ['mem-123']
      );
      expect(mockLogger.info).toHaveBeenCalledWith({ memory_id: 'mem-123' }, 'Memory deleted');
    });

    it('should throw error when memory not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      await expect(service.deleteMemory('non-existent')).rejects.toThrow(
        'Memory non-existent not found'
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.deleteMemory('mem-123')).rejects.toThrow('Database error');
    });
  });

  describe('searchMemories', () => {
    it('should perform semantic search with embeddings', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([0.1, 0.2]);

      const mockResults = [
        {
          id: 'mem-1',
          content: 'Similar memory',
          similarity: 0.95,
        },
      ];

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult(mockResults))
        .mockResolvedValueOnce(createMockQueryResult([])); // UPDATE last_accessed_at

      const result = await service.searchMemories({
        query: 'test query',
        project_id: 'proj-123',
      });

      expect(result).toEqual(mockResults);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('embedding <=>'),
        expect.any(Array)
      );
    });

    it('should use default limit and min_similarity', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([]);
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await service.searchMemories({
        query: 'test',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10'),
        expect.any(Array)
      );
    });

    it('should update last_accessed_at for retrieved memories', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([]);

      const mockResults = [{ id: 'mem-1' }, { id: 'mem-2' }];

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult(mockResults))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await service.searchMemories({ query: 'test' });

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE meta_memory_facts SET last_accessed_at = NOW() WHERE id = ANY($1)',
        [['mem-1', 'mem-2']]
      );
    });

    it('should not update last_accessed_at when no results', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([]);
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await service.searchMemories({ query: 'test' });

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractMemories', () => {
    it('should extract and auto-save memories from conversation', async () => {
      const conversation = [
        { role: 'user', content: 'I prefer Python over JavaScript' },
        { role: 'assistant', content: 'Noted. I will use Python examples.' },
      ];

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                content: 'User prefers Python over JavaScript',
                category: 'preference',
                importance_score: 0.8,
              },
            ]),
          },
        ],
      });

      vi.spyOn(service, 'createMemory').mockResolvedValueOnce({
        id: 'mem-123',
        content: 'User prefers Python over JavaScript',
      } as any);

      const result = await service.extractMemories({
        project_id: 'proj-123',
        conversation,
        auto_save: true,
      });

      expect(result).toHaveLength(1);
      expect(service.createMemory).toHaveBeenCalled();
    });

    it('should not save memories when auto_save is false', async () => {
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { content: 'Test', category: 'fact', importance_score: 0.5 },
            ]),
          },
        ],
      });

      vi.spyOn(service, 'createMemory');

      await service.extractMemories({
        project_id: 'proj-123',
        conversation: [{ role: 'user', content: 'Test' }],
        auto_save: false,
      });

      expect(service.createMemory).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON responses', async () => {
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Not valid JSON',
          },
        ],
      });

      const result = await service.extractMemories({
        project_id: 'proj-123',
        conversation: [{ role: 'user', content: 'Test' }],
      });

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('No JSON array found in response');
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'));

      const result = await service.extractMemories({
        project_id: 'proj-123',
        conversation: [{ role: 'user', content: 'Test' }],
      });

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getRelevantMemories', () => {
    it('should retrieve memories weighted by importance and similarity', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([0.1, 0.2]);

      const mockMemories = [
        { id: 'mem-1', importance_score: 0.9, similarity: 0.8 },
        { id: 'mem-2', importance_score: 0.7, similarity: 0.9 },
      ];

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult(mockMemories))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getRelevantMemories({
        project_id: 'proj-123',
        context: 'user preferences',
      });

      expect(result).toEqual(mockMemories);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('importance_score * (1 - (embedding <=> $1::vector))'),
        expect.any(Array)
      );
    });

    it('should filter by categories when specified', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([]);
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await service.getRelevantMemories({
        project_id: 'proj-123',
        context: 'test',
        categories: ['preference', 'instruction'],
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('category = ANY($'),
        expect.arrayContaining([['preference', 'instruction']])
      );
    });

    it('should use default limit of 5', async () => {
      vi.spyOn(service as any, 'generateEmbedding').mockResolvedValueOnce([]);
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await service.getRelevantMemories({
        project_id: 'proj-123',
        context: 'test',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5'),
        expect.any(Array)
      );
    });
  });

  describe('getStats', () => {
    it('should return memory statistics', async () => {
      mockPool.query.mockResolvedValueOnce(
        createMockQueryResult([
          {
            total: '10',
            enabled: '8',
            disabled: '2',
            by_category: {
              preference: 3,
              fact: 5,
              instruction: 2,
            },
          },
        ])
      );

      const result = await service.getStats({
        project_id: 'proj-123',
      });

      expect(result).toEqual({
        total: 10,
        enabled: 8,
        disabled: 2,
        by_category: {
          preference: 3,
          fact: 5,
          instruction: 2,
        },
      });
    });

    it('should handle empty database', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getStats();

      expect(result.total).toBe(0);
      expect(result.enabled).toBe(0);
      expect(result.disabled).toBe(0);
    });

    it('should filter by user_id when specified', async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([]));

      await service.getStats({ user_id: 'user-123' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND user_id = $'),
        expect.arrayContaining(['user-123'])
      );
    });
  });
});
