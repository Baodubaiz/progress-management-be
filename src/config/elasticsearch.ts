import { Client } from '@elastic/elasticsearch';

const nodeUrl = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

export const esClient = new Client({
  node: nodeUrl,
});

export async function checkElasticsearchConnection(): Promise<boolean> {
  try {
    const isAlive = await esClient.ping();
    if (isAlive) {
      console.log(`✅ Connected to Elasticsearch successfully at ${nodeUrl}`);
      return true;
    }
    console.warn('⚠️ Elasticsearch ping returned false.');
    return false;
  } catch (error) {
    console.error('❌ Failed to connect to Elasticsearch:', error instanceof Error ? error.message : error);
    return false;
  }
}

export default esClient;
