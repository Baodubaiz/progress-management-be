import esClient from '../../../config/elasticsearch';
import prisma from '../../../config/prisma';

const TASK_INDEX = 'tasks';

export interface SearchTasksParams {
  userId: string;
  q?: string;
  boardId?: string;
  projectId?: string;
  columnId?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export class TaskSearchService {
  /**
   * Khởi tạo index 'tasks' kèm analyzer hỗ trợ tiếng Việt (asciifolding) và fuzzy search
   */
  async initTasksIndex(): Promise<void> {
    try {
      const exists = await esClient.indices.exists({ index: TASK_INDEX });
      if (!exists) {
        await esClient.indices.create({
          index: TASK_INDEX,
          settings: {
            analysis: {
              analyzer: {
                vi_folded_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding'],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'vi_folded_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              description: {
                type: 'text',
                analyzer: 'vi_folded_analyzer',
              },
              priority: { type: 'keyword' },
              columnId: { type: 'keyword' },
              columnName: { type: 'keyword' },
              boardId: { type: 'keyword' },
              boardName: { type: 'keyword' },
              projectId: { type: 'keyword' },
              projectName: { type: 'keyword' },
              dueDate: { type: 'date' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              assignees: {
                type: 'nested',
                properties: {
                  id: { type: 'keyword' },
                  username: { type: 'text', analyzer: 'vi_folded_analyzer' },
                  avatarUrl: { type: 'keyword' },
                },
              },
              labels: {
                type: 'nested',
                properties: {
                  id: { type: 'keyword' },
                  name: { type: 'text', analyzer: 'vi_folded_analyzer' },
                  color: { type: 'keyword' },
                },
              },
            },
          },
        });
        console.log(`📦 Elasticsearch index '${TASK_INDEX}' created successfully.`);
      }

      // Tự động đồng bộ toàn bộ dữ liệu từ DB lên ES nếu index rỗng
      const countRes = await esClient.count({ index: TASK_INDEX }).catch(() => ({ count: 0 }));
      if (countRes.count === 0) {
        console.log(`🔄 Index '${TASK_INDEX}' is empty. Running initial sync from database...`);
        await this.syncAllTasksFromDb();
      }
    } catch (error) {
      console.error('❌ Failed to initialize Elasticsearch task index:', error);
    }
  }

  /**
   * Helper: Chuẩn bị document từ Task trong Prisma để index lên ES
   */
  private formatTaskDocument(task: any) {
    return {
      id: task.id.toString(),
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      columnId: task.column?.id?.toString() || task.columnId?.toString(),
      columnName: task.column?.name || '',
      boardId: task.column?.board?.id?.toString() || '',
      boardName: task.column?.board?.name || '',
      projectId: task.column?.board?.project?.id?.toString() || task.column?.board?.projectId?.toString() || '',
      projectName: task.column?.board?.project?.name || '',
      assignees: (task.assignees || []).map((a: any) => ({
        id: a.user?.id?.toString() || a.userId?.toString(),
        username: a.user?.username || '',
        avatarUrl: a.user?.avatarUrl || null,
      })),
      labels: (task.taskLabels || []).map((tl: any) => ({
        id: tl.label?.id?.toString() || tl.labelId?.toString(),
        name: tl.label?.name || '',
        color: tl.label?.color || '',
      })),
    };
  }

  /**
   * Đồng bộ 1 task lên Elasticsearch
   */
  async indexTask(taskId: bigint | string): Promise<void> {
    try {
      const taskBigInt = BigInt(taskId);
      const task = await prisma.task.findUnique({
        where: { id: taskBigInt },
        include: {
          column: {
            include: {
              board: {
                include: {
                  project: true,
                },
              },
            },
          },
          assignees: {
            include: {
              user: true,
            },
          },
          taskLabels: {
            include: {
              label: true,
            },
          },
        },
      });

      if (!task) return;

      const doc = this.formatTaskDocument(task);
      await esClient.index({
        index: TASK_INDEX,
        id: doc.id,
        document: doc,
      });
    } catch (error) {
      console.error(`⚠️ Failed to index task ${taskId} to Elasticsearch:`, error);
    }
  }

  /**
   * Xóa task khỏi Elasticsearch
   */
  async deleteIndexedTask(taskId: bigint | string): Promise<void> {
    try {
      await esClient.delete({
        index: TASK_INDEX,
        id: taskId.toString(),
      });
    } catch (error: any) {
      // Bỏ qua lỗi nếu document không tồn tại
      if (error?.meta?.statusCode !== 404) {
        console.error(`⚠️ Failed to delete task ${taskId} from Elasticsearch:`, error);
      }
    }
  }

  /**
   * Đồng bộ toàn bộ Task từ PostgreSQL sang Elasticsearch (Initial bulk sync)
   */
  async syncAllTasksFromDb(): Promise<{ synced: number }> {
    try {
      const tasks = await prisma.task.findMany({
        include: {
          column: {
            include: {
              board: {
                include: {
                  project: true,
                },
              },
            },
          },
          assignees: {
            include: {
              user: true,
            },
          },
          taskLabels: {
            include: {
              label: true,
            },
          },
        },
      });

      if (tasks.length === 0) return { synced: 0 };

      const operations = tasks.flatMap((task) => [
        { index: { _index: TASK_INDEX, _id: task.id.toString() } },
        this.formatTaskDocument(task),
      ]);

      const bulkResponse = await esClient.bulk({ refresh: true, operations });
      if (bulkResponse.errors) {
        console.warn('⚠️ Some errors occurred during bulk indexing tasks to Elasticsearch.');
      } else {
        console.log(`✅ Bulk indexed ${tasks.length} tasks to Elasticsearch.`);
      }

      return { synced: tasks.length };
    } catch (error) {
      console.error('❌ Failed to bulk sync tasks to Elasticsearch:', error);
      return { synced: 0 };
    }
  }

  /**
   * Tìm kiếm Task với Fuzzy + Phân quyền Project của User
   */
  async searchTasks(params: SearchTasksParams) {
    const { userId, q, boardId, projectId, columnId, priority, page = 1, limit = 20 } = params;
    const userBigInt = BigInt(userId);
    const skip = (Math.max(1, page) - 1) * limit;

    // 1. Kiểm tra các project user tham gia để đảm bảo phân quyền
    const userMemberships = await prisma.projectMember.findMany({
      where: { userId: userBigInt },
      select: { projectId: true },
    });

    const allowedProjectIds = userMemberships.map((m) => m.projectId.toString());

    if (allowedProjectIds.length === 0) {
      return {
        tasks: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    // 2. Xây dựng Elasticsearch query
    const filterConditions: any[] = [
      { terms: { projectId: allowedProjectIds } },
    ];

    if (projectId) {
      filterConditions.push({ term: { projectId } });
    }

    if (boardId) {
      filterConditions.push({ term: { boardId } });
    }

    if (columnId) {
      filterConditions.push({ term: { columnId } });
    }

    if (priority) {
      filterConditions.push({ term: { priority } });
    }

    let queryCondition: any = { match_all: {} };

    if (q && q.trim().length > 0) {
      const trimmed = q.trim();
      const lower = trimmed.toLowerCase();
      queryCondition = {
        bool: {
          should: [
            // Exact & Fuzzy match trên Title (trọng số cao nhất ^4)
            {
              multi_match: {
                query: trimmed,
                fields: ['title^4', 'description^1.5'],
                fuzziness: 'AUTO',
                prefix_length: 1,
              },
            },
            // Prefix match (khi người dùng gõ từ khóa dở dang)
            {
              multi_match: {
                query: trimmed,
                fields: ['title^4', 'description^1.5'],
                type: 'phrase_prefix',
              },
            },
            // Wildcard match (chứa chuỗi con, e.g. "aaa" khớp "aaaaaaaa")
            {
              wildcard: {
                title: {
                  value: `*${lower}*`,
                  boost: 3,
                },
              },
            },
            {
              wildcard: {
                description: {
                  value: `*${lower}*`,
                  boost: 1,
                },
              },
            },
            // Match trên Labels
            {
              nested: {
                path: 'labels',
                query: {
                  bool: {
                    should: [
                      { match: { 'labels.name': { query: trimmed, fuzziness: 'AUTO' } } },
                      { wildcard: { 'labels.name': `*${lower}*` } },
                    ],
                  },
                },
                score_mode: 'max',
              },
            },
            // Match trên Assignee username
            {
              nested: {
                path: 'assignees',
                query: {
                  bool: {
                    should: [
                      { match: { 'assignees.username': { query: trimmed, fuzziness: 'AUTO' } } },
                      { wildcard: { 'assignees.username': `*${lower}*` } },
                    ],
                  },
                },
                score_mode: 'max',
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
    }

    const searchResponse = await esClient.search({
      index: TASK_INDEX,
      from: skip,
      size: limit,
      query: {
        bool: {
          must: queryCondition,
          filter: filterConditions,
        },
      },
      highlight: {
        fields: {
          title: {},
          description: {},
        },
      },
    });

    const totalHits =
      typeof searchResponse.hits.total === 'number'
        ? searchResponse.hits.total
        : searchResponse.hits.total?.value || 0;

    const tasks = searchResponse.hits.hits.map((hit: any) => ({
      ...hit._source,
      _score: hit._score,
      highlight: hit.highlight,
    }));

    return {
      tasks,
      pagination: {
        total: totalHits,
        page,
        limit,
        totalPages: Math.ceil(totalHits / limit),
      },
    };
  }
}

export const taskSearchService = new TaskSearchService();
export default taskSearchService;
