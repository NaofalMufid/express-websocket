const dynamoDBClient = require('../utils/dynamodb');
const Client = require('./client');

class Topic {
  topic;
  constructor(topic) {
    this.topic = topic;
  }

  async getSubscribers() {
    const { Items: clients } = await dynamoDBClient
      .query({
        ExpressionAttributeValues: {
          ':topic': this.topic,
        },
        KeyConditionExpression: 'topic = :topic',
        ProjectionExpression: 'connectionId, subscriptionId',
        TableName: process.env.TOPICS_TABLE,
      })
      .promise();
    return clients;
  }

  async publishMessage(data) {
    const subscribers = await this.getSubscribers();
    console.debug(`Publishing ${JSON.stringify(data)} to subscribers ${JSON.stringify(subscribers)}`);
    if (!subscribers) {
      console.error(`No subscribers to publish data`);
      throw Error(`no subscribers to publish ${console.log(data)}`);
    }
    const promises = subscribers.map(async ({ connectionId, subscriptionId }) => {
      const TopicSubscriber = new Client(connectionId);
      try {
        const res = await TopicSubscriber.sendMessage({
          id: subscriptionId,
          payload: { data },
          type: 'data',
        });
        return res;
      } catch (err) {
        console.error(`Error${connectionId} ${console.log(err)}`);
        if (err.statusCode === 410) {
          return TopicSubscriber.unsubscribe();
        }
      }
    });
    return Promise.all(promises);
  }

  async getReceiver(connectionId) {
    const { Items: clients } = await dynamoDBClient
      .query({
        ExpressionAttributeValues: {
          ':topic': this.topic,
          ':connectionId': connectionId,
        },
        KeyConditionExpression: 'topic = :topic and connectionId = :connectionId',
        ProjectionExpression: 'connectionId, subscriptionId',
        TableName: process.env.TOPICS_TABLE,
      })
      .promise();
    return clients;
  }

  async privateMessage(data) {
    const subscribers = await this.getReceiver(data.receiver);
    if (!subscribers) {
      console.error(`No subscribers to publish data`);
      throw Error(`no subscribers to publish ${console.log(data)}`);
    }
    const promises = subscribers.map(async ({ connectionId, subscriptionId }) => {
      const TopicSubscriber = new Client(connectionId);
      try {
        const res = await TopicSubscriber.sendMessage({
          id: subscriptionId,
          topic: data.topic,
          total: data.total,
          status: data.status,
          progress: data.progress,
          type: 'data',
        });
        return res;
      } catch (err) {
        console.error(`Error${connectionId} ${console.log(err)}`);
        if (err.statusCode === 410) {
          return TopicSubscriber.unsubscribe();
        }
      }
    });
    return Promise.all(promises);
  }
}

module.exports = Topic;
