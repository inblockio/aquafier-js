import Fastify from 'fastify'
import { Client } from '@elastic/elasticsearch'


// Connect to your Elastic instance
export const esClient = new Client({
  node: process.env.ELASTIC_NODE ?? "",//'http://localhost:9200', // or your Elastic Cloud URL
  auth: {
    username: process.env.ELASTIC_NODE_USERNAME ?? "", // 'elastic',
    password: process.env.ELASTIC_NODE_PASSWORD ?? "", //'yourpassword'
  }
})

// Ensure index exists
export async function elasticEnsureIndex() {
  const index = 'custom-events'
  const exists = await esClient.indices.exists({ index })
  if (!exists) {
    await esClient.indices.create({
      index,
      mappings: {
        properties: {
          event_name: { type: 'keyword' },
          timestamp: { type: 'date' },
          metadata: { type: 'object', enabled: true }
        }
      }
    })
  }
}

// Test connection
export async function testElasticConnection() {
  try {
    const health = await esClient.cluster.health()
    console.log('✅ Connected to Elasticsearch')
    console.log('Cluster health:', health.status)
    return true
  } catch (error) {
    console.error('❌ Failed to connect to Elasticsearch:', error)
    return false
  }
}

export async function checkElasticConnection() {
  try {
    const ping = await esClient.ping()
    console.log('✅ Elasticsearch is reachable')
    return true
  } catch (error) {
    console.error('❌ Cannot reach Elasticsearch:', error)
    return false
  }
}


export async function logCustomEvent(event_name: string, metadata = {}) {
  await esClient.index({
    index: 'custom-events',
    body: {
      event_name,
      metadata,
      timestamp: new Date().toISOString()
    }
  })
}


