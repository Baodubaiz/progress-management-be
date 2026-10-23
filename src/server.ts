import app from './app';
import prisma from './config/prisma';
import { checkElasticsearchConnection } from './config/elasticsearch';
import { taskSearchService } from './modules/task/task/task-search.service';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL Database successfully.');

    // Test Elasticsearch connection & initialize index
    const isEsConnected = await checkElasticsearchConnection();
    if (isEsConnected) {
      await taskSearchService.initTasksIndex();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📡 Health check available at: http://localhost:${PORT}/health`);
      console.log(`📡 API v1 available at: http://localhost:${PORT}/api/v1`);
      console.log(`📖 Swagger Docs available at: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Database disconnected on app termination');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('Database disconnected on app termination');
  process.exit(0);
});

startServer();

